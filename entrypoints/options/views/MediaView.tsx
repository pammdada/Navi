import { Captions, Sparkles } from 'lucide-react';
import { Card, ViewHeader } from '../components/ui';

export function MediaView() {
  return (
    <>
      <ViewHeader icon={Captions} title="Subtítulos y multimedia" intro="Esta función todavía no está disponible." />

      <Card title="Futuros avances" icon={Sparkles}>
        <p className="text-lg">Estamos trabajando en los subtítulos y en otras ayudas para videos. Pronto las verás aquí.</p>
      </Card>
    </>
  );
}
