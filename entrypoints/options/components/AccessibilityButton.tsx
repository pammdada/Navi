import { useEffect, useRef, useState } from 'react';
import { Accessibility, Captions, Contrast, RotateCcw, Sparkles, Waves, X } from 'lucide-react';
import { useNavi } from '../state';
import { FontSizePicker, ListenButton, Switch, buttonStyles } from './ui';
import { fontSizeLabels } from '@/utils/profiles';

const pageText = () => (document.querySelector('main') as HTMLElement | null)?.innerText ?? '';

/**
 * Botón de accesibilidad fijo y siempre visible (abajo a la derecha, atajo Alt + A).
 * Abre un diálogo modal nativo: atrapa el foco, se cierra con Esc y devuelve el foco al botón.
 */
export function AccessibilityButton() {
  const { preferences, updatePreferences, resetPreferences } = useNavi();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [readText, setReadText] = useState('');

  const show = () => {
    setReadText(pageText());
    dialogRef.current?.showModal();
    setOpen(true);
  };
  const close = () => dialogRef.current?.close();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        if (dialogRef.current?.open) close();
        else show();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Alt+A"
        title="Ajustes de accesibilidad (Alt + A)"
        className="fixed right-4 bottom-4 z-40 inline-flex min-h-16 cursor-pointer items-center gap-3 rounded-full border-4 border-surface bg-brand p-2 text-lg font-bold text-on-brand shadow-xl hover:bg-brand-strong sm:right-6 sm:bottom-6 sm:pr-6 sm:pl-3"
      >
        <span className="grid size-11 place-items-center rounded-full bg-on-brand text-brand" aria-hidden="true">
          <Accessibility size={30} strokeWidth={2.5} />
        </span>
        {/* En pantallas pequeñas queda solo el símbolo universal, para no tapar el contenido. */}
        <span className="sr-only sm:not-sr-only">Accesibilidad</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="a11y-dialog-title"
        aria-describedby="a11y-dialog-description"
        onClose={() => {
          setOpen(false);
          buttonRef.current?.focus();
        }}
        className="m-auto w-[min(34rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] rounded-3xl border-2 border-line-soft bg-surface p-0 text-ink shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line-soft bg-surface p-5 sm:p-6">
          <div>
            <h2 id="a11y-dialog-title" className="flex items-center gap-3 text-2xl font-bold">
              <Accessibility size={28} aria-hidden="true" className="text-brand" />
              Accesibilidad
            </h2>
            <p id="a11y-dialog-description" className="mt-1 text-ink-soft">
              Los cambios se aplican y se guardan al instante.
            </p>
          </div>
          <button type="button" onClick={close} className={`${buttonStyles.ghost} min-w-12 px-3`} aria-label="Cerrar ajustes de accesibilidad">
            <X size={26} aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:p-6">
          <FontSizePicker
            value={preferences.fontSize}
            onChange={(fontSize) => void updatePreferences({ fontSize }, `Tamaño de letra: ${fontSizeLabels[fontSize].toLowerCase()}.`)}
          />
          <Switch
            icon={Contrast}
            label="Alto contraste"
            checked={preferences.highContrast}
            onChange={(highContrast) => void updatePreferences({ highContrast }, highContrast ? 'Alto contraste activado.' : 'Alto contraste desactivado.')}
          />
          <Switch
            icon={Sparkles}
            label="Modo simplificado"
            description="Muestra solo lo esencial."
            checked={preferences.simplifiedMode}
            onChange={(simplifiedMode) => void updatePreferences({ simplifiedMode }, simplifiedMode ? 'Modo simplificado activado.' : 'Modo simplificado desactivado.')}
          />
          <Switch
            icon={Waves}
            label="Reducir movimiento"
            description="Quita animaciones y transiciones."
            checked={preferences.reduceMotion}
            onChange={(reduceMotion) => void updatePreferences({ reduceMotion }, reduceMotion ? 'Movimiento reducido.' : 'Animaciones activadas.')}
          />
          <Switch
            icon={Captions}
            label="Subtítulos automáticos"
            checked={preferences.captionsEnabled}
            onChange={(captionsEnabled) => void updatePreferences({ captionsEnabled }, captionsEnabled ? 'Subtítulos activados.' : 'Subtítulos desactivados.')}
          />
          <div className="flex flex-wrap gap-3 pt-2">
            <ListenButton text={readText} label="Leer esta página" variant="primary" />
            <button type="button" className={buttonStyles.danger} onClick={() => void resetPreferences()}>
              <RotateCcw size={20} aria-hidden="true" />
              Restablecer
            </button>
          </div>
          <a href="#/configuracion" onClick={close} className="font-bold text-brand underline underline-offset-4">
            Ver todos los ajustes
          </a>
        </div>
      </dialog>
    </>
  );
}
