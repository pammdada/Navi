// Modelo de lectura: sin dependencias del DOM, así se usa igual en la página, en el panel y en las pruebas.

export type ReadingUnitType = 'heading' | 'paragraph' | 'link' | 'task' | 'date';

export interface ReadingUnit {
  id: string;
  type: ReadingUnitType;
  text: string;
  /** Valor de data-navi-reading-id en el elemento de UTP Class que se resalta al leer. */
  elementId: string;
}

export interface ReadingSection {
  id: string;
  title: string;
  unitIds: string[];
}

export interface ReadingPlan {
  title: string;
  /** true si la página parece ser una lista de cursos (para etiquetar el resumen). */
  isCourseArea: boolean;
  units: ReadingUnit[];
  sections: ReadingSection[];
}

const MONTHS = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre';
const DATE_PATTERN = new RegExp(
  `\\b\\d{1,2}\\s?[/-]\\s?\\d{1,2}(\\s?[/-]\\s?\\d{2,4})?\\b|\\b\\d{1,2} de (${MONTHS})\\b|\\b\\d{1,2}:\\d{2}\\b|\\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\\b|\\b(vence|vencimiento|plazo|fecha l[ií]mite|hasta el)\\b`,
  'i',
);
// La palabra debe abrir el texto ("Tarea 2: …", "Foro de la semana 5"): así "La fecha de entrega vence…" cuenta como fecha, no como actividad.
const TASK_PATTERN = /^[\s\-•·\d.)]*(tarea|actividad|entregable|entrega|pr[aá]ctica|evaluaci[oó]n|examen|cuestionario|trabajo|foro|laboratorio)\b/i;
const CHROME_PATTERN = /^(ver m[aá]s|m[aá]s|men[uú]|cerrar|volver|siguiente|anterior|ir|buscar|aceptar|cancelar|expandir|contraer)$/i;

export const hasDate = (text: string): boolean => DATE_PATTERN.test(text);
export const isChromeText = (text: string): boolean => CHROME_PATTERN.test(text.trim());

export function classifyText(text: string, tag: 'heading' | 'link' | 'block'): ReadingUnitType {
  if (tag === 'heading') return 'heading';
  if (tag === 'link') return 'link';
  if (TASK_PATTERN.test(text)) return 'task';
  if (hasDate(text) && text.length <= 160) return 'date';
  return 'paragraph';
}

const shorten = (text: string, max = 80) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Cada encabezado inicia una sección; lo que está antes del primer encabezado forma una sección con el título de la página. */
export function buildSections(title: string, units: ReadingUnit[]): ReadingSection[] {
  const sections: ReadingSection[] = [];
  for (const unit of units) {
    if (unit.type === 'heading') {
      sections.push({ id: `s${sections.length + 1}`, title: shorten(unit.text), unitIds: [unit.id] });
    } else {
      if (!sections.length) sections.push({ id: 's1', title: shorten(title), unitIds: [] });
      sections[sections.length - 1]!.unitIds.push(unit.id);
    }
  }
  return sections;
}

export function createReadingPlan(title: string, isCourseArea: boolean, units: ReadingUnit[]): ReadingPlan {
  return { title, isCourseArea, units, sections: buildSections(title, units) };
}

// ---- Resumen local (sin IA, sin enviar nada fuera del navegador) ----

export interface LocalPageSummary {
  kind: 'Curso' | 'Página';
  title: string;
  sections: number;
  tasks: number;
  dates: number;
  links: number;
  highlights: string[];
}

export function createLocalSummary(plan: ReadingPlan): LocalPageSummary {
  const text = (type: ReadingUnitType) => plan.units.filter((unit) => unit.type === type);
  return {
    kind: plan.isCourseArea ? 'Curso' : 'Página',
    title: plan.title,
    sections: plan.sections.length,
    tasks: text('task').length,
    dates: plan.units.filter((unit) => unit.type !== 'heading' && hasDate(unit.text)).length,
    links: text('link').length,
    highlights: plan.sections.slice(0, 4).map((section) => section.title),
  };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function summaryToSpeech(summary: LocalPageSummary): string {
  const parts = [
    `${summary.kind}: ${summary.title}.`,
    `${plural(summary.sections, 'sección', 'secciones')}.`,
    summary.tasks ? `${plural(summary.tasks, 'actividad detectada', 'actividades detectadas')}.` : 'No detecté actividades.',
    summary.dates ? `${plural(summary.dates, 'fecha encontrada', 'fechas encontradas')}.` : '',
    summary.links ? `${plural(summary.links, 'enlace importante', 'enlaces importantes')}.` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

export const MAX_UNITS = 150;
