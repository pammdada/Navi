import '@/styles/utp-content.css';
import { applyAccessibilityPreferences } from '@/utils/accessibility';
import { setCaptions } from '@/utils/captions';
import { analyzeCurrentPage, findNavigationTarget } from '@/utils/dom-analyzer';
import { accessibilityPreferences } from '@/utils/storage';

type ContentRequest =
  | { type: 'NAVI_GET_PAGE_SUMMARY' }
  | { type: 'NAVI_APPLY_CAPTIONS'; enabled: boolean }
  | { type: 'NAVI_NAVIGATE'; command: string };

export default defineContentScript({
  matches: ['*://class.utp.edu.pe/*'],
  runAt: 'document_idle',
  async main() {
    const applyPreferences = async () => applyAccessibilityPreferences(await accessibilityPreferences.getValue());
    await applyPreferences();
    accessibilityPreferences.watch(() => void applyPreferences());
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
