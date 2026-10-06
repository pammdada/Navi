import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyAccessibilityPreferences } from '@/utils/accessibility';
import { mergePreferences, normalizePreferences } from '@/utils/preferences';
import {
  accessibilityPreferences,
  defaultPreferences,
  defaultUserProfile,
  userProfile,
  type AccessibilityPreferences,
  type UserProfile,
} from '@/utils/storage';

export interface Notice {
  id: number;
  message: string;
  undo?: () => void;
}

interface NaviState {
  ready: boolean;
  preferences: AccessibilityPreferences;
  profile: UserProfile;
  notice: Notice | null;
  /** Guarda al instante. Si se pasa un mensaje, se muestra un aviso con la opción "Deshacer". */
  updatePreferences: (updates: Partial<AccessibilityPreferences>, message?: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  notify: (message: string, undo?: () => void) => void;
  dismissNotice: () => void;
}

const NaviContext = createContext<NaviState | null>(null);

// Los valores guardados por versiones anteriores pueden no tener los campos nuevos.
const withPreferenceDefaults = normalizePreferences;
const withProfileDefaults = (value: Partial<UserProfile> | null) => ({ ...defaultUserProfile, ...value });

export function NaviProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);
  const [notice, setNotice] = useState<Notice | null>(null);
  const preferencesRef = useRef(preferences);
  const profileRef = useRef(profile);
  preferencesRef.current = preferences;
  profileRef.current = profile;

  useEffect(() => {
    void Promise.all([accessibilityPreferences.getValue(), userProfile.getValue()]).then(([storedPreferences, storedProfile]) => {
      setPreferences(withPreferenceDefaults(storedPreferences));
      setProfile(withProfileDefaults(storedProfile));
      setReady(true);
    });
    // Mantiene la página sincronizada con los cambios hechos desde el panel lateral.
    const unwatchPreferences = accessibilityPreferences.watch((value) => setPreferences(withPreferenceDefaults(value)));
    const unwatchProfile = userProfile.watch((value) => setProfile(withProfileDefaults(value)));
    return () => {
      unwatchPreferences();
      unwatchProfile();
    };
  }, []);

  useEffect(() => applyAccessibilityPreferences(preferences), [preferences]);

  const notify = useCallback((message: string, undo?: () => void) => setNotice({ id: Date.now(), message, undo }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const savePreferences = useCallback(async (next: AccessibilityPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    await accessibilityPreferences.setValue(next);
  }, []);

  const updatePreferences = useCallback(
    async (updates: Partial<AccessibilityPreferences>, message?: string) => {
      const previous = preferencesRef.current;
      await savePreferences(mergePreferences(previous, updates));
      if (message) {
        notify(message, () => {
          void savePreferences(previous);
          notify('Cambio deshecho.');
        });
      }
    },
    [notify, savePreferences],
  );

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const next = { ...profileRef.current, ...updates };
    profileRef.current = next;
    setProfile(next);
    await userProfile.setValue(next);
  }, []);

  const resetPreferences = useCallback(async () => {
    const previous = preferencesRef.current;
    await savePreferences(defaultPreferences);
    notify('Se restableció la configuración original.', () => {
      void savePreferences(previous);
      notify('Cambio deshecho.');
    });
  }, [notify, savePreferences]);

  const value = useMemo(
    () => ({ ready, preferences, profile, notice, updatePreferences, updateProfile, resetPreferences, notify, dismissNotice }),
    [ready, preferences, profile, notice, updatePreferences, updateProfile, resetPreferences, notify, dismissNotice],
  );

  return <NaviContext.Provider value={value}>{children}</NaviContext.Provider>;
}

export function useNavi(): NaviState {
  const context = useContext(NaviContext);
  if (!context) throw new Error('useNavi debe usarse dentro de NaviProvider');
  return context;
}
