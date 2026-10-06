import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAccessibilityPreferences } from '@/utils/accessibility';
import { mergePreferences, normalizePreferences } from '@/utils/preferences';
import { accessibilityPreferences, defaultPreferences, type AccessibilityPreferences } from '@/utils/storage';

/**
 * Ajustes de accesibilidad compartidos entre el panel lateral y el Centro Navi: carga, se mantiene
 * sincronizado con los cambios hechos desde otra pantalla, aplica contraste y tamaño a la propia interfaz
 * y guarda siempre a través de mergePreferences (así colorVisionMode y highContrast no se contradicen).
 */
export function usePreferencesStore() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(preferences);

  useEffect(() => {
    const accept = (value: Partial<AccessibilityPreferences> | null) => {
      const next = normalizePreferences(value);
      ref.current = next;
      setPreferences(next);
      setLoaded(true);
    };
    void accessibilityPreferences.getValue().then(accept);
    return accessibilityPreferences.watch(accept);
  }, []);

  useEffect(() => applyAccessibilityPreferences(preferences), [preferences]);

  /** Guarda el valor completo tal cual (por ejemplo, para deshacer un cambio). */
  const save = useCallback(async (next: AccessibilityPreferences) => {
    ref.current = next;
    setPreferences(next);
    await accessibilityPreferences.setValue(next);
  }, []);

  const update = useCallback((updates: Partial<AccessibilityPreferences>) => save(mergePreferences(ref.current, updates)), [save]);

  return { preferences, loaded, ref, save, update };
}
