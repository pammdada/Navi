import type { ReadingPlan } from './reading-plan.ts';

/**
 * Resumen con IA (opcional, desactivado por defecto).
 *  - La extensión NO contiene ninguna clave de IA: habla con un servidor propio que la guarda (ver docs/ai-summary-backend.md).
 *  - Solo se envía lo que el usuario vio en una vista previa y aceptó enviar.
 *  - La respuesta se valida como JSON estructurado y se muestra solo como texto: la IA no ejecuta acciones en UTP Class.
 */
export interface AiPayload {
  title: string;
  sections: { title: string; text: string }[];
}

export interface AiSummaryResult {
  summary: string;
  keyPoints: string[];
  dates: string[];
  suggestedActions: string[];
}

export const MAX_PAYLOAD_CHARS = 6000;
const MAX_RESPONSE_CHARS = 20000;
const TIMEOUT_MS = 25000;

/** Arma el contenido que se enviaría: títulos y texto de las secciones, recortado a un máximo. */
export function buildAiPayload(plan: ReadingPlan): AiPayload {
  const units = new Map(plan.units.map((unit) => [unit.id, unit]));
  let budget = MAX_PAYLOAD_CHARS;
  const sections: AiPayload['sections'] = [];
  for (const section of plan.sections) {
    if (budget <= 0) break;
    const text = section.unitIds
      .map((id) => units.get(id))
      .filter((unit) => unit && unit.type !== 'heading')
      .map((unit) => unit!.text)
      .join('\n')
      .slice(0, budget);
    budget -= text.length + section.title.length;
    if (text) sections.push({ title: section.title, text });
  }
  return { title: plan.title, sections };
}

export const payloadToPreview = (payload: AiPayload): string =>
  [payload.title, ...payload.sections.map((section) => (section.title === payload.title ? `\n${section.text}` : `\n${section.title}\n${section.text}`))].join('\n').trim();

/** HTTPS obligatorio; solo se permite HTTP sin cifrar hacia el propio equipo (para desarrollo). Devuelve un mensaje de error o null. */
export function validateEndpoint(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return 'Escribe una dirección completa, por ejemplo https://mi-servidor.example/resumen.';
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return 'La dirección debe empezar con https://';
  if (url.username || url.password) return 'La dirección no debe incluir usuario ni contraseña (no pongas claves aquí).';
  if (url.search) return 'La dirección no debe incluir parámetros (?clave=...). Las claves van en tu servidor.';
  return null;
}

const asText = (value: unknown, max: number): string | null => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);
const asList = (value: unknown, max: number, items: number): string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? (value as string[]).map((item) => item.trim().slice(0, max)).filter(Boolean).slice(0, items) : null;

/** Acepta únicamente el formato esperado; cualquier otra cosa (campos extra, tipos distintos) se rechaza o se ignora. */
export function parseAiResponse(data: unknown): AiSummaryResult | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const summary = asText(record.summary, 1200);
  const keyPoints = asList(record.keyPoints, 240, 8);
  const dates = asList(record.dates ?? [], 120, 10);
  const suggestedActions = asList(record.suggestedActions ?? [], 200, 6);
  if (!summary || !keyPoints || !dates || !suggestedActions) return null;
  return { summary, keyPoints, dates, suggestedActions };
}

export class AiSummaryError extends Error {}

export async function requestAiSummary(endpoint: string, payload: AiPayload, fetchImpl: typeof fetch = fetch): Promise<AiSummaryResult> {
  const invalid = validateEndpoint(endpoint);
  if (invalid) throw new AiSummaryError(invalid);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(endpoint.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) throw new AiSummaryError(`El servidor respondió con un error (${response.status}).`);
    const raw = await response.text();
    if (raw.length > MAX_RESPONSE_CHARS) throw new AiSummaryError('La respuesta del servidor es demasiado grande.');
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new AiSummaryError('El servidor no devolvió un JSON válido.');
    }
    const result = parseAiResponse(json);
    if (!result) throw new AiSummaryError('La respuesta no tiene el formato esperado (summary, keyPoints, dates, suggestedActions).');
    return result;
  } catch (error) {
    if (error instanceof AiSummaryError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new AiSummaryError('El servidor tardó demasiado en responder.');
    throw new AiSummaryError('No pude conectarme con el servidor de resumen. Revisa la dirección y tu conexión.');
  } finally {
    clearTimeout(timer);
  }
}
