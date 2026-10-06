import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { describe, it } from 'node:test';
import { AiSummaryError, buildAiPayload, parseAiResponse, requestAiSummary, validateEndpoint } from '../utils/ai-summary.ts';
import { runCommand, type CommandContext } from '../utils/command-runner.ts';
import { GuidedReader, type ReaderState } from '../utils/guided-reader.ts';
import { isRouteEnabled, resolveSafeUrl } from '../utils/navigation.ts';
import { LEGACY_KEYS, defaultValues, mergePreferences, migrateLegacyPreferences, nextColorMode, normalizePreferences } from '../utils/preferences.ts';
import { classifyText, createLocalSummary, createReadingPlan, summaryToSpeech, type ReadingUnit } from '../utils/reading-plan.ts';
import { detectPendingRoute, resolveVoiceCommand, sanitizeStoredCommands, validateCustomCommand } from '../utils/speech/commands.ts';
import { classifyStatus, needsLabel } from '../utils/status-labels.ts';

const unit = (n: number, type: ReadingUnit['type'], text: string): ReadingUnit => ({ id: `u${n}`, type, text, elementId: `navi-reading-${n}` });
const samplePlan = () =>
  createReadingPlan('Interacción Humano-Computador', true, [
    unit(1, 'heading', 'Introducción'),
    unit(2, 'paragraph', 'Bienvenidos al curso.'),
    unit(3, 'heading', 'Actividades'),
    unit(4, 'task', 'Tarea 2: entregar el prototipo.'),
    unit(5, 'date', 'Vence el 15 de octubre'),
    unit(6, 'heading', 'Evaluación'),
    unit(7, 'link', 'Ver rúbrica'),
  ]);

describe('preferencias', () => {
  it('mantiene alto contraste y paleta coherentes', () => {
    const base = defaultValues;
    assert.equal(mergePreferences(base, { highContrast: true }).colorVisionMode, 'high-contrast');
    const hc = mergePreferences(base, { highContrast: true });
    assert.equal(mergePreferences(hc, { highContrast: false }).colorVisionMode, 'standard');
    const palette = mergePreferences(hc, { colorVisionMode: 'red-green-safe' });
    assert.equal(palette.highContrast, false);
    assert.equal(mergePreferences(palette, { highContrast: false }).colorVisionMode, 'red-green-safe');
    assert.equal(mergePreferences(palette, { colorVisionMode: 'high-contrast' }).highContrast, true);
  });

  it('completa datos de versiones anteriores', () => {
    const old = normalizePreferences({ highContrast: true, fontSize: 'large' } as never);
    assert.equal(old.colorVisionMode, 'high-contrast');
    assert.equal(old.reduceMotion, false);
    assert.equal(normalizePreferences({ colorVisionMode: 'otro' } as never).colorVisionMode, 'standard');
  });

  it('migra las claves antiguas solo si no hay ajustes guardados', () => {
    const legacy = { velocidadLectura: 0.8, volumen: 0.5, idioma: 'es', mostrarAyuda: true };
    assert.equal(migrateLegacyPreferences(null, legacy).speechRate, 0.8);
    assert.equal(migrateLegacyPreferences(null, { velocidadLectura: 9 }).speechRate, 1.4);
    assert.equal(migrateLegacyPreferences({ speechRate: 1.2 }, legacy).speechRate, 1.2);
    assert.deepEqual([...LEGACY_KEYS].sort(), ['idioma', 'mostrarAyuda', 'velocidadLectura', 'volumen']);
  });

  it('recorre todas las paletas', () => {
    let mode = nextColorMode('standard');
    const seen = [mode];
    while (mode !== 'standard') {
      mode = nextColorMode(mode);
      seen.push(mode);
    }
    assert.deepEqual(seen, ['high-contrast', 'red-green-safe', 'blue-yellow-safe', 'standard']);
  });
});

describe('navegación segura', () => {
  it('solo cursos está verificado', () => {
    assert.equal(isRouteEnabled('courses'), true);
    assert.equal(resolveSafeUrl('courses'), 'https://class.utp.edu.pe/student/courses');
    for (const id of ['tasks', 'grades', 'announcements'] as const) {
      assert.equal(isRouteEnabled(id), false);
      assert.equal(resolveSafeUrl(id), null);
    }
  });
});

describe('comandos de voz', () => {
  it('reconoce comandos con tildes y mayúsculas', () => {
    assert.equal(resolveVoiceCommand('Leer página').command, 'read-page');
    assert.equal(resolveVoiceCommand('IR A CURSOS').command, 'go-courses');
    assert.equal(resolveVoiceCommand('lectura guiada').command, 'guided-reading');
    assert.equal(resolveVoiceCommand('detener').command, 'stop');
    assert.equal(resolveVoiceCommand('qué hay en esta página').command, 'read-summary');
    assert.equal(resolveVoiceCommand('borrar todo').command, 'unknown');
  });

  it('"ir a tareas" se reconoce pero no navega', () => {
    assert.equal(resolveVoiceCommand('ir a tareas').command, 'unknown');
    assert.equal(detectPendingRoute('ir a tareas'), 'tasks');
    assert.equal(detectPendingRoute('abrir notas'), 'grades');
    assert.equal(detectPendingRoute('ir a anuncios'), 'announcements');
    assert.equal(detectPendingRoute('leer página'), null);
  });

  it('valida los comandos personales', () => {
    const existing = [{ id: 'a', phrase: 'ver pendientes', action: 'read-summary' as const, enabled: true }];
    assert.equal(validateCustomCommand({ phrase: 'mis cursos de hoy', action: 'go-courses' }, existing), null);
    assert.match(validateCustomCommand({ phrase: 'ab', action: 'go-courses' }, existing)!, /3 letras/);
    assert.match(validateCustomCommand({ phrase: 'Ver  Pendientes!', action: 'go-courses' }, existing)!, /Ya tienes/);
    assert.match(validateCustomCommand({ phrase: 'detener', action: 'go-courses' }, existing)!, /ya la usa Navi/);
    assert.match(validateCustomCommand({ phrase: 'alto contraste', action: 'go-courses' }, existing)!, /ya la usa Navi/);
    assert.match(validateCustomCommand({ phrase: 'abrir https://malo.com', action: 'delete-all' as never }, existing)!, /acción/);
    assert.match(validateCustomCommand({ phrase: 'una dos tres cuatro cinco seis siete ocho nueve', action: 'go-courses' }, existing)!, /8 palabras/);
    const many = Array.from({ length: 20 }, (_, i) => ({ id: String(i), phrase: `frase ${i}x`, action: 'read-page' as const, enabled: true }));
    assert.match(validateCustomCommand({ phrase: 'otra frase', action: 'read-page' }, many)!, /hasta 20/);
  });

  it('un comando personal usa su acción y respeta si está desactivado', () => {
    const custom = [{ id: 'a', phrase: 'ver pendientes', action: 'read-summary' as const, enabled: true, response: 'Mira esto' }];
    assert.equal(resolveVoiceCommand('Ver pendientes', custom).command, 'read-summary');
    assert.equal(resolveVoiceCommand('ver pendientes', [{ ...custom[0]!, enabled: false }]).command, 'unknown');
  });

  it('descarta comandos guardados con formato inválido', () => {
    const clean = sanitizeStoredCommands([
      { id: '1', phrase: 'ok', action: 'read-page', enabled: true },
      { id: '2', phrase: 'malo', action: 'run-js', enabled: true },
      { id: 3, phrase: 'malo', action: 'read-page', enabled: true },
      null,
    ]);
    assert.equal(clean.length, 1);
    assert.deepEqual(sanitizeStoredCommands('x'), []);
  });
});

describe('ejecutor de comandos', () => {
  const makeContext = (overrides: Partial<CommandContext> = {}) => {
    const log: string[] = [];
    let preferences = { ...defaultValues };
    const ctx: CommandContext = {
      get preferences() {
        return preferences;
      },
      updatePreferences: async (updates) => {
        preferences = mergePreferences(preferences, updates);
      },
      startReading: async (mode) => `lectura ${mode}`,
      readSummary: async () => 'resumen',
      openCourses: async () => {
        log.push('cursos');
      },
      stopReading: () => log.push('stop'),
      speak: (text) => log.push(`voz:${text}`),
      ...overrides,
    };
    return { ctx, log, prefs: () => preferences };
  };

  it('alterna el contraste manteniendo la paleta coherente', async () => {
    const { ctx, prefs } = makeContext();
    assert.equal(await runCommand('toggle-contrast', ctx), 'Alto contraste activado.');
    assert.equal(prefs().colorVisionMode, 'high-contrast');
    assert.equal(await runCommand('toggle-contrast', ctx), 'Alto contraste desactivado.');
    assert.equal(prefs().colorVisionMode, 'standard');
  });

  it('abre cursos y avisa; "ir a tareas" explica que no está disponible', async () => {
    const { ctx, log } = makeContext();
    assert.equal(await runCommand('go-courses', ctx), 'Abriendo tus cursos.');
    assert.ok(log.includes('cursos'));
    const message = await runCommand('unknown', ctx, { transcript: 'ir a tareas' });
    assert.match(message, /Tareas todavía no está disponible/);
  });

  it('un comando personal responde con su frase y solo hace su acción', async () => {
    const { ctx, log } = makeContext();
    const custom = { id: 'a', phrase: 'mis cursos', action: 'go-courses' as const, enabled: true, response: 'Abriendo tus tareas del día' };
    const message = await runCommand('go-courses', ctx, { custom });
    assert.equal(message, 'Abriendo tus tareas del día');
    assert.deepEqual(log, ['cursos', 'voz:Abriendo tus tareas del día']);
  });

  it('muestra el error en vez de fallar en silencio', async () => {
    const { ctx } = makeContext({
      openCourses: async () => {
        throw new Error('Abre UTP Class (class.utp.edu.pe) para usar esta función.');
      },
    });
    assert.match(await runCommand('go-courses', ctx), /Abre UTP Class/);
  });

  it('pide lectura continua o guiada', async () => {
    const { ctx } = makeContext();
    assert.equal(await runCommand('read-page', ctx), 'lectura continuous');
    assert.equal(await runCommand('guided-reading', ctx), 'lectura stepped');
  });
});

describe('plan de lectura', () => {
  it('clasifica el texto', () => {
    assert.equal(classifyText('Tarea 2: entregar el prototipo', 'block'), 'task');
    assert.equal(classifyText('Vence el viernes 15/10', 'block'), 'date');
    assert.equal(classifyText('El docente publicará las notas el 20 de octubre', 'block'), 'date');
    assert.equal(classifyText('Foro de la semana 5', 'block'), 'task');
    assert.equal(classifyText('La fecha de entrega vence el 15 de octubre', 'block'), 'date');
    assert.equal(classifyText('La evaluación continua 2 se publicará el lunes', 'block'), 'date');
    assert.equal(classifyText('Bienvenidos al curso', 'block'), 'paragraph');
    assert.equal(classifyText('Ver rúbrica', 'link'), 'link');
    assert.equal(classifyText('Actividades', 'heading'), 'heading');
  });

  it('agrupa por secciones', () => {
    const plan = samplePlan();
    assert.deepEqual(plan.sections.map((s) => s.title), ['Introducción', 'Actividades', 'Evaluación']);
    assert.deepEqual(plan.sections[1]!.unitIds, ['u3', 'u4', 'u5']);
    const noHeading = createReadingPlan('Mis cursos', false, [unit(1, 'paragraph', 'Texto suelto en la página.')]);
    assert.equal(noHeading.sections[0]!.title, 'Mis cursos');
  });

  it('crea el resumen local', () => {
    const summary = createLocalSummary(samplePlan());
    assert.deepEqual({ ...summary, highlights: undefined }, { kind: 'Curso', title: 'Interacción Humano-Computador', sections: 3, tasks: 1, dates: 1, links: 1, highlights: undefined });
    const speech = summaryToSpeech(summary);
    assert.match(speech, /Curso: Interacción Humano-Computador/);
    assert.match(speech, /3 secciones/);
    assert.match(speech, /1 actividad detectada/);
    assert.match(speech, /1 fecha encontrada/);
    assert.match(summaryToSpeech(createLocalSummary(createReadingPlan('X', false, []))), /No detecté actividades/);
  });
});

describe('lectura guiada', () => {
  const setup = (mode: 'continuous' | 'stepped') => {
    const spoken: string[] = [];
    const highlights: (string | null)[] = [];
    const states: ReaderState[] = [];
    let finishCurrent: (() => void) | null = null;
    const reader = new GuidedReader(samplePlan(), {
      speak: (text, onEnd) => {
        spoken.push(text);
        finishCurrent = onEnd;
      },
      stopSpeaking: () => {
        finishCurrent = null;
      },
      highlight: (id) => highlights.push(id),
      onChange: (state) => states.push(state),
    });
    const endSpeech = () => {
      const done = finishCurrent;
      finishCurrent = null;
      done?.();
    };
    return { reader, spoken, highlights, states, endSpeech, last: () => states[states.length - 1]! };
  };

  it('lee de corrido anunciando cada sección y resaltando', () => {
    const { reader, spoken, highlights, endSpeech, last } = setup('continuous');
    assert.equal(reader.start('continuous'), true);
    assert.equal(spoken[0], 'Sección 1 de 3: Introducción.');
    assert.equal(highlights[0], 'navi-reading-1');
    endSpeech();
    assert.equal(spoken[1], 'Bienvenidos al curso.');
    assert.equal(highlights[1], 'navi-reading-2');
    endSpeech();
    assert.equal(spoken[2], 'Sección 2 de 3: Actividades.');
    assert.equal(last().message, 'Sección 2 de 3: Actividades');
    endSpeech(); endSpeech(); endSpeech(); // tarea, fecha, anuncio de la sección 3
    assert.equal(spoken[spoken.length - 1], 'Sección 3 de 3: Evaluación.');
    endSpeech(); // link
    assert.equal(spoken[spoken.length - 1], 'Ver rúbrica');
    endSpeech();
    assert.equal(last().status, 'idle');
    assert.equal(last().message, 'Terminé de leer la página.');
    assert.equal(highlights[highlights.length - 1], null);
  });

  it('en modo guía se detiene al final de cada sección', () => {
    const { reader, spoken, endSpeech, last } = setup('stepped');
    reader.start('stepped');
    endSpeech(); // anuncio -> párrafo
    endSpeech(); // fin sección 1
    assert.equal(last().status, 'paused');
    assert.match(last().message, /Pulsa Siguiente/);
    assert.equal(spoken.length, 2);
    reader.playPause(); // reanudar = ir a la siguiente sección
    assert.equal(spoken[2], 'Sección 2 de 3: Actividades.');
    assert.equal(last().status, 'playing');
  });

  it('pausa, reanuda la misma frase y no avanza con una frase vieja', () => {
    const { reader, spoken, endSpeech, last } = setup('continuous');
    reader.start('continuous');
    endSpeech();
    assert.equal(spoken[1], 'Bienvenidos al curso.');
    reader.pause();
    assert.equal(last().status, 'paused');
    endSpeech(); // un fin de voz tardío no debe avanzar
    assert.equal(spoken.length, 2);
    reader.playPause();
    assert.equal(spoken[2], 'Bienvenidos al curso.');
    assert.equal(last().status, 'playing');
  });

  it('siguiente y anterior cambian de sección', () => {
    const { reader, spoken, last } = setup('continuous');
    reader.start('continuous');
    reader.next();
    assert.equal(spoken[spoken.length - 1], 'Sección 2 de 3: Actividades.');
    reader.next();
    reader.next();
    assert.equal(last().message, 'Esta es la última sección.');
    reader.previous();
    assert.equal(spoken[spoken.length - 1], 'Sección 2 de 3: Actividades.');
  });

  it('detener limpia el resaltado y queda en reposo', () => {
    const { reader, highlights, last } = setup('continuous');
    reader.start('continuous');
    reader.stop();
    assert.equal(last().status, 'idle');
    assert.equal(last().message, 'Lectura detenida.');
    assert.equal(highlights[highlights.length - 1], null);
  });

  it('no inicia con una página sin contenido', () => {
    const reader = new GuidedReader(createReadingPlan('Vacía', false, []), { speak() {}, stopSpeaking() {}, highlight() {}, onChange() {} });
    assert.equal(reader.start('continuous'), false);
  });
});

describe('estados para daltonismo', () => {
  it('clasifica estados y decide si hace falta etiqueta', () => {
    assert.equal(classifyStatus('Completada', 'badge'), 'done');
    assert.equal(classifyStatus('', 'badge badge-success'), 'done');
    assert.equal(classifyStatus('Pendiente', ''), 'pending');
    assert.equal(classifyStatus('3 días', 'chip warning'), 'pending');
    assert.equal(classifyStatus('Vencida', ''), 'late');
    assert.equal(classifyStatus('', 'tag overdue'), 'late');
    assert.equal(classifyStatus('Matemática', 'badge'), null);
    assert.equal(needsLabel('done', 'Completada'), false);
    assert.equal(needsLabel('done', ''), true);
  });
});

describe('resumen con IA', () => {
  it('valida la dirección del servidor', () => {
    assert.equal(validateEndpoint('https://resumen.example.com/api'), null);
    assert.equal(validateEndpoint('http://localhost:8787/resumen'), null);
    assert.match(validateEndpoint('http://resumen.example.com/api')!, /https/);
    assert.match(validateEndpoint('https://usuario:clave@x.com/api')!, /usuario/);
    assert.match(validateEndpoint('https://x.com/api?key=abc')!, /parámetros/);
    assert.match(validateEndpoint('no es una url')!, /dirección completa/);
  });

  it('arma una carga limitada y sin los títulos duplicados', () => {
    const payload = buildAiPayload(samplePlan());
    assert.equal(payload.title, 'Interacción Humano-Computador');
    assert.deepEqual(payload.sections.map((s) => s.title), ['Introducción', 'Actividades', 'Evaluación']);
    assert.ok(!payload.sections[1]!.text.includes('Actividades'));
    const big = createReadingPlan('Grande', false, [unit(1, 'paragraph', 'a'.repeat(20000))]);
    assert.ok(JSON.stringify(buildAiPayload(big)).length < 7000);
  });

  it('solo acepta el formato esperado', () => {
    const ok = parseAiResponse({ summary: 'Resumen', keyPoints: ['a', 'b'], dates: ['15 de octubre'], suggestedActions: ['Revisar la tarea'], extra: 'ignorado' });
    assert.deepEqual(ok, { summary: 'Resumen', keyPoints: ['a', 'b'], dates: ['15 de octubre'], suggestedActions: ['Revisar la tarea'] });
    assert.equal(parseAiResponse({ summary: 'x', keyPoints: 'no es lista' }), null);
    assert.equal(parseAiResponse({ keyPoints: [] }), null);
    assert.equal(parseAiResponse({ summary: 'x', keyPoints: [1, 2] }), null);
    assert.equal(parseAiResponse('texto'), null);
    assert.deepEqual(parseAiResponse({ summary: 'x', keyPoints: [] }), { summary: 'x', keyPoints: [], dates: [], suggestedActions: [] });
  });

  it('habla con un servidor y envía solo la carga aceptada', async () => {
    let received = '';
    let headers: Record<string, string | string[] | undefined> = {};
    const server = createServer((request, response) => {
      headers = request.headers;
      request.on('data', (chunk) => (received += chunk));
      request.on('end', () => {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ summary: 'Resumen de prueba', keyPoints: ['Punto'], dates: [], suggestedActions: [] }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as { port: number };
    try {
      const payload = buildAiPayload(samplePlan());
      const result = await requestAiSummary(`http://127.0.0.1:${port}/resumen`, payload);
      assert.equal(result.summary, 'Resumen de prueba');
      assert.deepEqual(JSON.parse(received), payload);
      assert.equal(headers.cookie, undefined);
      assert.equal(headers.authorization, undefined);
    } finally {
      server.close();
    }
  });

  it('informa los errores del servidor sin exponer detalles', async () => {
    const fake = (body: string, status = 200) => (async () => new Response(body, { status })) as unknown as typeof fetch;
    const payload = buildAiPayload(samplePlan());
    await assert.rejects(requestAiSummary('https://x.example/api', payload, fake('{}', 500)), /error \(500\)/);
    await assert.rejects(requestAiSummary('https://x.example/api', payload, fake('no json')), /JSON válido/);
    await assert.rejects(requestAiSummary('https://x.example/api', payload, fake('{"summary":1}')), /formato esperado/);
    await assert.rejects(requestAiSummary('https://x.example/api', payload, (async () => { throw new TypeError('x'); }) as unknown as typeof fetch), /No pude conectarme/);
    await assert.rejects(requestAiSummary('http://inseguro.example/api', payload), AiSummaryError);
  });
});
