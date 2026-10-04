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

export const voiceCommandGuide: { command: Exclude<VoiceCommand, 'unknown'>; phrase: string; description: string }[] = [
  { command: 'read', phrase: 'Leer página', description: 'Lee en voz alta el contenido principal.' },
  { command: 'stop', phrase: 'Detener', description: 'Detiene la lectura.' },
  { command: 'summary', phrase: '¿Dónde estoy?', description: 'Te dice el título y cuántas secciones tiene la página.' },
  { command: 'navigate', phrase: 'Ir a tareas', description: 'Abre la sección indicada: cursos, tareas, notas o anuncios.' },
  { command: 'increaseText', phrase: 'Aumentar letra', description: 'Agranda el tamaño del texto.' },
  { command: 'contrast', phrase: 'Alto contraste', description: 'Activa o desactiva el alto contraste.' },
  { command: 'simplified', phrase: 'Modo simplificado', description: 'Muestra solo lo esencial de la página.' },
];

export function describeCommand(command: VoiceCommand): string {
  return voiceCommandGuide.find((item) => item.command === command)?.description ?? 'No reconocí ese comando.';
}
