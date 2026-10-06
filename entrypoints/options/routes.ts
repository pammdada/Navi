import { useCallback, useEffect, useState } from 'react';
import { BookOpenText, Captions, House, LifeBuoy, Mic, Settings, WandSparkles, type LucideIcon } from 'lucide-react';

export type RouteId = 'inicio' | 'lectura' | 'voz' | 'comandos' | 'multimedia' | 'configuracion' | 'ayuda';

export interface RouteInfo {
  id: RouteId;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const routes: RouteInfo[] = [
  { id: 'inicio', label: 'Inicio', hint: 'Resumen y accesos rápidos', icon: House },
  { id: 'lectura', label: 'Lectura de información', hint: 'Letra, contraste y voz', icon: BookOpenText },
  { id: 'voz', label: 'Asistente de voz', hint: 'Comandos y dictado', icon: Mic },
  { id: 'comandos', label: 'Mis comandos', hint: 'Tus propias frases de voz', icon: WandSparkles },
  { id: 'multimedia', label: 'Subtítulos y multimedia', hint: 'Subtítulos automáticos', icon: Captions },
  { id: 'configuracion', label: 'Configuración', hint: 'Todos los ajustes y tu perfil', icon: Settings },
  { id: 'ayuda', label: 'Ayuda', hint: 'Atajos, guía y preguntas', icon: LifeBuoy },
];

const isRoute = (value: string): value is RouteId => routes.some((route) => route.id === value);

const readHash = (): RouteId => {
  const value = window.location.hash.replace(/^#\/?/, '');
  return isRoute(value) ? value : 'inicio';
};

export const routeInfo = (id: RouteId): RouteInfo => routes.find((route) => route.id === id)!;

/** Navegación por hash (#/voz): permite enlazar a una sección desde el panel lateral y usar Atrás/Adelante. */
export function useHashRoute(): [RouteId, (route: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(readHash);
  useEffect(() => {
    const onChange = () => setRoute(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((next: RouteId) => {
    window.location.hash = `/${next}`;
  }, []);
  return [route, navigate];
}
