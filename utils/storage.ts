// utils/storage.ts
import { storage } from '#imports';

export type FontSize = 'normal' | 'large' | 'x-large';

export interface AccessibilityPreferences {
  fontSize: FontSize;
  highContrast: boolean;
  simplifiedMode: boolean;
  captionsEnabled: boolean;
  speechRate: number;
  volume: number;
  voiceEnabled: boolean;
  reduceMotion: boolean;
  language: string;
}

export const defaultPreferences: AccessibilityPreferences = {
  fontSize: 'normal',
  highContrast: false,
  simplifiedMode: false,
  captionsEnabled: false,
  speechRate: 1,
  volume: 1,
  voiceEnabled: true,
  reduceMotion: false,
  language: 'es-PE',
};

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

export const idioma = storage.defineItem<string>('sync:idioma', {
  fallback: 'es',
});

// Aprovecha de definir aquí TODAS las preferencias del usuario juntas
export const velocidadLectura = storage.defineItem<number>('sync:velocidadLectura', {
  fallback: 1, // 1 = velocidad normal
});

export const volumen = storage.defineItem<number>('sync:volumen', {
  fallback: 1,
});

export const mostrarAyudaComandos = storage.defineItem<boolean>('sync:mostrarAyuda', {
  fallback: true,
});
