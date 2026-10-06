import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { applyAccessibilityPreferences } from '@/utils/accessibility';
import { GuidedReader, idleState, type ReaderMode, type ReaderState } from '@/utils/guided-reader';
import { sendToPage } from '@/utils/page-bridge';
import { mergePreferences, normalizePreferences } from '@/utils/preferences';
import type { ReadingPlan } from '@/utils/reading-plan';
import { sanitizeStoredCommands } from '@/utils/speech/commands';
import { speakWithPreferences, stopSpeaking } from '@/utils/speech/synthesis';
import {
  accessibilityPreferences,
  aiSummarySettings,
  customCommands,
  defaultPreferences,
  userProfile,
  type AccessibilityPreferences,
  type CustomCommand,
} from '@/utils/storage';

/** Ajustes compartidos con la página y el Centro Navi. El propio panel también los aplica (contraste y tamaño). */
export function usePreferences() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const ref = useRef(preferences);

  useEffect(() => {
    const accept = (value: Partial<AccessibilityPreferences> | null) => {
      const next = normalizePreferences(value);
      ref.current = next;
      setPreferences(next);
    };
    void accessibilityPreferences.getValue().then(accept);
    return accessibilityPreferences.watch(accept);
  }, []);

  useEffect(() => applyAccessibilityPreferences(preferences), [preferences]);

  const update = useCallback(async (updates: Partial<AccessibilityPreferences>) => {
    const next = mergePreferences(ref.current, updates);
    ref.current = next;
    setPreferences(next);
    await accessibilityPreferences.setValue(next);
  }, []);

  return { preferences, ref, update };
}

function useStoredValue<T>(read: () => Promise<T>, watch: (callback: (value: T) => void) => () => void, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    void read().then(setValue);
    return watch(setValue);
  }, []);
  return value;
}

export const useProfileName = (): string =>
  useStoredValue(() => userProfile.getValue().then((profile) => profile.name ?? ''), (callback) => userProfile.watch((profile) => callback(profile?.name ?? '')), '');

export const useCustomCommands = (): CustomCommand[] =>
  useStoredValue(() => customCommands.getValue().then(sanitizeStoredCommands), (callback) => customCommands.watch((value) => callback(sanitizeStoredCommands(value))), []);

export const useAiEndpoint = (): string =>
  useStoredValue(() => aiSummarySettings.getValue().then((settings) => settings.endpoint ?? ''), (callback) => aiSummarySettings.watch((settings) => callback(settings?.endpoint ?? '')), '');

/**
 * Lectura guiada: pide el plan de lectura a la página, lo lee unidad por unidad con la voz del navegador y
 * resalta en UTP Class el bloque actual. El controlador (GuidedReader) no sabe nada de React ni de Chrome.
 */
export function useGuidedReading(preferences: MutableRefObject<AccessibilityPreferences>) {
  const [state, setState] = useState<ReaderState>(idleState);
  const readerRef = useRef<GuidedReader | null>(null);

  const tellPage = useCallback((message: unknown) => void sendToPage(message).catch(() => undefined), []);

  const stop = useCallback(() => {
    readerRef.current?.stop();
    readerRef.current = null;
    stopSpeaking();
    tellPage({ type: 'NAVI_CLEAR_READING' });
  }, [tellPage]);

  const start = useCallback(
    async (mode: ReaderMode): Promise<string> => {
      readerRef.current?.stop();
      stopSpeaking();
      const plan = await sendToPage<ReadingPlan>({ type: 'NAVI_GET_READING_PLAN' });
      const reader = new GuidedReader(plan, {
        speak: (text, onEnd) => speakWithPreferences(text, preferences.current, onEnd),
        stopSpeaking,
        highlight: (elementId) => tellPage({ type: 'NAVI_HIGHLIGHT_UNIT', elementId }),
        onChange: (next) => {
          setState(next);
          if (next.status === 'idle') tellPage({ type: 'NAVI_CLEAR_READING' });
        },
      });
      readerRef.current = reader;
      if (!reader.start(mode)) {
        readerRef.current = null;
        return 'No encontré texto para leer en esta página. Espera a que cargue e inténtalo otra vez.';
      }
      return reader.state.message;
    },
    [preferences, tellPage],
  );

  useEffect(() => () => stopSpeaking(), []);

  return {
    state,
    start,
    stop,
    playPause: () => readerRef.current?.playPause(),
    next: () => readerRef.current?.next(),
    previous: () => readerRef.current?.previous(),
  };
}
