// Modelo del calendario de UTP Class (/student/calendar, FullCalendar). Sin dependencias del DOM: se prueba con Node.

export interface CalendarEvent {
  kind: 'clase' | 'actividad' | 'ciclo';
  lines: string[];
}

export interface CalendarDay {
  /** YYYY-MM-DD, o null para la fila "Todo el ciclo". */
  date: string | null;
  events: CalendarEvent[];
}

export interface CalendarWeek {
  number?: string;
  range?: string;
  days: CalendarDay[];
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const KIND_LABEL: Record<CalendarEvent['kind'], string> = { clase: 'Clase', actividad: 'Actividad', ciclo: 'Todo el ciclo' };

export const isCalendarPath = (pathname: string): boolean => /^\/student\/calendar(\/|$)/.test(pathname);

/** "2026-10-05" → "lunes 5 de octubre". */
export function dayLabel(iso: string | null): string {
  if (!iso) return 'Todo el ciclo';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} de ${MONTH_NAMES[date.getUTCMonth()]}`;
}

export const isoDate = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Quita espacios repetidos, duplicados y líneas que ya están dentro de otra más larga (un <span> dentro de un <p>). */
export function tidyLines(lines: string[]): string[] {
  const cleaned = Array.from(new Set(lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)));
  return cleaned.filter((line) => !cleaned.some((other) => other.length > line.length && other.includes(line)));
}

const eventText = (event: CalendarEvent): string => `${KIND_LABEL[event.kind]}: ${event.lines.join('. ')}`;

export const calendarTitle = (week: CalendarWeek): string =>
  ['Calendario', week.number ? `semana ${week.number}` : '', week.range ?? ''].filter(Boolean).join(', ');

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function dayCounts(events: CalendarEvent[]): string {
  if (!events.length) return 'sin clases ni actividades';
  const classes = events.filter((event) => event.kind === 'clase').length;
  const rest = events.length - classes;
  return [classes ? count(classes, 'clase', 'clases') : '', rest ? count(rest, 'actividad o aviso', 'actividades o avisos') : ''].filter(Boolean).join(' y ');
}

/** Respuesta a "¿qué tengo hoy?": detalle de cada evento del día, más lo que dura todo el ciclo. */
export function describeToday(week: CalendarWeek, today: string): string {
  const day = week.days.find((item) => item.date === today);
  if (!day) return 'Hoy no está en la semana que se ve. Di “hoy” para volver a la semana actual.';
  if (!day.events.length) return `Hoy, ${dayLabel(today)}, no tienes clases ni actividades.`;
  return `Hoy, ${dayLabel(today)}, tienes ${dayCounts(day.events)}. ${day.events.map(eventText).join('. ')}.`;
}

/** Resumen de la semana visible: encabezado y cuántas cosas hay cada día. */
export function describeWeek(week: CalendarWeek): string {
  const header = [week.number ? `Semana ${week.number}` : 'Semana', week.range ?? ''].filter(Boolean).join(', ');
  const days = week.days.filter((day) => day.date && day.events.length).map((day) => `${dayLabel(day.date)}: ${dayCounts(day.events)}`);
  const cycle = week.days.find((day) => !day.date)?.events.length ?? 0;
  const parts = [`${header}.`, days.length ? `${days.join('. ')}.` : 'No hay clases ni actividades esta semana.'];
  if (cycle) parts.push(`Además, ${count(cycle, 'aviso dura', 'avisos duran')} todo el ciclo.`);
  return parts.join(' ');
}

export interface CalendarReadingItem {
  kind: 'heading' | 'block';
  text: string;
  dayIndex: number;
  /** Posición del evento dentro del día; undefined en títulos y en el aviso de "sin eventos". */
  eventIndex?: number;
}

/** Texto de lectura guiada: un título por día y un bloque por evento. */
export function calendarReadingItems(week: CalendarWeek): CalendarReadingItem[] {
  const items: CalendarReadingItem[] = [];
  week.days.forEach((day, dayIndex) => {
    if (!day.date && !day.events.length) return;
    items.push({ kind: 'heading', text: dayLabel(day.date), dayIndex });
    if (!day.events.length) items.push({ kind: 'block', text: 'Sin clases ni actividades.', dayIndex });
    day.events.forEach((event, eventIndex) => items.push({ kind: 'block', text: eventText(event), dayIndex, eventIndex }));
  });
  return items;
}
