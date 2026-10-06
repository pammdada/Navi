import { useCallback, useEffect, useRef, useState } from 'react';
import { ALargeSmall, BookOpen, Captions, ClipboardCheck, Contrast, FileText, ListOrdered, Mic, Palette, Settings, Sparkles, Volume2, ZoomIn } from 'lucide-react';
import { NaviLogo } from '@/components/NaviLogo';
import { runCommand, type CommandContext } from '@/utils/command-runner';
import { isRouteEnabled } from '@/utils/navigation';
import { bridgeErrorMessage, openSafeRoute, sendToPage } from '@/utils/page-bridge';
import { colorModeLabel, colorModes, nextColorMode, nextFontSize } from '@/utils/preferences';
import { fontSizeLabels } from '@/utils/profiles';
import { createLocalSummary, summaryToSpeech, type LocalPageSummary, type ReadingPlan } from '@/utils/reading-plan';
import { pendingRouteMessage, resolveVoiceCommand } from '@/utils/speech/commands';
import { isSpeechRecognitionSupported, startSpeechRecognition } from '@/utils/speech/recognition';
import { speakWithPreferences, stopSpeaking } from '@/utils/speech/synthesis';
import { PanelButton, ReaderBar, Section, SummaryCard } from './components';
import { useAiEndpoint, useCustomCommands, useGuidedReading, usePreferences, useProfileName } from './hooks';

const micErrors: Record<string, string> = {
  'not-allowed': 'Falta el permiso del micrófono. Se abrió el Centro Navi: permite el micrófono ahí y vuelve a intentarlo.',
  'no-speech': 'No te escuché. Acércate al micrófono e inténtalo otra vez.',
  'audio-capture': 'No encontré un micrófono. Revisa que esté conectado.',
  network: 'El reconocimiento de voz necesita conexión a internet.',
};

const state = (on: boolean) => (on ? 'Activo' : 'Desactivado');

export default function SidePanel() {
  const { preferences, ref: prefsRef, update } = usePreferences();
  const name = useProfileName();
  const customCommands = useCustomCommands();
  const aiEndpoint = useAiEndpoint();
  const reading = useGuidedReading(prefsRef);
  const voiceSupported = isSpeechRecognitionSupported();

  const [status, setStatus] = useState('Listo para ayudarte en UTP Class.');
  const [listening, setListening] = useState(false);
  const [lens, setLens] = useState(false);
  const [summary, setSummary] = useState<{ plan: ReadingPlan; data: LocalPageSummary } | null>(null);
  const stopListening = useRef<() => void>(() => undefined);

  // Los mensajes de la lectura (por ejemplo "Sección 2 de 5: Actividades") pasan a la línea de estado.
  useEffect(() => {
    if (reading.state.message) setStatus(reading.state.message);
  }, [reading.state.message]);

  // La lupa se puede cerrar desde la propia página (Esc o botón): el panel se entera por mensaje.
  useEffect(() => {
    const onMessage = (message: unknown) => {
      if ((message as { type?: string })?.type === 'NAVI_LENS_CLOSED') {
        setLens(false);
        setStatus('Lupa cerrada.');
      }
    };
    browser.runtime.onMessage.addListener(onMessage);
    return () => browser.runtime.onMessage.removeListener(onMessage);
  }, []);

  const syncLens = useCallback(() => {
    sendToPage<{ lens: boolean }>({ type: 'NAVI_PING' })
      .then((reply) => setLens(Boolean(reply.lens)))
      .catch(() => setLens(false));
  }, []);
  useEffect(() => {
    syncLens();
    browser.tabs.onActivated.addListener(syncLens);
    return () => browser.tabs.onActivated.removeListener(syncLens);
  }, [syncLens]);

  const guard = useCallback(async (action: () => Promise<string | void>) => {
    try {
      const message = await action();
      if (message) setStatus(message);
    } catch (error) {
      setStatus(bridgeErrorMessage(error));
    }
  }, []);

  const speak = (text: string) => speakWithPreferences(text, prefsRef.current);

  const showSummary = useCallback(async (): Promise<string> => {
    reading.stop();
    const plan = await sendToPage<ReadingPlan>({ type: 'NAVI_GET_READING_PLAN' });
    const data = createLocalSummary(plan);
    setSummary({ plan, data });
    speakWithPreferences(summaryToSpeech(data), prefsRef.current);
    return 'Resumen de la página.';
  }, [prefsRef, reading]);

  const toggleLens = () =>
    guard(async () => {
      const reply = await sendToPage<{ enabled: boolean }>({ type: 'NAVI_TOGGLE_LENS' });
      setLens(reply.enabled);
      return reply.enabled ? 'Lupa activada. Pulsa Esc para cerrarla.' : 'Lupa cerrada.';
    });

  const toggleCaptions = () =>
    guard(async () => {
      const enabled = !prefsRef.current.captionsEnabled;
      await update({ captionsEnabled: enabled });
      const result = await sendToPage<{ message: string }>({ type: 'NAVI_APPLY_CAPTIONS', enabled });
      return result.message;
    });

  const commandContext = (): CommandContext => ({
    get preferences() {
      return prefsRef.current;
    },
    updatePreferences: update,
    startReading: reading.start,
    readSummary: showSummary,
    openCourses: () => openSafeRoute('courses'),
    stopReading: reading.stop,
    speak,
  });

  const handleTranscript = async (transcript: string) => {
    setStatus(`Escuché: ${transcript}`);
    const { command, custom } = resolveVoiceCommand(transcript, customCommands);
    setStatus(await runCommand(command, commandContext(), { transcript, custom }));
  };
  // El reconocimiento de voz guarda su callback al empezar; esta referencia le entrega siempre la versión actual.
  const transcriptRef = useRef(handleTranscript);
  transcriptRef.current = handleTranscript;

  const listen = async () => {
    if (listening) {
      stopListening.current();
      return;
    }
    if (!preferences.voiceEnabled) {
      setStatus('Los comandos de voz están desactivados. Actívalos en Configuración.');
      return;
    }
    if (!voiceSupported) {
      setStatus('Este navegador no permite el reconocimiento de voz. Usa Google Chrome o Microsoft Edge.');
      return;
    }
    try {
      (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((track) => track.stop());
    } catch {
      setStatus(micErrors['not-allowed'] ?? '');
      void browser.tabs.create({ url: browser.runtime.getURL('/options.html#/voz') });
      return;
    }
    stopListening.current = startSpeechRecognition(
      (transcript) => void transcriptRef.current(transcript),
      (event, detail) => {
        setListening(event === 'listening');
        if (event === 'error') setStatus(micErrors[detail ?? ''] ?? 'No se pudo reconocer la voz. Inténtalo otra vez.');
      },
    );
  };

  const tasksReady = isRouteEnabled('tasks');
  const voiceOff = !preferences.voiceEnabled || !voiceSupported;

  return (
    <main className="grid gap-4 p-4 pb-8">
      <header className="flex items-center gap-3">
        <span className="logo-frame">
          <NaviLogo size={44} decorative />
        </span>
        <div className="leading-tight">
          <h1 className="text-2xl font-bold">Navi</h1>
          <p className="text-sm text-ink-soft">{name ? `Hola, ${name}` : 'Accesibilidad para UTP Class'}</p>
        </div>
      </header>

      <p role="status" className="rounded-xl border-l-4 border-brand bg-brand-soft p-3 text-sm font-bold">
        {status}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <PanelButton variant="primary" icon={Volume2} label="Leer" hint="La página" onClick={() => void guard(() => reading.start('continuous'))} />
        <PanelButton
          variant="primary"
          icon={Mic}
          label={listening ? 'Escuchando…' : 'Hablar'}
          hint={voiceOff ? (voiceSupported ? 'Desactivado' : 'No disponible') : 'Comandos'}
          pressed={listening}
          unavailable={voiceOff}
          onClick={() => void listen()}
        />
      </div>

      {reading.state.status !== 'idle' && (
        <ReaderBar state={reading.state} onPrevious={reading.previous} onPlayPause={reading.playPause} onNext={reading.next} onStop={reading.stop} />
      )}

      <Section title="Acciones rápidas">
        <PanelButton
          variant="large"
          icon={BookOpen}
          label="Cursos"
          hint="Abrir mis cursos"
          onClick={() => void guard(async () => { await openSafeRoute('courses'); return 'Abriendo tus cursos.'; })}
        />
        <PanelButton
          variant="large"
          icon={ClipboardCheck}
          label="Tareas"
          hint={tasksReady ? 'Ver mis tareas' : 'Próximamente'}
          unavailable={!tasksReady}
          onClick={() => void guard(async () => {
            if (!tasksReady) return pendingRouteMessage('tasks');
            await openSafeRoute('tasks');
            return 'Abriendo tus tareas.';
          })}
        />
        <div className="grid grid-cols-2 gap-2">
          <PanelButton icon={Contrast} label="Contraste" hint={state(preferences.highContrast)} pressed={preferences.highContrast} onClick={() => void update({ highContrast: !prefsRef.current.highContrast })} />
          <PanelButton
            icon={ALargeSmall}
            label="Texto"
            hint={fontSizeLabels[preferences.fontSize]}
            onClick={() => {
              const next = nextFontSize(prefsRef.current.fontSize);
              void update({ fontSize: next });
              setStatus(`Texto: ${fontSizeLabels[next].toLowerCase()}.`);
            }}
          />
          <PanelButton icon={ZoomIn} label="Lupa" hint={state(lens)} pressed={lens} onClick={() => void toggleLens()} />
          <PanelButton icon={ListOrdered} label="Guía" hint="Paso a paso" onClick={() => void guard(() => reading.start('stepped'))} />
          <PanelButton
            icon={Palette}
            label="Colores"
            hint={colorModes.find((mode) => mode.id === preferences.colorVisionMode)?.short}
            pressed={preferences.colorVisionMode !== 'standard'}
            onClick={() => {
              const next = nextColorMode(prefsRef.current.colorVisionMode);
              void update({ colorVisionMode: next });
              setStatus(`Colores: ${colorModeLabel(next)}.`);
            }}
          />
          <PanelButton icon={Captions} label="Video" hint={`CC ${state(preferences.captionsEnabled).toLowerCase()}`} pressed={preferences.captionsEnabled} onClick={() => void toggleCaptions()} />
          <PanelButton icon={Sparkles} label="Simple" hint={state(preferences.simplifiedMode)} pressed={preferences.simplifiedMode} onClick={() => void update({ simplifiedMode: !prefsRef.current.simplifiedMode })} />
          <PanelButton icon={FileText} label="Resumen" hint="De la página" onClick={() => void guard(showSummary)} />
        </div>
      </Section>

      {summary && (
        <SummaryCard
          summary={summary.data}
          plan={summary.plan}
          aiEndpoint={aiEndpoint}
          onListen={(text) => {
            stopSpeaking();
            speak(text);
          }}
          onClose={() => setSummary(null)}
        />
      )}

      <a
        href="/options.html#/configuracion"
        target="_blank"
        rel="noreferrer"
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-line-soft bg-surface font-bold text-brand hover:bg-brand-soft"
      >
        <Settings size={22} aria-hidden="true" />
        Configuración
      </a>
    </main>
  );
}
