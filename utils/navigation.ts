export const UTP_HOST = 'class.utp.edu.pe';
export const UTP_ORIGIN = `https://${UTP_HOST}`;

export type SafeRouteId = 'courses' | 'tasks' | 'grades' | 'announcements';

export interface SafeRoute {
  id: SafeRouteId;
  label: string;
  /** Ruta absoluta dentro de UTP Class. null = todavía no se conoce una ruta confiable. */
  url: string | null;
  /** Solo se habilita cuando la ruta se probó con una sesión real de UTP Class. */
  verified: boolean;
}

/**
 * Únicos destinos a los que Navi puede llevar al usuario. Son rutas fijas: nunca se hace clic en elementos
 * encontrados en la página ni se aceptan URLs escritas por el usuario.
 * Para habilitar "Tareas", "Notas" o "Anuncios": probar la ruta con sesión iniciada, escribirla aquí y poner verified: true.
 */
export const safeRoutes: Record<SafeRouteId, SafeRoute> = {
  courses: { id: 'courses', label: 'Cursos', url: `${UTP_ORIGIN}/student/courses`, verified: true },
  tasks: { id: 'tasks', label: 'Tareas', url: null, verified: false },
  grades: { id: 'grades', label: 'Notas', url: null, verified: false },
  announcements: { id: 'announcements', label: 'Anuncios', url: null, verified: false },
};

export const isRouteEnabled = (id: SafeRouteId): boolean => {
  const route = safeRoutes[id];
  return route.verified && route.url !== null && new URL(route.url).origin === UTP_ORIGIN;
};

/** Devuelve la URL solo si la ruta está verificada y pertenece a UTP Class. */
export function resolveSafeUrl(id: SafeRouteId): string | null {
  return isRouteEnabled(id) ? safeRoutes[id].url : null;
}
