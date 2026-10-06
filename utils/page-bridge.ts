import { UTP_HOST, resolveSafeUrl, safeRoutes, type SafeRouteId } from './navigation';

const CONTENT_SCRIPT = '/content-scripts/utp-content.js';
const CONTENT_STYLES = '/content-scripts/utp-content.css';

export class PageBridgeError extends Error {
  constructor(public reason: 'no-tab' | 'wrong-site' | 'unreachable' | 'blocked', message: string) {
    super(message);
  }
}

async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

async function getActiveUtpTab(): Promise<number> {
  const tab = await getActiveTab();
  if (!tab?.id) throw new PageBridgeError('no-tab', 'No encontré una pestaña activa.');
  const host = tab.url ? new URL(tab.url).hostname : '';
  if (host !== UTP_HOST) throw new PageBridgeError('wrong-site', 'Abre UTP Class (class.utp.edu.pe) para usar esta función.');
  return tab.id;
}

/**
 * Abre una de las rutas fijas y verificadas de UTP Class. En una pestaña de UTP Class la reemplaza;
 * desde cualquier otra pestaña abre UTP Class en una pestaña nueva.
 */
export async function openSafeRoute(id: SafeRouteId): Promise<void> {
  const url = resolveSafeUrl(id);
  if (!url) throw new PageBridgeError('blocked', `${safeRoutes[id].label} todavía no está disponible: falta validar la ruta con UTP Class.`);
  const tab = await getActiveTab();
  const onUtp = tab?.id && tab.url && new URL(tab.url).hostname === UTP_HOST;
  if (onUtp) await browser.tabs.update(tab.id!, { url });
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
      throw new PageBridgeError('unreachable', 'No pude conectarme con la página. Recárgala e inténtalo otra vez.');
    }
    if (!(await contentScriptReady(tabId))) throw new PageBridgeError('unreachable', 'No pude conectarme con la página. Recárgala e inténtalo otra vez.');
  }
  return (await browser.tabs.sendMessage(tabId, message)) as T;
}

export const bridgeErrorMessage = (error: unknown): string =>
  error instanceof PageBridgeError ? error.message : 'No pude completar la acción en la página. Inténtalo otra vez.';
