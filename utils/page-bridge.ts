import { NEEDS_COURSE_MESSAGE, isUtpUrl, resolveSafeUrl, type SafeRouteId } from './navigation';

const CONTENT_SCRIPT = '/content-scripts/utp-content.js';
const CONTENT_STYLES = '/content-scripts/utp-content.css';

/** Error con un mensaje listo para mostrarle al usuario (ver bridgeErrorMessage). */
export class PageBridgeError extends Error {}

async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

async function getActiveUtpTab(): Promise<number> {
  const tab = await getActiveTab();
  if (!tab?.id) throw new PageBridgeError('No encontré una pestaña activa.');
  if (!isUtpUrl(tab.url)) throw new PageBridgeError('Abre UTP Class (class.utp.edu.pe) para usar esta función.');
  return tab.id;
}

/**
 * Abre una de las rutas fijas de UTP Class (global, o pestaña del curso abierto). En una pestaña de UTP Class la reemplaza;
 * desde cualquier otra pestaña abre UTP Class en una pestaña nueva.
 */
export async function openSafeRoute(id: SafeRouteId): Promise<void> {
  const tab = await getActiveTab();
  const url = resolveSafeUrl(id, tab?.url);
  if (!url) throw new PageBridgeError(NEEDS_COURSE_MESSAGE);
  if (tab?.id && isUtpUrl(tab.url)) await browser.tabs.update(tab.id, { url });
  else await browser.tabs.create({ url });
}

async function contentScriptReady(tabId: number): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'NAVI_PING' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Envía un mensaje al content script de la pestaña activa de UTP Class.
 * Si la pestaña estaba abierta antes de instalar o recargar la extensión, el content script aún no existe:
 * solo en ese caso se inyecta (script y estilos) y se reintenta. Un fallo del propio mensaje no reinyecta nada.
 */
export async function sendToPage<T>(message: unknown): Promise<T> {
  const tabId = await getActiveUtpTab();
  if (!(await contentScriptReady(tabId))) {
    try {
      await browser.scripting.insertCSS({ target: { tabId }, files: [CONTENT_STYLES] });
      await browser.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT] });
    } catch {
      throw new PageBridgeError('No pude conectarme con la página. Recárgala e inténtalo otra vez.');
    }
    if (!(await contentScriptReady(tabId))) throw new PageBridgeError('No pude conectarme con la página. Recárgala e inténtalo otra vez.');
  }
  return (await browser.tabs.sendMessage(tabId, message)) as T;
}

export const bridgeErrorMessage = (error: unknown): string =>
  error instanceof PageBridgeError ? error.message : 'No pude completar la acción en la página. Inténtalo otra vez.';
