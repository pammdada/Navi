const UTP_HOST = 'class.utp.edu.pe';
const CONTENT_SCRIPT = '/content-scripts/utp-content.js';
const CONTENT_STYLES = '/content-scripts/utp-content.css';

export class PageBridgeError extends Error {
  constructor(public reason: 'no-tab' | 'wrong-site' | 'unreachable', message: string) {
    super(message);
  }
}

async function getActiveUtpTab(): Promise<number> {
  const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new PageBridgeError('no-tab', 'No encontré una pestaña activa.');
  const host = tab.url ? new URL(tab.url).hostname : '';
  if (host !== UTP_HOST) throw new PageBridgeError('wrong-site', 'Abre UTP Class (class.utp.edu.pe) para usar esta función.');
  return tab.id;
}

/**
 * Envía un mensaje al content script de la pestaña activa de UTP Class.
 * Si la pestaña estaba abierta antes de instalar o recargar la extensión, el content script aún no existe:
 * en ese caso se inyecta al vuelo y se reintenta, para que el usuario no tenga que recargar la página.
 */
export async function sendToPage<T>(message: unknown): Promise<T> {
  const tabId = await getActiveUtpTab();
  try {
    return (await browser.tabs.sendMessage(tabId, message)) as T;
  } catch {
    try {
      await browser.scripting.insertCSS({ target: { tabId }, files: [CONTENT_STYLES] });
      await browser.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT] });
      return (await browser.tabs.sendMessage(tabId, message)) as T;
    } catch {
      throw new PageBridgeError('unreachable', 'No pude conectarme con la página. Recárgala e inténtalo otra vez.');
    }
  }
}

export const bridgeErrorMessage = (error: unknown): string =>
  error instanceof PageBridgeError ? error.message : 'No pude conectarme con la página. Recárgala e inténtalo otra vez.';
