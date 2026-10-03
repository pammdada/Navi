export type RecognitionStatus = 'unsupported' | 'listening' | 'result' | 'error' | 'stopped';
type RecognitionConstructor = new () => {
  lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
};
const getRecognitionConstructor = (): RecognitionConstructor | undefined =>
  (window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition;

export function isSpeechRecognitionSupported(): boolean { return Boolean(getRecognitionConstructor()); }
export function startSpeechRecognition(onTranscript: (transcript: string) => void, onStatus: (status: RecognitionStatus, detail?: string) => void): () => void {
  const Recognition = getRecognitionConstructor();
  if (!Recognition) { onStatus('unsupported', 'El navegador no ofrece reconocimiento de voz.'); return () => undefined; }
  const recognition = new Recognition();
  recognition.lang = 'es-PE'; recognition.continuous = false; recognition.interimResults = false;
  recognition.onstart = () => onStatus('listening');
  recognition.onend = () => onStatus('stopped');
  recognition.onerror = (event) => onStatus('error', event.error);
  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1]?.[0]?.transcript?.trim();
    if (transcript) { onStatus('result', transcript); onTranscript(transcript); }
  };
  recognition.start();
  return () => recognition.stop();
}
