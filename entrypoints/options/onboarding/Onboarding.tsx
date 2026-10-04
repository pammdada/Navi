import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { NaviLogo } from '@/components/NaviLogo';
import { settingsForNeeds } from '@/utils/profiles';
import type { NeedProfile } from '@/utils/storage';
import { SkipLink } from '../components/AppShell';
import { buttonStyles } from '../components/ui';
import { useNavi } from '../state';
import { AdjustStep, HowToStep, NameStep, NeedsStep, WelcomeStep } from './steps';

const stepNames = ['Bienvenida', 'Tu nombre', 'Qué te ayudaría', 'Ajusta tu experiencia', 'Cómo usar Navi'];
const lastStep = stepNames.length - 1;

/**
 * Guía de bienvenida en 5 pasos. Cada paso se guarda: si se cierra la pestaña, se retoma en el mismo punto.
 * Al cambiar de paso, el foco va al título del paso para que el lector de pantalla lo anuncie.
 */
export function Onboarding() {
  const { profile, updateProfile, updatePreferences, notify } = useNavi();
  const [step, setStep] = useState(() => Math.min(Math.max(profile.onboardingStep, 0), lastStep));
  const [name, setName] = useState(profile.name);
  const [needs, setNeeds] = useState<NeedProfile[]>(profile.needs);
  const firstRender = useRef(true);

  useEffect(() => {
    document.title = `Paso ${step + 1} de ${stepNames.length}: ${stepNames[step]} · Navi`;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    document.getElementById('step-title')?.focus();
  }, [step]);

  const goTo = (next: number, nextName = name) => {
    if (step === 2 && next === 3 && needs.length) {
      void updatePreferences(settingsForNeeds(needs), 'Aplicamos los ajustes de tu perfil.');
    }
    setStep(next);
    void updateProfile({ onboardingStep: next, name: nextName.trim(), needs });
  };

  const finish = (message: string) => {
    void updateProfile({ onboardingCompleted: true, onboardingStep: 0, name: name.trim(), needs });
    window.location.hash = '/inicio';
    notify(message);
  };

  const trimmedName = name.trim();
  const next = () => (step === lastStep ? finish(`¡Listo${trimmedName ? `, ${trimmedName}` : ''}! Tu configuración está guardada.`) : goTo(step + 1));

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="border-b border-line-soft bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="flex items-center gap-3">
            <span className="logo-frame">
              <NaviLogo size={44} decorative />
            </span>
            <span className="text-2xl font-bold">Navi</span>
          </p>
          <button
            type="button"
            className={buttonStyles.ghost}
            onClick={() => finish('Saltaste la guía. Puedes verla cuando quieras desde Ayuda.')}
          >
            Saltar guía
          </button>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-40 outline-none sm:px-6 sm:pt-10">
        <div className="mb-6">
          <p className="text-lg font-bold" id="progress-label">
            Paso {step + 1} de {stepNames.length}: <span className="text-brand">{stepNames[step]}</span>
          </p>
          <div
            className="mt-3 grid grid-cols-5 gap-2"
            role="progressbar"
            aria-labelledby="progress-label"
            aria-valuemin={1}
            aria-valuemax={stepNames.length}
            aria-valuenow={step + 1}
          >
            {stepNames.map((label, index) => (
              <span key={label} className={`h-2.5 rounded-full ${index <= step ? 'bg-brand' : 'bg-line-soft'}`} />
            ))}
          </div>
        </div>

        <div key={step} className="animate-rise rounded-3xl border border-line-soft bg-surface p-5 shadow-sm sm:p-8">
          {step === 0 && <WelcomeStep />}
          {step === 1 && <NameStep name={name} onChange={setName} onSubmit={next} onSkip={() => { setName(''); goTo(2, ''); }} />}
          {step === 2 && <NeedsStep needs={needs} onChange={setNeeds} />}
          {step === 3 && <AdjustStep />}
          {step === 4 && <HowToStep name={trimmedName} />}
        </div>

        <nav aria-label="Pasos de la guía" className="mt-6 flex flex-wrap-reverse items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" className={buttonStyles.secondary} onClick={() => goTo(step - 1)}>
              <ChevronLeft size={22} aria-hidden="true" />
              Atrás
            </button>
          ) : (
            <span />
          )}
          <button type="button" className={`${buttonStyles.primary} min-w-48 text-lg`} onClick={next}>
            {step === 0 ? 'Comenzar' : step === lastStep ? 'Ir al inicio' : 'Siguiente'}
            <ArrowRight size={22} aria-hidden="true" />
          </button>
        </nav>
      </main>
    </div>
  );
}
