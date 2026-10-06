// utils/storage.ts
// Cada dato tiene una sola fuente de verdad:
//   accessibilityPreferences → ajustes visuales, de voz y de lectura
//   userProfile              → nombre y respuestas del onboarding
//   customCommands           → frases personales del usuario (Centro Navi → Mis comandos)
//   aiSummarySettings        → configuración (opcional) del resumen con IA
import { storage } from '#imports';
import { defaultValues } from './preferences';

export type FontSize = 'normal' | 'large' | 'x-large';
export type ColorVisionMode = 'standard' | 'high-contrast' | 'red-green-safe' | 'blue-yellow-safe';
export type CommandAction =
  | 'read-page'
  | 'read-summary'
  | 'go-courses'
  | 'toggle-contrast'
  | 'toggle-simplified'
  | 'increase-font'
  | 'guided-reading';

export interface AccessibilityPreferences {
  fontSize: FontSize;
  /** Se mantiene sincronizado con colorVisionMode === 'high-contrast' (ver utils/preferences.ts). */
  highContrast: boolean;
  colorVisionMode: ColorVisionMode;
  simplifiedMode: boolean;
  captionsEnabled: boolean;
  speechRate: number;
  volume: number;
  voiceEnabled: boolean;
  reduceMotion: boolean;
  language: string;
}

// Los valores por defecto viven en preferences.ts (módulo sin dependencias, también usado en pruebas).
export const defaultPreferences: AccessibilityPreferences = defaultValues;

export const accessibilityPreferences = storage.defineItem<AccessibilityPreferences>(
  'sync:accessibility-preferences',
  { fallback: defaultPreferences },
);

export type NeedProfile = 'visual' | 'auditiva' | 'motora' | 'cognitiva' | 'mayor';

export interface UserProfile {
  name: string;
  needs: NeedProfile[];
  onboardingCompleted: boolean;
  onboardingStep: number;
}

export const defaultUserProfile: UserProfile = {
  name: '',
  needs: [],
  onboardingCompleted: false,
  onboardingStep: 0,
};

export const userProfile = storage.defineItem<UserProfile>('sync:user-profile', {
  fallback: defaultUserProfile,
});

export interface CustomCommand {
  id: string;
  phrase: string;
  action: CommandAction;
  response?: string;
  enabled: boolean;
}

// Los comandos personales permanecen en este navegador: no se sincronizan con la cuenta.
export const customCommands = storage.defineItem<CustomCommand[]>('local:custom-commands', { fallback: [] });

export interface AiSummarySettings {
  /** Dirección HTTPS del servidor propio que genera el resumen. Navi nunca guarda una clave de IA. */
  endpoint: string;
}

export const aiSummarySettings = storage.defineItem<AiSummarySettings>('local:ai-summary-settings', {
  fallback: { endpoint: '' },
});
