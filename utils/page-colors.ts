import { contrastRatio, ensureContrast, parseCssColor, remapColor, type CvdMode, type Rgb } from './color-vision';
import type { ColorVisionMode } from './storage';

/**
 * Aplica las paletas para daltonismo a UTP Class cambiando los colores REALES de la página: texto, fondos,
 * bordes y relleno de SVG. Solo se tocan los matices que ese tipo de visión confunde (ver color-vision.ts);
 * grises, blancos, imágenes y videos quedan igual. La luminancia se conserva, así que el contraste también.
 * Todo es reversible: cada valor que se escribe se guarda para restaurarlo al volver al modo estándar.
 */

const MARK = 'data-navi-cv';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'PICTURE', 'OBJECT', 'EMBED', 'HEAD', 'META', 'LINK', 'TITLE', 'BR', 'HR']);
const CHUNK = 250;
const MAX_ELEMENTS = 15000;
const REMAP_DELAY_MS = 250;
const BORDERS = ['top', 'right', 'bottom', 'left'] as const;

interface Written {
  /** Lo que valía el estilo en línea antes de que Navi lo tocara (vacío si no tenía nada). */
  original: string;
  priority: string;
  /** Lo que quedó escrito, tal como lo normaliza el navegador; si cambió, otra cosa lo reescribió y no se restaura. */
  applied: string;
}

const touched = new WeakMap<Element, Map<string, Written>>();
let mode: CvdMode | null = null;
let generation = 0;
let observer: MutationObserver | null = null;
let timer: number | undefined;
const pending = new Set<Element>();

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function css(rgb: Rgb & { a?: number }): string {
  return rgb.a !== undefined && rgb.a < 1 ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})` : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/** Calcula, sin escribir nada, qué propiedades de un elemento hay que cambiar. */
function plan(element: Element, cvd: CvdMode): [string, string][] {
  const style = getComputedStyle(element);
  const changes: [string, string][] = [];

  const fg = parseCssColor(style.color);
  const bg = parseCssColor(style.backgroundColor);
  const hasGradient = style.backgroundImage.includes('gradient');

  let newFg = fg && fg.a >= 0.1 ? remapColor(fg, cvd) : null;
  const newBg = bg && bg.a >= 0.1 && !hasGradient ? remapColor(bg, cvd) : null;

  // Si algo cambió sobre un fondo opaco, el texto no puede perder legibilidad respecto a la que tenía.
  if (fg && bg && bg.a >= 0.95 && (newFg || newBg)) {
    const finalFg = newFg ?? fg;
    const finalBg = newBg ?? bg;
    const required = Math.min(4.5, contrastRatio(fg, bg));
    if (contrastRatio(finalFg, finalBg) + 0.2 < required) newFg = ensureContrast(finalFg, finalBg, required);
  }

  if (newFg && fg) changes.push(['color', css({ ...newFg, a: fg.a })]);
  if (newBg && bg) changes.push(['background-color', css({ ...newBg, a: bg.a })]);

  for (const side of BORDERS) {
    const borderStyle = style.getPropertyValue(`border-${side}-style`);
    if (borderStyle === 'none' || borderStyle === 'hidden' || parseFloat(style.getPropertyValue(`border-${side}-width`)) <= 0) continue;
    const color = parseCssColor(style.getPropertyValue(`border-${side}-color`));
    const next = color && color.a >= 0.1 ? remapColor(color, cvd) : null;
    if (next && color) changes.push([`border-${side}-color`, css({ ...next, a: color.a })]);
  }

  if (element instanceof SVGElement) {
    for (const prop of ['fill', 'stroke'] as const) {
      const color = parseCssColor(style.getPropertyValue(prop));
      const next = color && color.a >= 0.1 ? remapColor(color, cvd) : null;
      if (next && color) changes.push([prop, css({ ...next, a: color.a })]);
    }
  }
  return changes;
}

function write(element: HTMLElement | SVGElement, changes: [string, string][]): void {
  if (!changes.length) return;
  let written = touched.get(element);
  if (!written) {
    written = new Map();
    touched.set(element, written);
    element.setAttribute(MARK, '');
  }
  for (const [prop, value] of changes) {
    const previous = written.get(prop);
    const original = previous ? previous.original : element.style.getPropertyValue(prop);
    const priority = previous ? previous.priority : element.style.getPropertyPriority(prop);
    element.style.setProperty(prop, value, 'important');
    written.set(prop, { original, priority, applied: element.style.getPropertyValue(prop) });
  }
}

function restore(element: Element): void {
  const written = touched.get(element);
  const styled = element as HTMLElement | SVGElement;
  if (written && styled.style) {
    for (const [prop, { original, priority, applied }] of written) {
      if (styled.style.getPropertyValue(prop) !== applied) continue; // la página lo cambió después: no se pisa
      if (original) styled.style.setProperty(prop, original, priority);
      else styled.style.removeProperty(prop);
    }
    if (!styled.getAttribute('style')) styled.removeAttribute('style');
  }
  touched.delete(element);
  element.removeAttribute(MARK);
}

function revertAll(): void {
  document.querySelectorAll(`[${MARK}]`).forEach(restore);
}

function collect(roots: Element[]): Element[] {
  const found = new Set<Element>();
  for (const root of roots) {
    if (!root.isConnected) continue;
    found.add(root);
    root.querySelectorAll('*').forEach((element) => found.add(element));
    if (found.size >= MAX_ELEMENTS) break;
  }
  return [...found]
    .filter((element) => !SKIP_TAGS.has(element.tagName) && !element.hasAttribute('data-navi'))
    .slice(0, MAX_ELEMENTS);
}

/** Recorre los elementos por tandas: primero lee todos los estilos de la tanda y después los escribe, para no recalcular el diseño a cada paso. */
async function scan(roots: Element[], cvd: CvdMode, run: number): Promise<void> {
  const elements = collect(roots);
  for (let start = 0; start < elements.length; start += CHUNK) {
    if (run !== generation) return;
    const batch = elements.slice(start, start + CHUNK);
    const plans = batch.map((element) => [element, plan(element, cvd)] as const);
    for (const [element, changes] of plans) write(element as HTMLElement | SVGElement, changes);
    if (start + CHUNK < elements.length) await nextTask();
  }
}

function startObserver(): void {
  if (observer) return;
  observer = new MutationObserver((records) => {
    for (const record of records) record.addedNodes.forEach((node) => node instanceof Element && pending.add(node));
    if (!pending.size) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const roots = [...pending];
      pending.clear();
      if (mode) void scan(roots, mode, generation);
    }, REMAP_DELAY_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function stopObserver(): void {
  observer?.disconnect();
  observer = null;
  window.clearTimeout(timer);
  pending.clear();
}

/** Activa la paleta indicada (o la quita con 'standard' / 'high-contrast'). Seguro de llamar muchas veces. */
export function setColorVisionMode(next: ColorVisionMode): void {
  const cvd: CvdMode | null = next === 'red-green-safe' || next === 'blue-yellow-safe' ? next : null;
  if (cvd === mode) return;
  generation += 1;
  revertAll();
  mode = cvd;
  if (!cvd) return stopObserver();
  startObserver();
  void scan([document.documentElement], cvd, generation);
}

/** Cuántos elementos tiene Navi modificados ahora mismo (para depurar y para las pruebas). */
export const recoloredCount = (): number => document.querySelectorAll(`[${MARK}]`).length;
