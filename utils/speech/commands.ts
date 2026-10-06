import type { CommandAction, CustomCommand } from '../storage';
import { safeRoutes, type SafeRouteId } from '../navigation.ts';

export type VoiceCommand = CommandAction | 'stop' | 'unknown';

export interface CommandDefinition {
  id: Exclude<VoiceCommand, 'unknown'>;
  phrase: string;
  description: string;
  matches: (text: string) => boolean;
}

export const normalizeCommand = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Comandos que trae Navi. "Detener" siempre existe y no se puede reemplazar por un comando personal. */
export const commandCatalog: CommandDefinition[] = [
  { id: 'read-page', phrase: 'Leer página', description: 'Lee el contenido principal, sección por sección.', matches: (text) => /^(leer|escuchar)( la)?( pagina| contenido)?$/.test(text) },
  { id: 'stop', phrase: 'Detener', description: 'Detiene la lectura.', matches: (text) => /^(detener|parar|silencio)$/.test(text) },
  { id: 'read-summary', phrase: 'Resumen de página', description: 'Cuenta lo más importante de la página.', matches: (text) => /(resumen|donde estoy|que hay)/.test(text) },
  { id: 'go-courses', phrase: 'Ir a cursos', description: 'Abre Mis cursos.', matches: (text) => /^(ir a |abrir )?(mis )?(cursos|curso|courses)$/.test(text) },
  { id: 'increase-font', phrase: 'Aumentar letra', description: 'Agranda el texto.', matches: (text) => /(aumentar|agrandar) (la )?(letra|texto)/.test(text) },
  { id: 'toggle-contrast', phrase: 'Alto contraste', description: 'Activa o desactiva el alto contraste.', matches: (text) => /(alto contraste|contraste)/.test(text) },
  { id: 'toggle-simplified', phrase: 'Modo simple', description: 'Muestra solo lo esencial.', matches: (text) => /(modo simple|modo simplificado)/.test(text) },
  { id: 'guided-reading', phrase: 'Lectura guiada', description: 'Lee una sección y espera a que pidas la siguiente.', matches: (text) => /(lectura guiada|guiar lectura)/.test(text) },
];

export const voiceCommandGuide = commandCatalog;

export function resolveVoiceCommand(transcript: string, personalCommands: CustomCommand[] = []): { command: VoiceCommand; custom?: CustomCommand } {
  const text = normalizeCommand(transcript);
  const custom = personalCommands.find((item) => item.enabled && normalizeCommand(item.phrase) === text);
  if (custom) return { command: custom.action, custom };
  return { command: commandCatalog.find((item) => item.matches(text))?.id ?? 'unknown' };
}

export const describeCommand = (command: VoiceCommand): string => commandCatalog.find((item) => item.id === command)?.description ?? 'No reconocí ese comando.';

const pendingRoutePatterns: [SafeRouteId, RegExp][] = [
  ['tasks', /(ir a|abrir|ver) (mis )?(tareas|tarea|actividades)/],
  ['grades', /(ir a|abrir|ver) (mis )?(notas|calificaciones)/],
  ['announcements', /(ir a|abrir|ver) (los |mis )?(anuncios|avisos)/],
];

/** Detecta pedidos como "ir a tareas": se reconocen para poder explicar que aún no están disponibles. */
export function detectPendingRoute(transcript: string): SafeRouteId | null {
  const text = normalizeCommand(transcript);
  return pendingRoutePatterns.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

export const pendingRouteMessage = (id: SafeRouteId): string => `${safeRoutes[id].label} todavía no está disponible: falta validar esa ruta con UTP Class.`;

// ---- Comandos personales (Centro Navi → Mis comandos) ----

/** Acciones permitidas. Un comando personal nunca puede abrir URLs libres, ejecutar código ni usar selectores. */
export const customActionOptions: { id: CommandAction; label: string; defaultResponse: string }[] = [
  { id: 'read-page', label: 'Leer página', defaultResponse: 'Leyendo la página.' },
  { id: 'read-summary', label: 'Leer resumen', defaultResponse: 'Este es el resumen de la página.' },
  { id: 'go-courses', label: 'Ir a cursos', defaultResponse: 'Abriendo tus cursos.' },
  { id: 'toggle-contrast', label: 'Activar o quitar el alto contraste', defaultResponse: 'Contraste actualizado.' },
  { id: 'toggle-simplified', label: 'Activar o quitar el modo simplificado', defaultResponse: 'Modo simplificado actualizado.' },
  { id: 'increase-font', label: 'Ampliar texto', defaultResponse: 'Tamaño de letra actualizado.' },
  { id: 'guided-reading', label: 'Activar lectura guiada', defaultResponse: 'Iniciando lectura guiada.' },
];

/** Acciones que se habilitarán cuando su ruta esté verificada (ver utils/navigation.ts). */
export const pendingCustomActions: { id: SafeRouteId; label: string }[] = [
  { id: 'tasks', label: 'Ir a tareas' },
  { id: 'grades', label: 'Ir a notas' },
];

export const defaultResponseFor = (action: CommandAction): string => customActionOptions.find((item) => item.id === action)?.defaultResponse ?? '';

export const MAX_CUSTOM_COMMANDS = 20;
export const MAX_RESPONSE_LENGTH = 120;

export function validateCustomCommand(
  input: { phrase: string; action: CommandAction; response?: string },
  existing: CustomCommand[],
  editingId?: string,
): string | null {
  const normalized = normalizeCommand(input.phrase);
  if (normalized.length < 3) return 'Escribe una frase de al menos 3 letras.';
  if (normalized.length > 50 || normalized.split(' ').length > 8) return 'Usa una frase corta: máximo 8 palabras.';
  if (!customActionOptions.some((option) => option.id === input.action)) return 'Elige una acción de la lista.';
  const reserved = commandCatalog.find((item) => item.matches(normalized));
  if (reserved) return `Esa frase ya la usa Navi (“${reserved.phrase}”). Prueba con otra.`;
  if (existing.some((item) => item.id !== editingId && normalizeCommand(item.phrase) === normalized)) return 'Ya tienes un comando con esa frase.';
  if (!editingId && existing.length >= MAX_CUSTOM_COMMANDS) return `Puedes guardar hasta ${MAX_CUSTOM_COMMANDS} comandos.`;
  if ((input.response ?? '').length > MAX_RESPONSE_LENGTH) return `La respuesta puede tener hasta ${MAX_RESPONSE_LENGTH} letras.`;
  return null;
}

/** Descarta cualquier dato guardado que no cumpla el formato esperado (por ejemplo, si se editó a mano). */
export function sanitizeStoredCommands(value: unknown): CustomCommand[] {
  if (!Array.isArray(value)) return [];
  const actions = new Set(customActionOptions.map((option) => option.id));
  return value
    .filter((item): item is CustomCommand => Boolean(item) && typeof item.id === 'string' && typeof item.phrase === 'string' && actions.has(item.action) && typeof item.enabled === 'boolean')
    .map((item) => ({ id: item.id, phrase: item.phrase.slice(0, 60), action: item.action, enabled: item.enabled, response: typeof item.response === 'string' ? item.response.slice(0, MAX_RESPONSE_LENGTH) : undefined }))
    .slice(0, MAX_CUSTOM_COMMANDS);
}
