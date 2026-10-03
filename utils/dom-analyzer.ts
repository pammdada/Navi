export interface PageSummary {
  title: string;
  headings: string[];
  links: Array<{ label: string; href: string }>;
  mainText: string;
}

const textOf = (element: Element | null): string => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

export function analyzeCurrentPage(): PageSummary {
  const main = document.querySelector('main, [role="main"], #main-content, .main-content') ?? document.body;
  const title = textOf(document.querySelector('h1')) || document.title || 'Página de UTP Class';
  const headings = Array.from(main.querySelectorAll('h1, h2, h3')).map((heading) => textOf(heading)).filter(Boolean).slice(0, 8);
  const links = Array.from(main.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .map((link) => ({ label: textOf(link) || 'Enlace sin nombre', href: link.href }))
    .filter((link) => link.label.length > 1).slice(0, 12);
  return { title, headings, links, mainText: textOf(main).slice(0, 7000) };
}

export function findNavigationTarget(command: string): HTMLElement | null {
  const normalized = command.toLocaleLowerCase('es');
  const aliases: Record<string, string[]> = {
    cursos: ['curso', 'courses', 'mis cursos'], tareas: ['tarea', 'assignment', 'actividad'],
    calificaciones: ['calificaci', 'nota', 'grade'], anuncios: ['anuncio', 'announcement', 'aviso'],
  };
  const target = Object.entries(aliases).find(([key, terms]) => normalized.includes(key) || terms.some((term) => normalized.includes(term)));
  if (!target) return null;
  return Array.from(document.querySelectorAll<HTMLElement>('a, button, [role="link"]')).find((element) => {
    const label = `${element.textContent ?? ''} ${element.getAttribute('aria-label') ?? ''}`.toLocaleLowerCase('es');
    return target[1].some((term) => label.includes(term));
  }) ?? null;
}
