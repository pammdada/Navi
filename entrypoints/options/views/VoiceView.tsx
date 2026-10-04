import { useEffect, useRef, useState } from 'react';
import { MessageSquareText, Mic, MicOff, Square } from 'lucide-react';
import { describeCommand, identifyCommand, voiceCommandGuide } from '@/utils/speech/commands';
import { isSpeechRecognitionSupported, startSpeechRecognition } from '@/utils/speech/recognition';
import { speakWithPreferences } from '@/utils/speech/synthesis';
import { Card, Switch, ViewHeader } from '../components/ui';
import { useNavi } from '../state';

const errorMessages: Record<string, string> = {
  'not-allowed': 'Navi no tiene permiso para usar el micrófono. Pulsa el candado de la barra de direcciones y permite el micrófono.',
  'no-speech': 'No te escuché. Acércate al micrófono e inténtalo otra vez.',
  'audio-capture': 'No encontré un micrófono. Revisa que esté conectado.',
  network: 'El reconocimiento de voz necesita conexión a internet. Revisa tu conexión.',
};

export function VoiceView() {
  const { preferences, updatePreferences } = useNavi();
  const supported = isSpeechRecognitionSupported();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const stopRef = useRef<() => void>(() => undefined);

  useEffect(() => () => stopRef.current(), []);

  const listen = () => {
    if (listening) {
      stopRef.current();
      return;
    }
    setTranscript('');
    setResponse('Te escucho…');
    stopRef.current = startSpeechRecognition(
      (heard) => {
        const command = identifyCommand(heard);
        const answer = command === 'unknown' ? 'No reconocí ese comando. Prueba con "leer página".' : `Entendido. ${describeCommand(command)}`;
        setTranscript(heard);
        setResponse(answer);
        speakWithPreferences(answer, preferences);
      },
      (status, detail) => {
        setListening(status === 'listening');
        if (status === 'error') setResponse(errorMessages[detail ?? ''] ?? 'No se pudo reconocer la voz. Inténtalo otra vez.');
        if (status === 'stopped') setResponse((current) => (current === 'Te escucho…' ? 'Dejé de escuchar.' : current));
      },
    );
  };

  return (
    <>
      <ViewHeader
        icon={Mic}
        title="Asistente de voz"
        intro="Habla con Navi para moverte por UTP Class sin usar el mouse. Navi te responde en voz alta y también por escrito."
      />

      <Card title="Comandos de voz" icon={Mic}>
        <Switch
          label="Activar comandos de voz"
          description="Necesita permiso del micrófono del navegador."
          checked={preferences.voiceEnabled}
          onChange={(voiceEnabled) => void updatePreferences({ voiceEnabled }, voiceEnabled ? 'Comandos de voz activados.' : 'Comandos de voz desactivados.')}
        />
      </Card>

      <Card title="Prueba tu micrófono" icon={MessageSquareText} description="Pulsa el botón y di un comando. Verás lo que Navi entendió.">
        {supported ? (
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={listen}
              aria-pressed={listening}
              className={`inline-flex min-h-20 cursor-pointer items-center gap-3 rounded-full px-7 text-xl font-bold ${
                listening ? 'animate-listening bg-danger text-surface' : 'bg-brand text-on-brand hover:bg-brand-strong'
              }`}
            >
              {listening ? <Square size={26} fill="currentColor" aria-hidden="true" /> : <Mic size={30} aria-hidden="true" />}
              {listening ? 'Dejar de escuchar' : 'Hablar ahora'}
            </button>
            <div className="min-h-20 flex-1 rounded-2xl bg-tint p-4" aria-live="polite">
              {transcript && (
                <p>
                  <span className="font-bold">Escuché:</span> "{transcript}"
                </p>
              )}
              <p className="text-lg font-bold">{response || 'Aquí verás lo que Navi entendió.'}</p>
            </div>
          </div>
        ) : (
          <p className="flex items-start gap-3 rounded-2xl bg-danger-soft p-4 font-bold text-danger">
            <MicOff size={24} aria-hidden="true" className="shrink-0" />
            Este navegador no permite el reconocimiento de voz. Usa Google Chrome o Microsoft Edge para hablar con Navi.
          </p>
        )}
      </Card>

      <Card title="Lo que puedes decir" description="No necesitas memorizarlos: vuelve a esta lista cuando quieras.">
        <dl className="grid gap-3 md:grid-cols-2">
          {voiceCommandGuide.map(({ phrase, description }) => (
            <div key={phrase} className="rounded-2xl border border-line-soft p-4">
              <dt className="text-lg font-bold">"{phrase}"</dt>
              <dd className="text-ink-soft">{description}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
