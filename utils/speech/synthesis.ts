export interface SpeakOptions { rate?: number; volume?: number; lang?: string; }

export function speak(text: string, options: SpeakOptions = {}): void {
  if (!('speechSynthesis' in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang ?? 'es-PE';
  utterance.rate = options.rate ?? 1;
  utterance.volume = options.volume ?? 1;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void { window.speechSynthesis?.cancel(); }
