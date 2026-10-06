import { AudioLines, BookOpenText, Contrast, ListOrdered, Type, ZoomIn } from 'lucide-react';
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

      <Card title="Herramientas en UTP Class" icon={ListOrdered} description="Las usas desde el panel lateral de Navi, con el ícono de Navi en la barra del navegador.">
        <ul className="grid gap-3 md:grid-cols-3">
          <li className="rounded-2xl border border-line-soft p-4">
            <p className="flex items-center gap-2 text-lg font-bold"><AudioLines size={22} aria-hidden="true" className="text-brand" /> Leer</p>
            <p className="text-ink-soft">Lee la página sección por sección y resalta lo que lee. Puedes pausar, volver o saltar.</p>
          </li>
          <li className="rounded-2xl border border-line-soft p-4">
            <p className="flex items-center gap-2 text-lg font-bold"><ListOrdered size={22} aria-hidden="true" className="text-brand" /> Guía</p>
            <p className="text-ink-soft">Lee una sección y espera a que pulses Siguiente: ideal para ir a tu ritmo.</p>
          </li>
          <li className="rounded-2xl border border-line-soft p-4">
            <p className="flex items-center gap-2 text-lg font-bold"><ZoomIn size={22} aria-hidden="true" className="text-brand" /> Lupa</p>
            <p className="text-ink-soft">Amplía solo el texto bajo el cursor al 150, 200 o 250 %. Se cierra con Esc.</p>
          </li>
        </ul>
      </Card>

      <Card title="Escuchar contenido" icon={AudioLines} description="Así sonará Navi cuando pulses 'Leer' en el panel lateral de UTP Class.">
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
