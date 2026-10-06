export type StatusKind = 'done' | 'pending' | 'late';

export const statusMeta: Record<StatusKind, { icon: string; label: string; word: RegExp }> = {
  done: { icon: '✔', label: 'Completada', word: /complet|entregad|aprobad|finalizad|realizad|correct|[eé]xito/i },
  pending: { icon: '◔', label: 'Pendiente', word: /pendient|en curso|por (hacer|entregar|realizar)|progreso|aviso|atenci[oó]n/i },
  late: { icon: '⚠', label: 'Vencida', word: /vencid|atrasad|retras|error|desaprobad|fall|incorrect|peligro/i },
};

/** Decide qué estado representa un elemento a partir de su texto y sus clases CSS. null si no parece un estado. */
export function classifyStatus(text: string, classNames: string, role?: string | null): StatusKind | null {
  const haystack = `${text} ${classNames}`;
  if (statusMeta.late.word.test(haystack) || /overdue|\blate\b|danger/i.test(classNames)) return 'late';
  if (statusMeta.done.word.test(haystack) || /\bdone\b|success|complete/i.test(classNames)) return 'done';
  if (statusMeta.pending.word.test(haystack) || /pending|warning|progress/i.test(classNames) || role === 'alert') return 'pending';
  return null;
}

/** Si el texto del estado ya lo dice con palabras, no hace falta agregar una etiqueta; si no (solo color o ícono), sí. */
export const needsLabel = (kind: StatusKind, text: string): boolean => !statusMeta[kind].word.test(text);
