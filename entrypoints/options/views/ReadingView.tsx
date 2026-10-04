import { AudioLines, BookOpenText, Contrast, Type } from 'lucide-react';
import { fontSizeLabels } from '@/utils/profiles';
import { Card, FontSizePicker, ListenButton, RangeField, Switch, ViewHeader, formatPercent, formatRate } from '../components/ui';
import { useNavi } from '../state';

const sampleText =
  'Semana 5: Interacción Humano-Computador. Recuerda entregar la tarea de prototipos antes del viernes a las 11:59 p. m.';

export function ReadingView() {
  const { preferences, updatePreferences } = useNavi();
  return (
    <>
      <ViewHeader
        icon={BookOpenText}
        title="Lectura de información"
        intro="Ajusta cómo ves y cómo escuchas el contenido de tus cursos. Mira el ejemplo para comprobar el resultado."
      />

      <section aria-labelledby="preview-title" className="rounded-3xl border-2 border-dashed border-line bg-surface p-6">
        <h2 id="preview-title" className="text-sm font-bold tracking-wide text-ink-soft uppercase">
          Vista previa
        </h2>
        <p className="mt-2 text-xl">{sampleText}</p>
        <div className="mt-4">
          <ListenButton text={sampleText} label="Escuchar el ejemplo" variant="primary" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Texto ampliable" icon={Type} description="Toda la página crece, sin cortar ni esconder nada.">
          <FontSizePicker
            value={preferences.fontSize}
            onChange={(fontSize) => void updatePreferences({ fontSize }, `Tamaño de letra: ${fontSizeLabels[fontSize].toLowerCase()}.`)}
          />
        </Card>

        <Card title="Contraste" icon={Contrast} description="Texto blanco y amarillo sobre fondo negro, para leer con menos esfuerzo.">
          <Switch
            label="Alto contraste"
            description="También se aplica en UTP Class."
            checked={preferences.highContrast}
            onChange={(highContrast) => void updatePreferences({ highContrast }, highContrast ? 'Alto contraste activado.' : 'Alto contraste desactivado.')}
          />
        </Card>
      </div>

      <Card title="Escuchar contenido" icon={AudioLines} description="Así sonará Navi cuando pulses 'Escuchar contenido' en el panel lateral de UTP Class.">
        <div className="grid gap-6 md:grid-cols-2">
          <RangeField
            label="Velocidad de lectura"
            value={preferences.speechRate}
            min={0.6}
            max={1.4}
            step={0.1}
            format={formatRate}
            minHint="Más lenta"
            maxHint="Más rápida"
            onChange={(speechRate) => void updatePreferences({ speechRate })}
          />
          <RangeField
            label="Volumen"
            value={preferences.volume}
            min={0.2}
            max={1}
            step={0.1}
            format={formatPercent}
            minHint="Bajo"
            maxHint="Alto"
            onChange={(volume) => void updatePreferences({ volume })}
          />
        </div>
        <div className="mt-5">
          <ListenButton text="Hola. Así es como leeré el contenido de tus cursos." label="Probar la voz" />
        </div>
      </Card>
    </>
  );
}
