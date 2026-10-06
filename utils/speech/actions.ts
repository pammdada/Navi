import type { SafeRouteId } from '../navigation.ts';

// Única fuente de verdad de las acciones que puede ejecutar Navi. El tipo CommandAction, el catálogo de voz,
// los comandos personales y el ejecutor se derivan de estas tablas: agregar una acción es agregar una fila aquí.

interface RouteDefinition {
  route: SafeRouteId;
  phrase: string;
  /** Alternativas (sin tildes) que se aceptan después de "ir a", "abrir" o "ver". */
  words: string;
  message: string;
}

/** Comandos "ir a …": cada uno lleva a una ruta fija de utils/navigation.ts. Las de curso necesitan un curso abierto. */
export const routeActions = {
  'go-courses': { route: 'courses', phrase: 'Ir a cursos', words: 'mis cursos|cursos|curso|courses', message: 'Abriendo tus cursos.' },
  'go-chat': { route: 'chat', phrase: 'Ir al chat', words: 'el chat|chat|mensajes|mis mensajes', message: 'Abriendo el chat.' },
  'go-calendar': { route: 'calendar', phrase: 'Ver horario', words: 'el calendario|calendario|mi horario|horario', message: 'Abriendo tu horario.' },
  'go-help': { route: 'help', phrase: 'Ir a ayuda', words: 'la ayuda|ayuda', message: 'Abriendo la ayuda de UTP Class.' },
  'go-tasks': { route: 'tasks', phrase: 'Ir a tareas', words: 'mis tareas|tareas|tarea|actividades', message: 'Abriendo las tareas del curso.' },
  'go-evaluations': { route: 'evaluations', phrase: 'Ir a evaluaciones', words: 'mis evaluaciones|evaluaciones|examenes', message: 'Abriendo las evaluaciones del curso.' },
  'go-forums': { route: 'forums', phrase: 'Ir a foros', words: 'los foros|foros|foro', message: 'Abriendo los foros del curso.' },
  'go-grades': { route: 'grades', phrase: 'Ir a notas', words: 'mis notas|notas|calificaciones', message: 'Abriendo las notas del curso.' },
  'go-announcements': { route: 'announcements', phrase: 'Ir a anuncios', words: 'los anuncios|anuncios|avisos', message: 'Abriendo los anuncios del curso.' },
  'go-syllabus': { route: 'syllabus', phrase: 'Ir al sílabo', words: 'el silabo|silabo', message: 'Abriendo el sílabo del curso.' },
} satisfies Record<string, RouteDefinition>;

export type RouteAction = keyof typeof routeActions;

export type CalendarOp = 'today' | 'week' | 'previous' | 'next' | 'current';

interface CalendarDefinition {
  op: CalendarOp;
  phrase: string;
  description: string;
  /** Se prueba contra la frase ya normalizada (sin tildes ni signos). */
  pattern: RegExp;
}

/** Comandos del calendario: solo leen la semana o pulsan Anterior/Siguiente/Hoy (ver utils/page-calendar.ts). */
export const calendarActions = {
  'calendar-today': { op: 'today', phrase: '¿Qué tengo hoy?', description: 'Dice tus clases y actividades de hoy (en Ver horario).', pattern: /^(que tengo hoy|que hay hoy|mi dia|agenda de hoy)$/ },
  'calendar-week': { op: 'week', phrase: '¿Qué semana es?', description: 'Dice la semana y lo que tienes cada día.', pattern: /^(que semana es|que tengo esta semana|que tengo en la semana|resumen de la semana)$/ },
  'calendar-previous': { op: 'previous', phrase: 'Semana anterior', description: 'Muestra la semana anterior del horario.', pattern: /^(semana anterior|semana pasada|ir a la semana anterior)$/ },
  'calendar-next': { op: 'next', phrase: 'Semana siguiente', description: 'Muestra la semana siguiente del horario.', pattern: /^(semana siguiente|semana proxima|proxima semana|ir a la semana siguiente)$/ },
  'calendar-current': { op: 'current', phrase: 'Hoy', description: 'Vuelve a la semana actual del horario.', pattern: /^(hoy|ir a hoy|volver a hoy|semana actual)$/ },
} satisfies Record<string, CalendarDefinition>;

export type CalendarAction = keyof typeof calendarActions;

/** Acciones que no navegan: lectura, resumen y ajustes de accesibilidad. */
export const localActions = ['read-page', 'read-summary', 'guided-reading', 'toggle-contrast', 'toggle-simplified', 'increase-font'] as const;

export type CommandAction = (typeof localActions)[number] | RouteAction | CalendarAction;

export const isRouteAction = (action: string): action is RouteAction => Object.hasOwn(routeActions, action);
export const isCalendarAction = (action: string): action is CalendarAction => Object.hasOwn(calendarActions, action);
