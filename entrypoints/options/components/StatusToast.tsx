import { useEffect, useRef, useState } from 'react';
import { CircleCheck, Undo2, X } from 'lucide-react';
import { useNavi } from '../state';

const VISIBLE_MS = 8000;

/**
 * Aviso de estado ("Guardado · Deshacer"). Una región role="status" separada anuncia solo el mensaje
 * a los lectores de pantalla. El aviso no desaparece mientras el puntero o el foco estén sobre él.
 * En pantallas pequeñas aparece arriba, para no tapar los botones principales de abajo.
 */
export function StatusToast() {
  const { notice, dismissNotice } = useNavi();
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notice || paused) return;
    const timer = window.setTimeout(dismissNotice, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, paused, dismissNotice]);

  return (
    <section aria-label="Avisos de Navi">
      <p role="status" className="sr-only">
        {notice?.message}
      </p>
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-x-3 top-3 z-50 flex justify-center sm:inset-x-auto sm:top-auto sm:bottom-6 sm:left-6"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget as Node)) setPaused(false);
        }}
      >
        {notice && (
          <div
            key={notice.id}
            className="animate-rise pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-2 border-success bg-surface p-3 pl-4 shadow-xl sm:w-auto"
          >
            <p className="flex min-w-40 flex-1 items-center gap-3 font-bold">
              <CircleCheck size={24} className="shrink-0 text-success" aria-hidden="true" />
              {notice.message}
            </p>
            <div className="ml-auto flex items-center gap-2">
              {notice.undo && (
                <button
                  type="button"
                  onClick={notice.undo}
                  className="inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-xl border-2 border-brand px-3 font-bold text-brand hover:bg-brand-soft"
                >
                  <Undo2 size={20} aria-hidden="true" />
                  Deshacer
                </button>
              )}
              <button
                type="button"
                onClick={dismissNotice}
                aria-label="Cerrar aviso"
                className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl text-ink-soft hover:bg-tint"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
