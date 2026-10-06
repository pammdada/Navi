import { useEffect, useId, useState, type ReactNode } from 'react';
import { Square, Volume2, type LucideIcon } from 'lucide-react';
import { speakWithPreferences, stopSpeaking } from '@/utils/speech/synthesis';
import { fontSizeLabels, fontSizeOrder } from '@/utils/profiles';
import { colorModes } from '@/utils/preferences';
import type { ColorVisionMode, FontSize } from '@/utils/storage';
import { useNavi } from '../state';

const buttonBase =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer';
export const buttonStyles = {
  primary: `${buttonBase} bg-brand text-on-brand hover:bg-brand-strong`,
  secondary: `${buttonBase} border-2 border-brand bg-surface text-brand hover:bg-brand-soft`,
  ghost: `${buttonBase} text-ink hover:bg-tint underline-offset-4 hover:underline`,
  danger: `${buttonBase} border-2 border-danger bg-surface text-danger hover:bg-danger-soft`,
};

export function Card({ title, icon: Icon, children, className = '', description }: { title: string; icon?: LucideIcon; children: ReactNode; className?: string; description?: string }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={`rounded-2xl border border-line-soft bg-surface p-5 shadow-sm sm:p-6 ${className}`}>
      <h2 id={titleId} className="flex items-center gap-3 text-xl font-bold">
        {Icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
            <Icon size={22} strokeWidth={2.25} />
          </span>
        )}
        {title}
      </h2>
      {description && <p className="mt-2 text-ink-soft">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Encabezado de cada vista. El h1 recibe el foco al cambiar de sección (ver AppShell). */
export function ViewHeader({ title, intro, icon: Icon, listenText }: { title: string; intro: string; icon: LucideIcon; listenText?: string }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-brand text-on-brand sm:grid" aria-hidden="true">
          <Icon size={30} strokeWidth={2.25} />
        </span>
        <div>
          <h1 id="view-title" tabIndex={-1} className="text-3xl font-bold leading-tight outline-none sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-prose text-lg text-ink-soft">{intro}</p>
        </div>
      </div>
      <ListenButton text={listenText ?? `${title}. ${intro}`} label="Escuchar esta sección" />
    </header>
  );
}

export function ListenButton({ text, label = 'Escuchar', variant = 'secondary' }: { text: string; label?: string; variant?: 'primary' | 'secondary' }) {
  const { preferences } = useNavi();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakWithPreferences(text, preferences, () => setSpeaking(false));
  };
  return (
    <button type="button" className={`${buttonStyles[variant]} max-w-full sm:shrink-0`} onClick={toggle}>
      {speaking ? <Square size={20} aria-hidden="true" fill="currentColor" /> : <Volume2 size={22} aria-hidden="true" />}
      {speaking ? 'Detener lectura' : label}
    </button>
  );
}

interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: LucideIcon;
}

/** Interruptor accesible: role="switch" y su estado se muestra en texto, no solo con color. */
export function Switch({ label, description, checked, onChange, icon: Icon }: SwitchProps) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={() => onChange(!checked)}
      className={`flex w-full cursor-pointer items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
        checked ? 'border-brand bg-brand-soft' : 'border-line-soft bg-surface hover:border-line'
      }`}
    >
      {Icon && <Icon size={26} className="shrink-0 text-brand" aria-hidden="true" />}
      <span className="flex-1">
        <span id={labelId} className="block text-lg font-bold">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="block text-ink-soft">
            {description}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-center gap-1" aria-hidden="true">
        <span className={`relative h-8 w-14 rounded-full border-2 transition-colors ${checked ? 'border-brand bg-brand' : 'border-line bg-surface'}`}>
          <span className={`absolute top-0.5 size-6 rounded-full transition-all ${checked ? 'left-[1.6rem] bg-on-brand' : 'left-0.5 bg-line'}`} />
        </span>
        <span className="text-sm font-bold">{checked ? 'Activado' : 'Desactivado'}</span>
      </span>
    </button>
  );
}

const previewSizes: Record<FontSize, string> = { normal: 'text-xl', large: 'text-2xl', 'x-large': 'text-3xl' };

export function FontSizePicker({ value, onChange, legend = 'Tamaño de letra' }: { value: FontSize; onChange: (value: FontSize) => void; legend?: string }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-3 text-lg font-bold">{legend}</legend>
      <div className="grid grid-cols-3 gap-3">
        {fontSizeOrder.map((size) => (
          <label
            key={size}
            className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-line-soft bg-surface p-3 text-center hover:border-line has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-focus"
          >
            <input type="radio" name={name} value={size} checked={value === size} onChange={() => onChange(size)} className="sr-only" />
            <span className={`${previewSizes[size]} font-bold leading-none`} aria-hidden="true">
              Aa
            </span>
            <span className="font-bold">{fontSizeLabels[size]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  minHint: string;
  maxHint: string;
}

export function RangeField({ label, value, min, max, step, onChange, format, minHint, maxHint }: RangeFieldProps) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-lg font-bold">
          {label}
        </label>
        <output htmlFor={id} className="rounded-lg bg-tint px-3 py-1 font-bold">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 h-10 w-full cursor-pointer accent-brand"
      />
      <div className="flex justify-between text-ink-soft" aria-hidden="true">
        <span>{minHint}</span>
        <span>{maxHint}</span>
      </div>
    </div>
  );
}

export const formatRate = (value: number) => `${value.toLocaleString('es-PE', { minimumFractionDigits: 1 })}×`;
export const formatPercent = (value: number) => `${Math.round(value * 100)} %`;

const swatches: Record<ColorVisionMode, [string, string]> = {
  standard: ['#1e3a8a', '#f59e0b'],
  'high-contrast': ['#000000', '#ffe600'],
  'red-green-safe': ['#0b4f9e', '#8a4b00'],
  'blue-yellow-safe': ['#a3004a', '#006b6b'],
};

/** Paletas para daltonismo. La muestra de colores es decorativa: cada opción se describe con palabras. */
export function ColorModePicker({ value, onChange }: { value: ColorVisionMode; onChange: (value: ColorVisionMode) => void }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1 text-lg font-bold">Paleta de colores en UTP Class</legend>
      <p className="mb-3 text-ink-soft">No es un filtro: Navi cambia los colores de enlaces, botones y estados, y agrega ícono y texto a “Pendiente” y “Completada”.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {colorModes.map((mode) => (
          <label
            key={mode.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-line-soft bg-surface p-3 hover:border-line has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-focus"
          >
            <input type="radio" name={name} value={mode.id} checked={value === mode.id} onChange={() => onChange(mode.id)} className="sr-only" />
            <span className="mt-1 flex shrink-0 overflow-hidden rounded-lg border-2 border-line" aria-hidden="true">
              <span className="block h-8 w-6" style={{ background: swatches[mode.id][0] }} />
              <span className="block h-8 w-6" style={{ background: swatches[mode.id][1] }} />
            </span>
            <span>
              <span className="block text-lg font-bold">
                {mode.label}
                {value === mode.id && <span className="ml-2 text-sm font-bold text-brand">· Elegida</span>}
              </span>
              <span className="block text-ink-soft">{mode.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
