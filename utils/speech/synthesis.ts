export interface SpeakOptions { rate?: number; volume?: number; lang?: string; onEnd?: () => void; }

const MAX_CHUNK = 180;

/** Las voces de Chrome cortan los textos largos (~15 s), así que se leen por frases. */
export function splitIntoChunks(text: string): string[] {
  // Solo se corta en puntuación seguida de espacio, para no partir números como 17.5.
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences.map((item) => item.trim()).filter(Boolean)) {
    if (current && (current + ' ' + sentence).length > MAX_CHUNK) {
      chunks.push(current);
      current = '';
    }
    if (sentence.length > MAX_CHUNK) {
      sentence.split(/(?<=[,;:])\s+/).forEach((part) => {
        if (current && (current + ' ' + part).length > MAX_CHUNK) { chunks.push(current); current = part; }
        else current = current ? `${current} ${part}` : part;
      });
    } else current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) chunks.push(current);
  return chunks;
}

let session = 0;

export function speak(text: string, options: SpeakOptions = {}): void {
  if (!('speechSynthesis' in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  const current = ++session;
  const chunks = splitIntoChunks(text);
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = options.lang ?? 'es-PE';
    utterance.rate = options.rate ?? 1;
    utterance.volume = options.volume ?? 1;
    // Al cancelar una lectura (o iniciar otra) no se debe avisar que terminó la anterior.
    const finish = () => { if (current === session && index === chunks.length - 1) options.onEnd?.(); };
    utterance.onend = finish;
    utterance.onerror = (event) => { if (event.error !== 'canceled' && event.error !== 'interrupted') finish(); };
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  session += 1;
  window.speechSynthesis?.cancel();
}

export function speakWithPreferences(text: string, preferences: { speechRate: number; volume: number; language: string }, onEnd?: () => void): void {
  speak(text, { rate: preferences.speechRate, volume: preferences.volume, lang: preferences.language, onEnd });
}
