import { defaultResponseFor, detectPendingRoute, pendingRouteMessage, type VoiceCommand } from './speech/commands.ts';
import { mergePreferences, nextFontSize } from './preferences.ts';
import type { AccessibilityPreferences, CommandAction, CustomCommand } from './storage';

/** Lo que un comando necesita del entorno (panel, pruebas...). Así la lógica no depende de React ni del navegador. */
export interface CommandContext {
  preferences: AccessibilityPreferences;
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => Promise<void>;
  /** Inicia la lectura de la página. Devuelve el mensaje de estado. */
  startReading: (mode: 'continuous' | 'stepped') => Promise<string>;
  readSummary: () => Promise<string>;
  openCourses: () => Promise<void>;
  stopReading: () => void;
  speak: (text: string) => void;
}

const FALLBACK = 'No reconocí el comando. Prueba con “leer página” o “ir a cursos”.';

const onOff = (value: boolean, label: string) => `${label} ${value ? 'activado' : 'desactivado'}.`;

async function runAction(action: CommandAction | 'stop', ctx: CommandContext): Promise<{ message: string; speakIt: boolean }> {
  const { preferences } = ctx;
  switch (action) {
    case 'read-page':
      return { message: await ctx.startReading('continuous'), speakIt: false };
    case 'guided-reading':
      return { message: await ctx.startReading('stepped'), speakIt: false };
    case 'read-summary':
      return { message: await ctx.readSummary(), speakIt: false };
    case 'stop':
      ctx.stopReading();
      return { message: 'Lectura detenida.', speakIt: false };
    case 'go-courses':
      await ctx.openCourses();
      return { message: 'Abriendo tus cursos.', speakIt: true };
    case 'toggle-contrast': {
      const next = mergePreferences(preferences, { highContrast: !preferences.highContrast });
      await ctx.updatePreferences({ highContrast: next.highContrast });
      return { message: onOff(next.highContrast, 'Alto contraste'), speakIt: true };
    }
    case 'toggle-simplified':
      await ctx.updatePreferences({ simplifiedMode: !preferences.simplifiedMode });
      return { message: onOff(!preferences.simplifiedMode, 'Modo simplificado'), speakIt: true };
    case 'increase-font':
      await ctx.updatePreferences({ fontSize: nextFontSize(preferences.fontSize) });
      return { message: 'Tamaño de letra actualizado.', speakIt: true };
  }
}

/**
 * Ejecuta un comando de voz y devuelve el mensaje corto que se muestra en el panel.
 * Los comandos personales solo pueden disparar acciones de esta lista cerrada.
 */
export async function runCommand(command: VoiceCommand, ctx: CommandContext, options: { transcript?: string; custom?: CustomCommand } = {}): Promise<string> {
  try {
    if (command === 'unknown') {
      const pending = options.transcript ? detectPendingRoute(options.transcript) : null;
      const message = pending ? pendingRouteMessage(pending) : FALLBACK;
      ctx.speak(message);
      return message;
    }
    const { message, speakIt } = await runAction(command, ctx);
    const spoken = options.custom ? options.custom.response?.trim() || defaultResponseFor(options.custom.action) : message;
    if (speakIt && spoken) ctx.speak(spoken);
    return options.custom && speakIt && spoken ? spoken : message;
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'No pude completar la acción. Inténtalo otra vez.';
    ctx.speak(message);
    return message;
  }
}
