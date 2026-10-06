import '@/styles/utp-content.css';
import { applyAccessibilityPreferences } from '@/utils/accessibility';
import { setCaptions } from '@/utils/captions';
import { watchPage, enhancePage } from '@/utils/page-enhancer';
import { isLensOpen, toggleLens } from '@/utils/page-lens';
import { buildReadingPlan, clearReadingMarks, highlightReadingUnit } from '@/utils/page-reader';
import { normalizePreferences } from '@/utils/preferences';
import { accessibilityPreferences } from '@/utils/storage';

/** Mensajes que el panel lateral puede enviar a la página. Son un conjunto cerrado: no hay mensajes para hacer clic ni navegar. */
type ContentRequest =
  | { type: 'NAVI_PING' }
  | { type: 'NAVI_GET_READING_PLAN' }
  | { type: 'NAVI_HIGHLIGHT_UNIT'; elementId: string | null }
  | { type: 'NAVI_CLEAR_READING' }
  | { type: 'NAVI_APPLY_CAPTIONS'; enabled: boolean }
  | { type: 'NAVI_TOGGLE_LENS' };

declare global {
  interface Window {
    __naviContentLoaded?: boolean;
  }
}

const notifyLensClosed = () => void browser.runtime.sendMessage({ type: 'NAVI_LENS_CLOSED' }).catch(() => undefined);

export default defineContentScript({
  matches: ['*://class.utp.edu.pe/*'],
  runAt: 'document_idle',
  async main() {
    // El panel puede inyectar este script otra vez si la pestaña se abrió antes de instalar la extensión.
    if (window.__naviContentLoaded) return;
    window.__naviContentLoaded = true;

    let captionsApplied: boolean | null = null;
    const applyPreferences = async () => {
      const preferences = normalizePreferences(await accessibilityPreferences.getValue());
      applyAccessibilityPreferences(preferences);
      enhancePage();
      // Los subtítulos siguen al ajuste desde cualquier pantalla; no se tocan si el usuario nunca los activó.
      if (preferences.captionsEnabled !== captionsApplied && !(captionsApplied === null && !preferences.captionsEnabled)) {
        setCaptions(preferences.captionsEnabled);
      }
      captionsApplied = preferences.captionsEnabled;
      return preferences;
    };
    await applyPreferences();
    accessibilityPreferences.watch(() => void applyPreferences());
    watchPage();

    // Los videos aparecen cuando la SPA cambia de pantalla: si los subtítulos están activos, se activan en los nuevos.
    new MutationObserver((records) => {
      const added = records.some((record) => Array.from(record.addedNodes).some((node) => node instanceof Element && (node.matches('video') || node.querySelector('video'))));
      if (added && captionsApplied) setCaptions(true);
    }).observe(document.body, { childList: true, subtree: true });

    browser.runtime.onMessage.addListener((message: ContentRequest) => {
      switch (message.type) {
        case 'NAVI_PING':
          return Promise.resolve({ ready: true, lens: isLensOpen() });
        case 'NAVI_GET_READING_PLAN':
          return Promise.resolve(buildReadingPlan());
        case 'NAVI_HIGHLIGHT_UNIT':
          return Promise.resolve({ found: highlightReadingUnit(message.elementId === null ? null : String(message.elementId)) });
        case 'NAVI_CLEAR_READING':
          clearReadingMarks();
          return Promise.resolve({ cleared: true });
        case 'NAVI_APPLY_CAPTIONS':
          return Promise.resolve(setCaptions(Boolean(message.enabled)));
        case 'NAVI_TOGGLE_LENS':
          return Promise.resolve({ enabled: toggleLens(notifyLensClosed) });
        default:
          return undefined;
      }
    });
  },
});
