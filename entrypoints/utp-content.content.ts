import '@/styles/utp-content.css';
import { applyAccessibilityPreferences } from '@/utils/accessibility';
import { setCaptions } from '@/utils/captions';
import { analyzeCurrentPage, findNavigationTarget } from '@/utils/dom-analyzer';
import { watchPage } from '@/utils/page-enhancer';
import { accessibilityPreferences, defaultPreferences } from '@/utils/storage';

type ContentRequest =
  | { type: 'NAVI_GET_PAGE_SUMMARY' }
  | { type: 'NAVI_APPLY_CAPTIONS'; enabled: boolean }
  | { type: 'NAVI_NAVIGATE'; command: string };

declare global {
  interface Window {
    __naviContentLoaded?: boolean;
  }
}

export default defineContentScript({
  matches: ['*://class.utp.edu.pe/*'],
  runAt: 'document_idle',
  async main() {
    // El panel puede inyectar este script otra vez si la pestaña se abrió antes de instalar la extensión.
    if (window.__naviContentLoaded) return;
    window.__naviContentLoaded = true;

    const applyPreferences = async () => applyAccessibilityPreferences({ ...defaultPreferences, ...(await accessibilityPreferences.getValue()) });
    await applyPreferences();
    accessibilityPreferences.watch(() => void applyPreferences());
    watchPage();

    browser.runtime.onMessage.addListener((message: ContentRequest) => {
      if (message.type === 'NAVI_GET_PAGE_SUMMARY') return Promise.resolve(analyzeCurrentPage());
      if (message.type === 'NAVI_APPLY_CAPTIONS') return Promise.resolve(setCaptions(message.enabled));
      if (message.type === 'NAVI_NAVIGATE') {
        const target = findNavigationTarget(message.command);
        target?.click();
        return Promise.resolve({ found: Boolean(target) });
      }
      return undefined;
    });
  },
});
