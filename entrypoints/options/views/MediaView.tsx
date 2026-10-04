import { Captions, Info } from 'lucide-react';
import { Card, Switch, ViewHeader } from '../components/ui';
import { useNavi } from '../state';

export function MediaView() {
  const { preferences, updatePreferences } = useNavi();
  return (
    <>
      <ViewHeader
        icon={Captions}
        title="Subtítulos y multimedia"
        intro="Lee lo que se dice en los videos de tus clases. Navi activa los subtítulos disponibles en cada video de UTP Class."
      />

      <Card title="Subtítulos automáticos" icon={Captions}>
        <Switch
          label="Activar subtítulos"
          description="Se encienden solos cada vez que abres un video."
          checked={preferences.captionsEnabled}
          onChange={(captionsEnabled) => void updatePreferences({ captionsEnabled }, captionsEnabled ? 'Subtítulos activados.' : 'Subtítulos desactivados.')}
        />

        <figure className="mt-6 overflow-hidden rounded-2xl border border-line-soft" aria-label="Ejemplo de un video con subtítulos">
          <div className="relative grid aspect-video place-items-center bg-[#0f1b33] text-white">
            <span className="text-lg opacity-70" aria-hidden="true">
              ▶ Clase grabada · Semana 5
            </span>
            {preferences.captionsEnabled && (
              <span className="absolute inset-x-4 bottom-4 mx-auto w-fit max-w-full rounded-lg bg-black px-4 py-2 text-center text-xl font-bold text-white">
                "Hoy veremos las heurísticas de Nielsen."
              </span>
            )}
          </div>
          <figcaption className="bg-tint p-3 text-ink-soft">
            {preferences.captionsEnabled ? 'Así verás los subtítulos en tus videos.' : 'Activa los subtítulos para ver el ejemplo.'}
          </figcaption>
        </figure>
      </Card>

      <Card title="Cómo funcionan" icon={Info}>
        <ul className="grid list-disc gap-2 pl-6 text-lg">
          <li>Navi busca los subtítulos que trae cada video y los enciende por ti.</li>
          <li>Si un video no tiene subtítulos, Navi te lo avisará en el panel lateral.</li>
          <li>Los mensajes de Navi siempre aparecen también como texto, nunca solo como sonido.</li>
        </ul>
      </Card>
    </>
  );
}
