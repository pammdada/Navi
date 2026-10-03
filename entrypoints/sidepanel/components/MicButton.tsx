interface MicButtonProps { listening: boolean; disabled?: boolean; onClick: () => void; }
export function MicButton({ listening, disabled, onClick }: MicButtonProps) {
  return <button className={`navi-mic ${listening ? 'is-listening' : ''}`} type="button" onClick={onClick} disabled={disabled} aria-pressed={listening}><span aria-hidden="true">{listening ? '◉' : '🎙'}</span> {listening ? 'Escuchando…' : 'Hablar con Navi'}</button>;
}
