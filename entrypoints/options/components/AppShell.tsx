import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { NaviLogo } from '@/components/NaviLogo';
import { routeInfo, type RouteId } from '../routes';
import { Sidebar } from './Sidebar';

export function SkipLink() {
  return (
    <a
      href="#contenido"
      onClick={(event) => {
        event.preventDefault();
        document.getElementById('contenido')?.focus();
      }}
      className="fixed top-3 left-3 z-50 -translate-y-24 rounded-xl bg-brand px-5 py-3 font-bold text-on-brand focus:translate-y-0"
    >
      Saltar al contenido principal
    </a>
  );
}

export function Brand() {
  return (
    <a href="#/inicio" className="flex items-center gap-3 rounded-xl">
      <span className="logo-frame">
        <NaviLogo size={48} decorative />
      </span>
      <span className="leading-tight">
        <span className="block text-2xl font-bold tracking-tight">Navi</span>
        <span className="block text-sm text-ink-soft">Centro de accesibilidad</span>
      </span>
    </a>
  );
}

/** Estructura con landmarks: header, nav (barra lateral), main y footer. */
export function AppShell({ route, children }: { route: RouteId; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstRender = useRef(true);

  // Título de la pestaña por sección y foco en el h1 al navegar (WCAG 2.4.2 y 2.4.3).
  useEffect(() => {
    document.title = `${routeInfo(route).label} · Navi`;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    document.getElementById('view-title')?.focus();
  }, [route]);

  // El menú móvil se cierra con Esc y devuelve el foco al botón que lo abrió.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 64rem)');
    const onResize = () => desktop.matches && setMenuOpen(false);
    window.addEventListener('keydown', onKeyDown);
    desktop.addEventListener('change', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onResize);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh">
      <SkipLink />
      <header className="sticky top-0 z-20 border-b border-line-soft bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Brand />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-secciones"
            className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-brand px-4 font-bold text-brand hover:bg-brand-soft lg:hidden"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            {menuOpen ? 'Cerrar menú' : 'Menú'}
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 sm:px-6">
        <aside
          id="menu-secciones"
          aria-label="Menú de secciones"
          className={`${
            menuOpen ? 'fixed inset-x-0 top-[4.6rem] bottom-0 z-30 block overflow-y-auto bg-canvas p-4' : 'hidden'
          } lg:sticky lg:top-24 lg:block lg:h-[calc(100dvh-7rem)] lg:w-72 lg:shrink-0 lg:bg-transparent lg:p-0 lg:pt-6`}
        >
          <Sidebar current={route} onNavigate={() => setMenuOpen(false)} />
        </aside>

        <div className="min-w-0 flex-1" inert={menuOpen}>
          <main id="contenido" tabIndex={-1} className="grid gap-6 pt-6 pb-12 outline-none sm:pt-8">
            {children}
          </main>
          <footer className="border-t border-line-soft py-6 pb-28 text-ink-soft">
            <p>Navi · Proyecto del curso Interacción Humano-Computador, UTP. Diseñado siguiendo WCAG 2.2 AA.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
