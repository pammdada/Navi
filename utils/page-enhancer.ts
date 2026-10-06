import { findMainContainer, isVisible } from './dom-analyzer';
import { classifyStatus, needsLabel, statusMeta } from './status-labels';

const SKIP_LINK_ID = 'navi-skip-link';
const accessibleName = (element: Element) => element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('title');

function ensureMainLandmark(): void {
  if (document.querySelector('main, [role="main"]')) return;
  const main = findMainContainer();
  if (main === document.body) return;
  main.setAttribute('role', 'main');
  main.setAttribute('data-navi-landmark', '');
  if (!main.id) main.id = 'navi-main';
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
}

function ensureSkipLink(): void {
  const main = document.querySelector<HTMLElement>('main, [role="main"]');
  const existing = document.getElementById(SKIP_LINK_ID);
  if (!main) return existing?.remove();
  if (!main.id) main.id = 'navi-main';
  if (existing) return;
  const link = document.createElement('a');
  link.id = SKIP_LINK_ID;
  link.setAttribute('data-navi', '');
  link.href = `#${main.id}`;
  link.textContent = 'Saltar al contenido principal';
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const target = document.querySelector<HTMLElement>('main, [role="main"]');
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus();
    }
  });
  document.body.prepend(link);
}

function labelImages(): void {
  document.querySelectorAll<HTMLImageElement>('img:not([alt])').forEach((image) => {
    // Sin descripción disponible se marca como decorativa, para que el lector no lea el nombre del archivo.
    image.setAttribute('alt', image.title || image.getAttribute('aria-label') || '');
  });
}

function labelControls(): void {
  document.querySelectorAll<HTMLElement>('button, a[href], [role="button"], [role="link"]').forEach((control) => {
    if (accessibleName(control) || control.hasAttribute('aria-labelledby')) return;
    const image = control.querySelector('img[alt]:not([alt=""])');
    const svgTitle = control.querySelector('svg title');
    const name = image?.getAttribute('alt') || svgTitle?.textContent?.trim();
    if (name) control.setAttribute('aria-label', name);
  });
  document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([aria-label]):not([aria-labelledby]), textarea, select').forEach((field) => {
    if (field.labels?.length) return;
    const hint = field.getAttribute('placeholder') || field.getAttribute('title') || field.getAttribute('name');
    if (hint) field.setAttribute('aria-label', hint);
  });
}

const STATUS_CANDIDATES = '[class*="pending" i], [class*="complet" i], [class*="overdue" i], [class*="success" i], [class*="danger" i], [class*="warning" i], [class*="error" i], [class*="badge" i], [class*="chip" i], [class*="status" i], [role="alert"]';

/**
 * Con una paleta para daltonismo activa, los estados no pueden depender solo del color: se les agrega un
 * ícono y, si el elemento no lo dice con palabras, una etiqueta visible ("Pendiente", "Completada", "Vencida").
 * El ícono y la etiqueta los dibuja el CSS a partir de estos atributos; el texto original no se modifica.
 */
function annotateStatus(): void {
  const mode = document.documentElement.dataset.naviColorVision;
  const active = Boolean(mode) && mode !== 'standard';
  const attributes = ['data-navi-status', 'data-navi-status-icon', 'data-navi-label'];
  if (!active) {
    document.querySelectorAll('[data-navi-status]').forEach((element) => attributes.forEach((name) => element.removeAttribute(name)));
    return;
  }
  document.querySelectorAll<HTMLElement>(STATUS_CANDIDATES).forEach((element) => {
    if (element.closest('[data-navi]') || !isVisible(element)) return;
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text.length > 60) return;
    const kind = classifyStatus(text, element.className.toString(), element.getAttribute('role'));
    if (!kind) return;
    element.setAttribute('data-navi-status', kind);
    element.setAttribute('data-navi-status-icon', statusMeta[kind].icon);
    if (needsLabel(kind, text)) element.setAttribute('data-navi-label', statusMeta[kind].label);
    else element.removeAttribute('data-navi-label');
  });
}

function ensureDocumentLanguage(): void {
  if (!document.documentElement.lang) document.documentElement.lang = 'es';
}

/**
 * Mejora el DOM de UTP Class para lectores de pantalla (NVDA, JAWS, Narrador): landmark principal,
 * enlace para saltar al contenido, nombres accesibles en controles e imágenes. Es idempotente y solo
 * agrega atributos; no cambia el aspecto ni el comportamiento de la página.
 */
export function enhancePage(): void {
  ensureDocumentLanguage();
  ensureMainLandmark();
  ensureSkipLink();
  labelImages();
  labelControls();
  annotateStatus();
}

/** La aplicación es una SPA: se vuelve a mejorar el DOM cuando cambia el contenido. */
export function watchPage(): () => void {
  let timer: number | undefined;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      // Si el contenedor principal fue reemplazado por el router de la SPA, se vuelve a calcular.
      const marked = document.querySelector('[data-navi-landmark]');
      if (marked && !isVisible(marked)) {
        marked.removeAttribute('role');
        marked.removeAttribute('data-navi-landmark');
      }
      enhancePage();
    }, 400);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  enhancePage();
  return () => {
    window.clearTimeout(timer);
    observer.disconnect();
  };
}
