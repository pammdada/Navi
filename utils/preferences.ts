import type { AccessibilityPreferences, ColorVisionMode } from './storage';

export const defaultValues: AccessibilityPreferences = {
  fontSize: 'normal',
  highContrast: false,
  colorVisionMode: 'standard',
  simplifiedMode: false,
  captionsEnabled: false,
  speechRate: 1,
  volume: 1,
  voiceEnabled: true,
  reduceMotion: false,
  language: 'es-PE',
};

/**
 * Une un valor guardado (que puede venir de una versión anterior) con los valores por defecto y
 * garantiza que highContrast y colorVisionMode no se contradigan.
 */
export function normalizePreferences(value: Partial<AccessibilityPreferences> | null | undefined): AccessibilityPreferences {
  const merged = { ...defaultValues, ...value };
  const modes: ColorVisionMode[] = ['standard', 'high-contrast', 'red-green-safe', 'blue-yellow-safe'];
  if (!modes.includes(merged.colorVisionMode)) merged.colorVisionMode = 'standard';
  // Datos antiguos: solo existía highContrast.
  if (merged.highContrast && merged.colorVisionMode === 'standard') merged.colorVisionMode = 'high-contrast';
  merged.highContrast = merged.colorVisionMode === 'high-contrast';
  return merged;
}

/**
 * Aplica un cambio parcial manteniendo la coherencia: cambiar el contraste mueve la paleta y viceversa.
 * Todos los lugares que guardan ajustes (panel, Centro Navi, comandos) deben pasar por aquí.
 */
export function mergePreferences(current: AccessibilityPreferences, updates: Partial<AccessibilityPreferences>): AccessibilityPreferences {
  const next = { ...current, ...updates };
  if ('colorVisionMode' in updates) {
    next.highContrast = next.colorVisionMode === 'high-contrast';
  } else if ('highContrast' in updates) {
    if (updates.highContrast) next.colorVisionMode = 'high-contrast';
    else if (current.colorVisionMode === 'high-contrast') next.colorVisionMode = 'standard';
  }
  return normalizePreferences(next);
}

export const colorModes: { id: ColorVisionMode; label: string; short: string; description: string }[] = [
  { id: 'standard', label: 'Estándar', short: 'Estándar', description: 'Los colores originales de UTP Class.' },
  { id: 'high-contrast', label: 'Alto contraste', short: 'Contraste', description: 'Texto blanco y amarillo sobre fondo negro.' },
  { id: 'red-green-safe', label: 'Rojo y verde (protanopía y deuteranopía)', short: 'Rojo/verde', description: 'Los verdes de la página pasan a azul verdoso, así el verde ya no se confunde con el rojo ni con el naranja. Rojo, naranja, amarillo y azul no cambian.' },
  { id: 'blue-yellow-safe', label: 'Azul y amarillo (tritanopía)', short: 'Azul/amarillo', description: 'Los azules y cianes de la página pasan a magenta, así el azul ya no se confunde con el verde. Verde, rojo y amarillo no cambian.' },
];

export const colorModeLabel = (mode: ColorVisionMode): string => colorModes.find((item) => item.id === mode)?.label ?? 'Estándar';

export function nextColorMode(mode: ColorVisionMode): ColorVisionMode {
  const index = colorModes.findIndex((item) => item.id === mode);
  return colorModes[(index + 1) % colorModes.length]!.id;
}

export function nextFontSize(size: AccessibilityPreferences['fontSize']): AccessibilityPreferences['fontSize'] {
  return size === 'normal' ? 'large' : size === 'large' ? 'x-large' : 'normal';
}

export const LEGACY_KEYS = ['idioma', 'velocidadLectura', 'volumen', 'mostrarAyuda'] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Versiones anteriores guardaban velocidad, volumen e idioma como claves sueltas. Si el usuario todavía
 * no tiene ajustes guardados, esos valores pasan a ser sus ajustes; si ya los tiene, gana lo guardado.
 */
export function migrateLegacyPreferences(
  stored: Partial<AccessibilityPreferences> | null | undefined,
  legacy: Partial<Record<(typeof LEGACY_KEYS)[number], unknown>>,
): AccessibilityPreferences {
  const result = normalizePreferences(stored);
  if (stored) return result;
  if (typeof legacy.velocidadLectura === 'number') result.speechRate = clamp(legacy.velocidadLectura, 0.6, 1.4);
  if (typeof legacy.volumen === 'number') result.volume = clamp(legacy.volumen, 0.2, 1);
  return result;
}
