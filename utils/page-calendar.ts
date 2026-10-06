import { describeToday, describeWeek, isCalendarPath, isoDate, tidyLines, type CalendarDay, type CalendarEvent, type CalendarWeek } from './calendar';
import { clean } from './dom-analyzer';
import type { CalendarOp } from './speech/actions';

// Selectores del calendario real de UTP Class (FullCalendar, relevado el 2026-10-05). No se usan clases sc-*/css-*.
const CONTAINER = '[data-testid="calendar-container-div"]';
const DAY_HEADER = '.fc-col-header-cell[data-date]';
const EVENT = 'a.fc-event';

export interface ScrapedCalendar {
  week: CalendarWeek;
  /** Elementos de la página para resaltar al leer: encabezado de cada día y sus eventos, en el orden de week.days. */
  elements: { days: (Element | null)[]; events: Element[][] };
}

const isCalendarPage = (): boolean => isCalendarPath(location.pathname) && document.querySelector(CONTAINER) !== null;

const paragraphs = () => Array.from(document.querySelectorAll<HTMLElement>('#root p'));

function eventKind(event: Element): CalendarEvent['kind'] {
  const id = event.querySelector('[data-testid]')?.getAttribute('data-testid') ?? '';
  if (id.includes('multiple')) return 'ciclo';
  return id.includes('activity') ? 'actividad' : 'clase';
}

/** Lee la semana que se ve en pantalla. null si no es la página del calendario o aún no se dibujó. */
export function scrapeCalendar(): ScrapedCalendar | null {
  if (!isCalendarPage()) return null;
  const headers = Array.from(document.querySelectorAll<HTMLElement>(DAY_HEADER));
  if (!headers.length) return null;

  const days: CalendarDay[] = headers.map((header) => ({ date: header.dataset.date ?? null, events: [] }));
  const elements: ScrapedCalendar['elements'] = { days: headers.slice(), events: headers.map(() => []) };
  const cycle: CalendarDay = { date: null, events: [] };
  const cycleElements: Element[] = [];

  for (const event of Array.from(document.querySelectorAll<HTMLElement>(EVENT))) {
    const lines = tidyLines(Array.from(event.querySelectorAll('p, span')).map((node) => clean(node.textContent)));
    if (!lines.length) continue;
    const item: CalendarEvent = { kind: eventKind(event), lines };
    const date = event.closest<HTMLElement>('[data-date]')?.dataset.date;
    const index = date ? days.findIndex((day) => day.date === date) : -1;
    if (index >= 0) {
      days[index]!.events.push(item);
      elements.events[index]!.push(event);
    } else {
      cycle.events.push(item);
      cycleElements.push(event);
    }
  }
  if (cycle.events.length) {
    days.push(cycle);
    elements.days.push(null);
    elements.events.push(cycleElements);
  }

  const paragraph = (pattern: RegExp) => paragraphs().find((p) => pattern.test(clean(p.textContent)));
  return {
    week: {
      number: clean(paragraph(/^Semana actual/)?.textContent).match(/\d+/)?.[0],
      range: clean(paragraph(/^Del \d/)?.textContent) || undefined,
      days,
    },
    elements,
  };
}

export type CalendarMove = 'previous' | 'next' | 'today';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function navButton(move: CalendarMove): HTMLElement | undefined {
  const today = Array.from(document.querySelectorAll<HTMLElement>('#root button')).find((button) => clean(button.textContent) === 'Hoy');
  if (move === 'today') return today;
  // Anterior y siguiente son botones de solo ícono, sin nombre, junto a "Hoy" (en ese orden).
  const group = today?.closest('cc-button')?.parentElement?.parentElement;
  const arrows = group ? Array.from(group.querySelectorAll<HTMLElement>('button.button--iconOnly')) : [];
  return arrows[move === 'previous' ? 0 : 1];
}

/**
 * Cambia la semana que se ve (anterior, siguiente u hoy). Solo pulsa los botones de navegación del propio calendario:
 * no abre eventos ni actividades. Devuelve null si el calendario no está disponible.
 */
async function moveCalendar(move: CalendarMove): Promise<CalendarWeek | null> {
  if (!isCalendarPage()) return null;
  const button = navButton(move);
  if (!button) return null;
  button.click();
  await wait(500);
  return scrapeCalendar()?.week ?? null;
}

const todayIso = (): string => document.querySelector<HTMLElement>('.fc-day-today')?.dataset.date ?? isoDate();

const CALENDAR_UNAVAILABLE = 'Abre tu horario en UTP Class (botón “Ver horario”) para usar los comandos del calendario.';

/** Responde un comando de voz del calendario con una frase corta para mostrar y leer en voz alta. */
export async function runCalendarOp(op: CalendarOp): Promise<string> {
  if (!isCalendarPage()) return CALENDAR_UNAVAILABLE;
  if (op === 'previous' || op === 'next' || op === 'current') {
    const week = await moveCalendar(op === 'current' ? 'today' : op);
    if (!week) return 'No pude cambiar de semana. Usa los botones del calendario.';
    return `${op === 'previous' ? 'Semana anterior' : op === 'next' ? 'Semana siguiente' : 'Semana actual'}. ${describeWeek(week)}`;
  }
  const calendar = scrapeCalendar();
  if (!calendar) return 'El calendario todavía se está cargando. Inténtalo de nuevo.';
  return op === 'today' ? describeToday(calendar.week, todayIso()) : describeWeek(calendar.week);
}
