export function TextReader({ onRead, onStop }: { onRead: () => void; onStop: () => void }) {
  return <section className="navi-card" aria-labelledby="reader-title"><h2 id="reader-title">Lectura de información</h2><p>Navi lee el contenido principal de la página actual.</p><div className="navi-inline-actions"><button type="button" onClick={onRead}>Escuchar</button><button type="button" className="secondary" onClick={onStop}>Detener</button></div></section>;
}
