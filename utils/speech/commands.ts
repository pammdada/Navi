export type VoiceCommand = 'read' | 'stop' | 'contrast' | 'simplified' | 'increaseText' | 'navigate' | 'summary' | 'unknown';
export function identifyCommand(transcript: string): VoiceCommand {
  const text = transcript.toLocaleLowerCase('es');
  if (/(leer|escuchar).*(página|pagina|contenido)|^leer$/.test(text)) return 'read';
  if (/(detener|parar|silencio)/.test(text)) return 'stop';
  if (/(alto contraste|contraste)/.test(text)) return 'contrast';
  if (/(modo simple|modo simplificado)/.test(text)) return 'simplified';
  if (/(aumentar|agrandar).*(letra|texto)/.test(text)) return 'increaseText';
  if (/(ir a|abrir).*(curso|tarea|calificacion|nota|anuncio)/.test(text)) return 'navigate';
  if (/(qué hay|que hay|resumen|dónde estoy|donde estoy)/.test(text)) return 'summary';
  return 'unknown';
}
