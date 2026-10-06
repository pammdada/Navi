const UTP_HOST = 'class.utp.edu.pe';
const UTP_ORIGIN = `https://${UTP_HOST}`;

export type SafeRouteId =
  | 'courses'
  | 'chat'
  | 'calendar'
  | 'help'
  | 'tasks'
  | 'evaluations'
  | 'forums'
  | 'grades'
  | 'announcements'
  | 'syllabus';

export interface SafeRoute {
  id: SafeRouteId;
  label: string;
  /** 'global' = ruta fija del menú lateral; 'course' = pestaña del curso que el estudiante tiene abierto. */
  scope: 'global' | 'course';
  /** Global: ruta dentro de /student. Curso: último segmento de /student/courses/:curso/section/:sección/<slug>. */
  path: string;
}

/**
 * Únicos destinos a los que Navi puede llevar al usuario (mapa del DOM real de UTP Class, relevado el 2026-10-05).
 * Nunca se hace clic en elementos encontrados en la página ni se aceptan URLs escritas por el usuario.
 */
export const safeRoutes: Record<SafeRouteId, SafeRoute> = {
  courses: { id: 'courses', label: 'Cursos', scope: 'global', path: '/student/courses' },
  chat: { id: 'chat', label: 'Chat', scope: 'global', path: '/student/messages' },
  calendar: { id: 'calendar', label: 'Calendario', scope: 'global', path: '/student/calendar' },
  help: { id: 'help', label: 'Ayuda', scope: 'global', path: '/student/help' },
  tasks: { id: 'tasks', label: 'Tareas', scope: 'course', path: 'listHomework' },
  evaluations: { id: 'evaluations', label: 'Evaluaciones', scope: 'course', path: 'listEvaluation' },
  forums: { id: 'forums', label: 'Foros', scope: 'course', path: 'listForum' },
  grades: { id: 'grades', label: 'Notas', scope: 'course', path: 'calification' },
  announcements: { id: 'announcements', label: 'Anuncios', scope: 'course', path: 'announcements' },
  syllabus: { id: 'syllabus', label: 'Sílabo', scope: 'course', path: 'syllabus' },
};

export const NEEDS_COURSE_MESSAGE = 'Abre primero uno de tus cursos en UTP Class para ir a esa sección.';

const COURSE_PATH = /^\/student\/courses\/([A-Za-z0-9_-]+)\/section\/([A-Za-z0-9_-]+)(?:\/|$)/;

/** Identifica el curso abierto a partir de la dirección de la pestaña. null si no es una página de un curso de UTP Class. */
export function parseCourseUrl(currentUrl: string | undefined): { courseId: string; sectionId: string } | null {
  if (!currentUrl) return null;
  try {
    const url = new URL(currentUrl);
    if (url.origin !== UTP_ORIGIN) return null;
    const match = COURSE_PATH.exec(url.pathname);
    return match ? { courseId: match[1]!, sectionId: match[2]! } : null;
  } catch {
    return null;
  }
}

/** true si la dirección pertenece a UTP Class (class.utp.edu.pe). */
export function isUtpUrl(url: string | undefined): boolean {
  try {
    return Boolean(url) && new URL(url!).origin === UTP_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Devuelve la URL fija del destino. Las pestañas de curso se arman con los identificadores del curso abierto
 * (currentUrl); fuera de un curso devuelven null.
 */
export function resolveSafeUrl(id: SafeRouteId, currentUrl?: string): string | null {
  const route = safeRoutes[id];
  if (route.scope === 'global') return `${UTP_ORIGIN}${route.path}`;
  const course = parseCourseUrl(currentUrl);
  return course ? `${UTP_ORIGIN}/student/courses/${course.courseId}/section/${course.sectionId}/${route.path}` : null;
}
