import type { AccessibilityPreferences, FontSize, NeedProfile } from './storage';

export interface NeedProfileInfo {
  id: NeedProfile;
  shortLabel: string;
  label: string;
  description: string;
  settings: Partial<AccessibilityPreferences>;
}

export const needProfiles: NeedProfileInfo[] = [
  {
    id: 'visual',
    shortLabel: 'Visual',
    label: 'Veo con dificultad',
    description: 'Letra muy grande, alto contraste y lectura en voz alta.',
    settings: { highContrast: true, fontSize: 'x-large', voiceEnabled: true },
  },
  {
    id: 'auditiva',
    shortLabel: 'Auditiva',
    label: 'Escucho con dificultad',
    description: 'Subtítulos automáticos y todos los avisos en texto.',
    settings: { captionsEnabled: true },
  },
  {
    id: 'motora',
    shortLabel: 'Motora',
    label: 'Me cuesta usar el mouse o el teclado',
    description: 'Comandos de voz, botones grandes y atajos de teclado.',
    settings: { voiceEnabled: true },
  },
  {
    id: 'cognitiva',
    shortLabel: 'Cognitiva',
    label: 'Prefiero pantallas sencillas',
    description: 'Modo simplificado, menos movimiento y letra grande.',
    settings: { simplifiedMode: true, fontSize: 'large', reduceMotion: true },
  },
  {
    id: 'mayor',
    shortLabel: 'Adulto mayor',
    label: 'Uso poco la tecnología',
    description: 'Letra grande, pantallas sencillas y una voz más pausada.',
    settings: { fontSize: 'large', simplifiedMode: true, speechRate: 0.9 },
  },
];

export const fontSizeOrder: FontSize[] = ['normal', 'large', 'x-large'];

export const fontSizeLabels: Record<FontSize, string> = {
  normal: 'Normal',
  large: 'Grande',
  'x-large': 'Muy grande',
};

/** Combina los ajustes de varios perfiles; ante un conflicto gana la opción más accesible. */
export function settingsForNeeds(needs: NeedProfile[]): Partial<AccessibilityPreferences> {
  return needs.reduce<Partial<AccessibilityPreferences>>((merged, need) => {
    const { settings } = needProfiles.find((profile) => profile.id === need)!;
    const next = { ...merged, ...settings };
    if (merged.fontSize && settings.fontSize) {
      next.fontSize = fontSizeOrder[Math.max(fontSizeOrder.indexOf(merged.fontSize), fontSizeOrder.indexOf(settings.fontSize))];
    }
    if (merged.speechRate && settings.speechRate) next.speechRate = Math.min(merged.speechRate, settings.speechRate);
    return next;
  }, {});
}

/** Etiquetas legibles de los ajustes activos, para mostrarle al usuario qué tiene encendido. */
export function activeSettingLabels(preferences: AccessibilityPreferences): string[] {
  const labels: string[] = [];
  if (preferences.fontSize !== 'normal') labels.push(`Letra ${fontSizeLabels[preferences.fontSize].toLowerCase()}`);
  if (preferences.highContrast) labels.push('Alto contraste');
  if (preferences.simplifiedMode) labels.push('Modo simplificado');
  if (preferences.captionsEnabled) labels.push('Subtítulos');
  if (preferences.voiceEnabled) labels.push('Comandos de voz');
  if (preferences.reduceMotion) labels.push('Menos movimiento');
  return labels;
}
