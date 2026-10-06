const NOISE = 'script, style, noscript, template, svg, nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [aria-hidden="true"], [data-navi]';
const MAIN_SELECTOR = 'main, [role="main"], #main-content, .main-content, [class*="main-content" i], [class*="page-content" i]';
const HEADINGS = 'h1, h2, h3, [role="heading"]';
const TEXT_BLOCKS = 'p, span, li, a, td, th, label, button, strong, em, pre, blockquote, h1, h2, h3, h4, h5, h6';

export const clean = (text: string | null | undefined): string => text?.replace(/\s+/g, ' ').trim() ?? '';

export function isVisible(element: Element): boolean {
  const html = element as HTMLElement;
  if (html.hidden) return false;
  const style = getComputedStyle(html);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const box = html.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

/** true si el elemento es parte de un menú, cabecera, pie, contenido oculto o de la propia interfaz de Navi. */
export const isNoise = (element: Element): boolean => element.matches(NOISE) || element.closest(NOISE) !== null;

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
  return parts.join(' ').replace(/\s+([.,;:!?])/g, '$1');
}

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

export function getPageTitle(main: Element): string {
  const heading = Array.from(document.querySelectorAll('h1')).find(isVisible) ?? Array.from(main.querySelectorAll('h1, h2')).find(isVisible);
  const pageTitle = document.title.split(/\s[-|·]\s/).map(clean).filter(Boolean).pop();
  return clean(heading?.textContent) || pageTitle || 'Página de UTP Class';
}
