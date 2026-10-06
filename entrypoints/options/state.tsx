import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePreferencesStore } from '@/hooks/use-preferences-store';
import { mergePreferences } from '@/utils/preferences';
import { defaultPreferences, defaultUserProfile, userProfile, type AccessibilityPreferences, type UserProfile } from '@/utils/storage';

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
const withProfileDefaults = (value: Partial<UserProfile> | null) => ({ ...defaultUserProfile, ...value });

export function NaviProvider({ children }: { children: ReactNode }) {
  const { preferences, loaded: preferencesLoaded, ref: preferencesRef, save: savePreferences } = usePreferencesStore();
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const ready = preferencesLoaded && profileLoaded;

  useEffect(() => {
    const accept = (value: Partial<UserProfile> | null) => {
      setProfile(withProfileDefaults(value));
      setProfileLoaded(true);
    };
    void userProfile.getValue().then(accept);
    return userProfile.watch(accept);
  }, []);

  const notify = useCallback((message: string, undo?: () => void) => setNotice({ id: Date.now(), message, undo }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

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
    [notify, preferencesRef, savePreferences],
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
  }, [notify, preferencesRef, savePreferences]);

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
