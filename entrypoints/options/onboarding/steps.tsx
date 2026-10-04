import { useId, type FormEvent, type ReactNode } from 'react';
import { Accessibility, AudioLines, Check, Contrast, Mic, Sparkles, Type } from 'lucide-react';
import { fontSizeLabels, fontSizeOrder, needProfiles } from '@/utils/profiles';
import type { NeedProfile } from '@/utils/storage';
import { FontSizePicker, ListenButton, RangeField, Switch, buttonStyles, formatRate } from '../components/ui';
import { needIcons, utpSteps } from '../content';
import { useNavi } from '../state';

export function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h1 id="step-title" tabIndex={-1} className="text-3xl font-bold leading-tight outline-none sm:text-4xl">
      {children}
    </h1>
  );
}

const welcomeText =
  'Hola, soy Navi. Te ayudo a usar UTP Class de forma más fácil: leo en voz alta, entiendo tu voz, agrando la letra y simplifico la pantalla. Son cinco pasos cortos y puedes saltar la guía cuando quieras.';

export function WelcomeStep() {
  const { preferences, updatePreferences } = useNavi();
  const nextSize = fontSizeOrder[(fontSizeOrder.indexOf(preferences.fontSize) + 1) % fontSizeOrder.length] ?? 'normal';
  return (
    <div className="grid gap-6">
      <StepTitle>Hola, soy Navi</StepTitle>
      <p className="text-xl">
        Te ayudo a usar <strong>UTP Class</strong> de forma más fácil: leo en voz alta, entiendo tu voz, agrando la letra y simplifico la pantalla.
      </p>
      <div>
        <ListenButton text={welcomeText} label="Escuchar esta presentación" variant="primary" />
      </div>

      <section aria-labelledby="easy-read-title" className="rounded-2xl border-2 border-brand bg-brand-soft p-4">
        <h2 id="easy-read-title" className="text-lg font-bold">
          ¿Te cuesta leer esta pantalla?
        </h2>
        <p className="text-ink-soft">Ajústala ahora mismo antes de seguir.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={buttonStyles.secondary}
            onClick={() => void updatePreferences({ fontSize: nextSize }, `Tamaño de letra: ${fontSizeLabels[nextSize].toLowerCase()}.`)}
          >
            <Type size={22} aria-hidden="true" />
            {preferences.fontSize === 'x-large' ? 'Volver a letra normal' : 'Agrandar la letra'}
          </button>
          <Switch
            icon={Contrast}
            label="Alto contraste"
            checked={preferences.highContrast}
            onChange={(highContrast) => void updatePreferences({ highContrast }, highContrast ? 'Alto contraste activado.' : 'Alto contraste desactivado.')}
          />
        </div>
      </section>

      <ul className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: AudioLines, text: 'Leo tus cursos en voz alta' },
          { icon: Mic, text: 'Entiendo comandos de voz' },
          { icon: Sparkles, text: 'Simplifico lo que ves' },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 rounded-2xl bg-tint p-4 font-bold">
            <Icon size={26} className="shrink-0 text-brand" aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NameStep({ name, onChange, onSubmit, onSkip }: { name: string; onChange: (name: string) => void; onSubmit: () => void; onSkip: () => void }) {
  const inputId = useId();
  const hintId = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <StepTitle>¿Cómo te llamas?</StepTitle>
      <p className="text-xl">Así podré saludarte cada vez que abras Navi.</p>
      <div className="grid gap-2">
        <label htmlFor={inputId} className="text-lg font-bold">
          Tu nombre <span className="font-normal text-ink-soft">(opcional)</span>
        </label>
        <input
          id={inputId}
          value={name}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={hintId}
          autoComplete="given-name"
          maxLength={40}
          placeholder="Por ejemplo: Ana"
          className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-xl placeholder:text-ink-soft"
        />
        <p id={hintId} className="text-ink-soft">
          Solo lo usamos para saludarte. Se guarda en tu navegador y puedes cambiarlo en Configuración.
        </p>
      </div>
      <div>
        <button type="button" className={buttonStyles.ghost} onClick={onSkip}>
          Prefiero no decirlo
        </button>
      </div>
    </form>
  );
}

export function NeedsStep({ needs, onChange }: { needs: NeedProfile[]; onChange: (needs: NeedProfile[]) => void }) {
  const toggle = (need: NeedProfile, checked: boolean) => onChange(checked ? [...needs, need] : needs.filter((item) => item !== need));
  return (
    <div className="grid gap-5">
      <StepTitle>¿Qué te ayudaría?</StepTitle>
      <fieldset>
        <legend className="mb-4 text-xl">
          Elige las opciones que se parezcan a ti. <strong>Puedes elegir varias o ninguna.</strong>
        </legend>
        <div className="grid gap-3 md:grid-cols-2">
          {needProfiles.map(({ id, label, description }) => {
            const Icon = needIcons[id];
            const checked = needs.includes(id);
            return (
              <label
                key={id}
                className="flex cursor-pointer items-start gap-4 rounded-2xl border-2 border-line-soft bg-surface p-4 hover:border-line has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-focus"
              >
                <input type="checkbox" checked={checked} onChange={(event) => toggle(id, event.target.checked)} className="sr-only" />
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
                  <Icon size={26} strokeWidth={2.25} />
                </span>
                <span className="flex-1">
                  <span className="block text-lg font-bold">{label}</span>
                  <span className="block text-ink-soft">{description}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`grid size-8 shrink-0 place-items-center rounded-lg border-2 ${checked ? 'border-brand bg-brand text-on-brand' : 'border-line'}`}
                >
                  {checked && <Check size={20} strokeWidth={3} />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

export function AdjustStep() {
  const { preferences, updatePreferences } = useNavi();
  return (
    <div className="grid gap-5">
      <StepTitle>Ajusta tu experiencia</StepTitle>
      <p className="text-xl">Ya aplicamos lo que elegiste. Revisa el ejemplo y cambia lo que necesites.</p>
      <section aria-labelledby="sample-title" className="rounded-2xl border-2 border-dashed border-line p-4">
        <h2 id="sample-title" className="text-sm font-bold tracking-wide text-ink-soft uppercase">
          Así se verá tu texto
        </h2>
        <p className="mt-1 text-xl">Tarea de la semana 5: entrega tu prototipo antes del viernes.</p>
      </section>
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
      <div className="grid gap-4 rounded-2xl border-2 border-line-soft p-4">
        <RangeField
          label="Velocidad de la voz"
          value={preferences.speechRate}
          min={0.6}
          max={1.4}
          step={0.1}
          format={formatRate}
          minHint="Más lenta"
          maxHint="Más rápida"
          onChange={(speechRate) => void updatePreferences({ speechRate })}
        />
        <div>
          <ListenButton text="Hola. Así sonará mi voz cuando lea tus cursos." label="Probar la voz" />
        </div>
      </div>
    </div>
  );
}

export function HowToStep({ name }: { name: string }) {
  return (
    <div className="grid gap-5">
      <StepTitle>¡Todo listo{name ? `, ${name}` : ''}!</StepTitle>
      <p className="text-xl">Así usarás Navi en tus clases:</p>
      <ol className="grid gap-3">
        {utpSteps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-lg">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-bold text-on-brand" aria-hidden="true">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-start gap-4 rounded-2xl border-2 border-brand bg-brand-soft p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-on-brand" aria-hidden="true">
          <Accessibility size={28} />
        </span>
        <p className="text-lg">
          ¿Necesitas cambiar algo? Siempre verás el botón <strong>Accesibilidad</strong> abajo a la derecha. También se abre con las teclas{' '}
          <kbd className="rounded-md border-2 border-line bg-surface px-1.5 font-sans font-bold">Alt</kbd> +{' '}
          <kbd className="rounded-md border-2 border-line bg-surface px-1.5 font-sans font-bold">A</kbd>.
        </p>
      </div>
    </div>
  );
}
