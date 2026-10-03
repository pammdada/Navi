import { MicButton } from './MicButton';
export function VoiceAssistant({ listening, supported, onListen }: { listening: boolean; supported: boolean; onListen: () => void }) {
  return <section className="navi-card" aria-labelledby="voice-title"><h2 id="voice-title">Asistente de voz</h2><p>Di: “leer página”, “ir a tareas”, “alto contraste” o “modo simple”.</p><MicButton listening={listening} disabled={!supported} onClick={onListen} />{!supported && <p className="navi-warning">El reconocimiento de voz no está disponible en este navegador.</p>}</section>;
}
