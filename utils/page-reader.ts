import { clean, findMainContainer, getPageTitle, isNoise, isVisible, readableText } from './dom-analyzer';
import { MAX_UNITS, classifyText, createReadingPlan, isChromeText, type ReadingPlan, type ReadingUnit } from './reading-plan';

const MARK = 'data-navi-reading-id';
const ACTIVE = 'data-navi-reading-active';
const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
const BLOCK = 'p, li, blockquote, dd, dt, figcaption, td, th';
const CANDIDATES = `${HEADING}, ${BLOCK}, a[href], div, span, section, article, label`;
const MAX_UNIT_LENGTH = 1200;

export function clearReadingMarks(): void {
  document.querySelectorAll(`[${MARK}], [${ACTIVE}]`).forEach((element) => {
    element.removeAttribute(MARK);
    element.removeAttribute(ACTIVE);
  });
}

const ownText = (element: Element): string =>
  clean(Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(' '));

/**
 * Convierte el contenido principal de UTP Class en unidades de lectura (títulos, párrafos, actividades, fechas
 * y enlaces). Omite menús, pies, contenido oculto, controles repetidos y texto duplicado, y marca cada elemento
 * leído para poder resaltarlo.
 */
export function buildReadingPlan(): ReadingPlan {
  clearReadingMarks();
  const main = findMainContainer();
  const units: ReadingUnit[] = [];
  const consumed = new Set<Element>();
  const seen = new Set<string>();

  for (const element of Array.from(main.querySelectorAll<HTMLElement>(CANDIDATES))) {
    if (units.length >= MAX_UNITS) break;
    // Un elemento dentro de otro que ya se leyó completo (por ejemplo un <a> dentro de un <li>) no se repite.
    let covered = false;
    for (let parent = element.parentElement; parent && parent !== main; parent = parent.parentElement) {
      if (consumed.has(parent)) { covered = true; break; }
    }
    if (covered || isNoise(element)) continue;

    const isHeading = element.matches(HEADING);
    const isLink = element.tagName === 'A';
    const isBlock = element.matches(BLOCK);
    let text: string;
    if (isHeading || isBlock || isLink) {
      if (!isVisible(element)) continue;
      text = isLink ? clean(element.textContent) || clean(element.getAttribute('aria-label')) : readableText(element);
    } else {
      // Contenedores genéricos: solo cuenta el texto que escriben directamente, sin el de sus hijos.
      const own = ownText(element);
      if (own.length < 12 || !isVisible(element)) continue;
      text = own;
    }
    if (!text || text.length < 2 || (isLink && text.length < 3) || (!isHeading && isChromeText(text))) continue;
    if (text.length > MAX_UNIT_LENGTH) text = `${text.slice(0, MAX_UNIT_LENGTH)}…`;

    const key = text.toLocaleLowerCase('es');
    if (!isHeading && seen.has(key)) continue;
    seen.add(key);

    if (isHeading || isBlock || isLink) consumed.add(element);
    const index = units.length + 1;
    const elementId = `navi-reading-${index}`;
    element.setAttribute(MARK, elementId);
    units.push({ id: `u${index}`, type: classifyText(text, isHeading ? 'heading' : isLink ? 'link' : 'block'), text, elementId });
  }

  return createReadingPlan(getPageTitle(main), /course/i.test(location.pathname), units);
}

/** Resalta el bloque que se está leyendo. Con null solo quita el resaltado (las marcas se conservan para seguir leyendo). */
export function highlightReadingUnit(elementId: string | null): boolean {
  document.querySelectorAll(`[${ACTIVE}]`).forEach((element) => element.removeAttribute(ACTIVE));
  if (elementId === null) return true;
  const element = document.querySelector<HTMLElement>(`[${MARK}="${CSS.escape(elementId)}"]`);
  if (!element) return false;
  element.setAttribute(ACTIVE, '');
  const reduce = document.documentElement.classList.contains('navi-reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  return true;
}
