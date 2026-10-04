export interface PageSummary {
  title: string;
  headings: string[];
  links: Array<{ label: string; href: string }>;
  mainText: string;
}

const NOISE = 'script, style, noscript, template, svg, nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [aria-hidden="true"], [data-navi]';
const MAIN_SELECTOR = 'main, [role="main"], #main-content, .main-content, [class*="main-content" i], [class*="page-content" i]';

const clean = (text: string | null | undefined): string => text?.replace(/\s+/g, ' ').trim() ?? '';

export function isVisible(element: Element): boolean {
  const html = element as HTMLElement;
  if (html.hidden) return false;
  const style = getComputedStyle(html);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const box = html.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

/** Texto visible de un elemento, sin menús, scripts ni contenido oculto. */
export function readableText(root: Element): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !clean(node.textContent)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(NOISE) && !root.matches(NOISE)) return NodeFilter.FILTER_REJECT;
      return isVisible(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) parts.push(clean(walker.currentNode.textContent));
  return parts.join('. ').replace(/\.\s*\./g, '.').replace(/([.!?:;,])\./g, '$1');
}

const HEADINGS = 'h1, h2, h3, [role="heading"]';
const TEXT_BLOCKS = 'p, span, li, a, td, th, label, button, strong, em, pre, blockquote, h1, h2, h3, h4, h5, h6';
const textLength = (element: Element) => clean(element.textContent).length;
const linkTextLength = (element: Element) => Array.from(element.querySelectorAll('a')).reduce((sum, link) => sum + textLength(link), 0);

/**
 * Busca el contenedor principal. UTP Class es una aplicación de una sola página y puede no declarar un
 * landmark <main>. Los menús son casi solo enlaces, así que se baja por el árbol siguiendo al hijo que
 * concentra la mayor parte del texto que no es de enlaces, y se detiene cuando el contenido se reparte.
 */
export function findMainContainer(): Element {
  const declared = Array.from(document.querySelectorAll(MAIN_SELECTOR)).find(isVisible);
  if (declared) return declared;

  const contentWeight = (element: Element) => {
    const weight = textLength(element) - linkTextLength(element);
    return weight > 0 ? weight : textLength(element) / 4;
  };
  let current: Element = document.body;
  for (let depth = 0; depth < 12; depth += 1) {
    const total = contentWeight(current);
    const dominant = Array.from(current.children)
      .filter((child) => !child.matches(NOISE) && isVisible(child))
      .map((child) => ({ child, weight: contentWeight(child) }))
      .sort((a, b) => b.weight - a.weight)[0];
    if (!dominant || dominant.weight < total * 0.7) break;
    // Un contenedor con su propio título ya es la pantalla de contenido; y un bloque de texto no es un contenedor.
    if (current !== document.body && Array.from(current.children).some((child) => child.matches(HEADINGS))) break;
    if (dominant.child.matches(TEXT_BLOCKS)) break;
    current = dominant.child;
  }
  return current;
}

export function analyzeCurrentPage(): PageSummary {
  const main = findMainContainer();
  const heading = Array.from(document.querySelectorAll('h1')).find(isVisible);
  const mainHeading = Array.from(main.querySelectorAll('h1, h2')).find(isVisible);
  const pageTitle = document.title.split(/\s[-|·]\s/).map(clean).filter(Boolean).pop();
  const title = clean(heading?.textContent) || clean(mainHeading?.textContent) || pageTitle || 'Página de UTP Class';
  const headings = Array.from(main.querySelectorAll('h1, h2, h3, [role="heading"]'))
    .filter(isVisible)
    .map((item) => clean(item.textContent))
    .filter(Boolean)
    .slice(0, 12);
  const links = Array.from(main.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .filter(isVisible)
    .map((link) => ({ label: clean(link.textContent) || clean(link.getAttribute('aria-label')) || 'Enlace sin nombre', href: link.href }))
    .filter((link) => link.label.length > 1)
    .slice(0, 20);
  return { title, headings, links, mainText: readableText(main).slice(0, 12000) };
}

const navigationAliases: Record<string, string[]> = {
  cursos: ['curso', 'courses', 'mis cursos', 'asignatura'],
  tareas: ['tarea', 'assignment', 'actividad', 'entrega'],
  calificaciones: ['calificaci', 'nota', 'grade'],
  anuncios: ['anuncio', 'announcement', 'aviso'],
  inicio: ['inicio', 'home'],
  calendario: ['calendario', 'agenda', 'horario'],
  mensajes: ['mensaje', 'inbox', 'bandeja'],
};

export function findNavigationTarget(command: string): HTMLElement | null {
  const normalized = command.toLocaleLowerCase('es');
  const entry = Object.entries(navigationAliases).find(([key, terms]) => normalized.includes(key) || terms.some((term) => normalized.includes(term)));
  if (!entry) return null;
  const matches = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, [role="link"], [role="tab"], [role="menuitem"]'))
    .filter((element) => !element.closest('[data-navi]') && isVisible(element))
    .map((element) => ({ element, label: `${clean(element.textContent)} ${element.getAttribute('aria-label') ?? ''}`.toLocaleLowerCase('es').trim() }))
    .filter(({ label }) => entry[1].some((term) => label.includes(term)));
  // Entre varias coincidencias, la de texto más corto suele ser el enlace del menú y no un título largo.
  return matches.sort((a, b) => a.label.length - b.label.length)[0]?.element ?? null;
}
