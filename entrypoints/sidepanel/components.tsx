import { useState, type ReactNode } from 'react';
import { Loader, Pause, Play, ShieldCheck, SkipBack, SkipForward, Sparkles, Square, TriangleAlert, Volume2, X, type LucideIcon } from 'lucide-react';
import { AiSummaryError, buildAiPayload, payloadToPreview, requestAiSummary, type AiSummaryResult } from '@/utils/ai-summary';
import type { ReaderState } from '@/utils/guided-reader';
import { summaryToSpeech, type LocalPageSummary, type ReadingPlan } from '@/utils/reading-plan';

interface PanelButtonProps {
  icon: LucideIcon;
  label: string;
  /** Texto corto bajo la etiqueta: el estado (Activo / Desactivado) o una pista. */
  hint?: string;
  /** Para botones que se encienden y apagan. Se anuncia con aria-pressed y se ve con el relleno y la marca. */
  pressed?: boolean;
  /** No disponible: se ve atenuado pero sigue siendo enfocable, y al pulsarlo se explica el motivo. */
  unavailable?: boolean;
  variant?: 'default' | 'primary' | 'large';
  onClick: () => void;
}

export function PanelButton({ icon: Icon, label, hint, pressed, unavailable, variant = 'default', onClick }: PanelButtonProps) {
  const on = pressed === true;
  const tone = unavailable
    ? 'border-line-soft bg-tint text-ink-soft'
    : variant === 'primary' || on
      ? 'border-brand bg-brand text-on-brand hover:bg-brand-strong'
      : 'border-brand bg-surface text-ink hover:bg-brand-soft';
  const shape = variant === 'large' ? 'min-h-16 flex-row gap-4 px-4 text-lg' : 'min-h-16 flex-col justify-center gap-0.5 px-2 text-center';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-disabled={unavailable || undefined}
      className={`flex w-full cursor-pointer items-center rounded-2xl border-2 py-2 font-bold transition-colors ${tone} ${shape}`}
    >
      <Icon size={variant === 'large' ? 28 : 24} strokeWidth={2.25} aria-hidden="true" className="shrink-0" />
      <span className={variant === 'large' ? 'text-left leading-tight' : 'leading-tight'}>
        <span className="block">{label}</span>
        {hint && <span className="block text-xs font-bold opacity-90">{hint}</span>}
      </span>
    </button>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-2">
      <h2 className="text-sm font-bold tracking-wide text-ink-soft uppercase">{title}</h2>
      {children}
    </section>
  );
}

const barButton =
  'flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-brand bg-surface px-1 text-xs font-bold text-brand hover:bg-brand-soft';

/** Controles de la lectura: anterior, reproducir/pausar, siguiente y detener, con la sección actual. */
export function ReaderBar({ state, onPrevious, onPlayPause, onNext, onStop }: { state: ReaderState; onPrevious: () => void; onPlayPause: () => void; onNext: () => void; onStop: () => void }) {
  const playing = state.status === 'playing';
  return (
    <section aria-label="Control de lectura" className="grid gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-3">
      <p className="text-base font-bold" aria-hidden="true">
        {state.sectionCount > 0 && `Sección ${state.sectionIndex + 1} de ${state.sectionCount}`}
        <span className="block text-sm font-normal">{state.sectionTitle}</span>
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <div className="h-full bg-brand" style={{ width: `${((state.sectionIndex + 1) / Math.max(state.sectionCount, 1)) * 100}%` }} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button type="button" className={barButton} onClick={onPrevious}>
          <SkipBack size={20} aria-hidden="true" />
          Anterior
        </button>
        <button type="button" className={`${barButton} ${playing ? '' : 'border-brand bg-brand text-on-brand hover:bg-brand-strong'}`} onClick={onPlayPause}>
          {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
          {playing ? 'Pausa' : 'Seguir'}
        </button>
        <button type="button" className={barButton} onClick={onNext}>
          <SkipForward size={20} aria-hidden="true" />
          Siguiente
        </button>
        <button type="button" className={barButton} onClick={onStop}>
          <Square size={20} aria-hidden="true" />
          Detener
        </button>
      </div>
    </section>
  );
}

type AiStep = { name: 'idle' } | { name: 'preview'; preview: string; chars: number } | { name: 'loading' } | { name: 'done'; result: AiSummaryResult } | { name: 'error'; message: string };

/** Resumen con IA: vista previa de lo que se enviaría, consentimiento explícito y resultado solo informativo. */
function AiSummary({ plan, endpoint }: { plan: ReadingPlan; endpoint: string }) {
  const [step, setStep] = useState<AiStep>({ name: 'idle' });
  const host = (() => {
    try {
      return new URL(endpoint).host;
    } catch {
      return endpoint;
    }
  })();

  const showPreview = () => {
    const preview = payloadToPreview(buildAiPayload(plan));
    setStep({ name: 'preview', preview, chars: preview.length });
  };

  const send = async () => {
    setStep({ name: 'loading' });
    try {
      // El permiso para hablar con ese servidor se pide recién ahora, con el clic del usuario.
      const granted = await browser.permissions.request({ origins: [`${new URL(endpoint).origin}/*`] });
      if (!granted) throw new AiSummaryError('No diste permiso para conectarte con ese servidor.');
      setStep({ name: 'done', result: await requestAiSummary(endpoint, buildAiPayload(plan)) });
    } catch (error) {
      setStep({ name: 'error', message: error instanceof AiSummaryError ? error.message : 'No pude generar el resumen. Inténtalo otra vez.' });
    }
  };

  const outline = 'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-brand bg-surface px-3 font-bold text-brand hover:bg-brand-soft';
  const solid = 'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-brand bg-brand px-3 font-bold text-on-brand hover:bg-brand-strong';

  if (step.name === 'idle') {
    return (
      <button type="button" className={outline} onClick={showPreview}>
        <Sparkles size={20} aria-hidden="true" />
        Resumen con IA
      </button>
    );
  }
  if (step.name === 'preview') {
    return (
      <div className="grid gap-2 rounded-xl border-2 border-line p-3" role="group" aria-label="Confirmar envío para resumen con IA">
        <p className="flex items-start gap-2 font-bold">
          <ShieldCheck size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
          Se enviarán {step.chars} caracteres a {host}.
        </p>
        <p className="text-sm text-ink-soft">Esto es exactamente lo que se enviará. Revísalo antes de aceptar:</p>
        <pre tabIndex={0} aria-label="Texto que se enviará" className="max-h-40 overflow-auto rounded-lg bg-tint p-2 text-sm whitespace-pre-wrap">{step.preview}</pre>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={solid} onClick={() => void send()}>Aceptar y enviar</button>
          <button type="button" className={outline} onClick={() => setStep({ name: 'idle' })}>Cancelar</button>
        </div>
      </div>
    );
  }
  if (step.name === 'loading') {
    return (
      <p role="status" className="flex items-center gap-2 font-bold">
        <Loader size={20} aria-hidden="true" /> Generando el resumen…
      </p>
    );
  }
  if (step.name === 'error') {
    return (
      <div className="grid gap-2 rounded-xl bg-danger-soft p-3 text-danger" role="alert">
        <p className="flex items-start gap-2 font-bold"><TriangleAlert size={20} aria-hidden="true" className="mt-0.5 shrink-0" />{step.message}</p>
        <button type="button" className={outline} onClick={() => setStep({ name: 'idle' })}>Cerrar</button>
      </div>
    );
  }
  const { result } = step;
  return (
    <div className="grid gap-2 rounded-xl border-2 border-line p-3">
      <p className="text-sm font-bold text-ink-soft">Generado por IA. Puede contener errores: compáralo con la página.</p>
      <p>{result.summary}</p>
      {result.keyPoints.length > 0 && <ul className="list-disc pl-5">{result.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>}
      {result.dates.length > 0 && <p><strong>Fechas:</strong> {result.dates.join('; ')}</p>}
      {result.suggestedActions.length > 0 && (
        <div>
          <p className="font-bold">Sugerencias (solo informativas)</p>
          <ul className="list-disc pl-5">{result.suggestedActions.map((action) => <li key={action}>{action}</li>)}</ul>
        </div>
      )}
      <button type="button" className={outline} onClick={() => setStep({ name: 'idle' })}>
        <X size={18} aria-hidden="true" /> Cerrar
      </button>
    </div>
  );
}

export function SummaryCard({ summary, plan, aiEndpoint, onListen, onClose }: { summary: LocalPageSummary; plan: ReadingPlan; aiEndpoint: string; onListen: (text: string) => void; onClose: () => void }) {
  const rows: [string, string | number][] = [
    [summary.kind, summary.title],
    ['Secciones', summary.sections],
    ['Actividades detectadas', summary.tasks],
    ['Fechas encontradas', summary.dates],
    ['Enlaces importantes', summary.links],
  ];
  return (
    <section aria-labelledby="summary-title" className="grid gap-3 rounded-2xl border border-line-soft bg-surface p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 id="summary-title" className="text-lg font-bold">Resumen de página</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar resumen" className="grid size-11 cursor-pointer place-items-center rounded-xl text-ink-soft hover:bg-tint">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        {rows.map(([name, value]) => (
          <div key={name} className="col-span-2 grid grid-cols-subgrid border-b border-line-soft py-1 last:border-b-0">
            <dt className="text-ink-soft">{name}</dt>
            <dd className="text-right font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={() => onListen(summaryToSpeech(summary))} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-brand bg-surface px-3 font-bold text-brand hover:bg-brand-soft">
        <Volume2 size={20} aria-hidden="true" /> Escuchar resumen
      </button>
      {aiEndpoint ? (
        <AiSummary plan={plan} endpoint={aiEndpoint} />
      ) : (
        <p className="text-sm text-ink-soft">
          ¿Quieres un resumen con IA? Es opcional y se activa en <a className="font-bold text-brand underline" href="/options.html#/configuracion" target="_blank" rel="noreferrer">Configuración</a>.
        </p>
      )}
    </section>
  );
}
