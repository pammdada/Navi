import { ArrowRight, AudioLines, Mic, Settings, Zap } from 'lucide-react';
import { NaviLogo } from '@/components/NaviLogo';
import { activeSettingLabels } from '@/utils/profiles';
import { Card, ListenButton } from '../components/ui';
import { QuickProfiles } from '../components/QuickProfiles';
import { audiences, features, needIcons, utpSteps } from '../content';
import { useNavi } from '../state';

const mainActions = [
  { href: '#/lectura', title: 'Escuchar contenido', description: 'Navi lee en voz alta por ti.', icon: AudioLines },
  { href: '#/voz', title: 'Hablar con Navi', description: 'Usa tu voz para moverte.', icon: Mic },
  { href: '#/configuracion', title: 'Ajustar accesibilidad', description: 'Letra, contraste y más.', icon: Settings },
];

export function HomeView() {
  const { profile, preferences } = useNavi();
  const active = activeSettingLabels(preferences);
  const greeting = profile.name ? `Hola, ${profile.name}` : 'Hola, te damos la bienvenida';
  const intro = 'Navi hace que UTP Class sea más fácil de leer, escuchar y usar. Elige qué quieres hacer hoy.';

  return (
    <>
      <header className="relative overflow-hidden rounded-3xl bg-brand p-6 text-on-brand sm:p-10">
        <div aria-hidden="true" className="simplifiable pointer-events-none absolute -top-16 -right-16 size-64 rounded-full border-[28px] border-accent/30" />
        <div aria-hidden="true" className="simplifiable pointer-events-none absolute -right-4 -bottom-24 size-48 rounded-full border-[18px] border-on-brand/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h1 id="view-title" tabIndex={-1} className="text-4xl font-bold leading-tight outline-none sm:text-5xl">
              {greeting}
            </h1>
            <p className="mt-3 text-xl">{intro}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ListenButton text={`${greeting}. ${intro}`} label="Escuchar bienvenida" />
            </div>
          </div>
          <span className="simplifiable hidden rounded-[2rem] bg-on-brand/10 p-6 lg:block" aria-hidden="true">
            <NaviLogo size={128} decorative />
          </span>
        </div>
        <div className="relative mt-6 rounded-2xl bg-on-brand/10 p-4">
          <p className="font-bold">Ajustes activos ahora:</p>
          {active.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {active.map((label) => (
                <li key={label} className="rounded-full border-2 border-on-brand/60 px-3 py-1 font-bold">
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">Usas la configuración estándar. Puedes cambiarla con el botón Accesibilidad.</p>
          )}
        </div>
      </header>

      <section aria-labelledby="actions-title">
        <h2 id="actions-title" className="text-2xl font-bold">
          ¿Qué quieres hacer?
        </h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {mainActions.map(({ href, title, description, icon: Icon }) => (
            <li key={href}>
              <a
                href={href}
                className="group flex h-full min-h-40 flex-col justify-between gap-4 rounded-3xl border-2 border-line-soft bg-surface p-6 transition-colors hover:border-brand hover:bg-tint"
              >
                <span className="grid size-16 place-items-center rounded-2xl bg-brand text-on-brand" aria-hidden="true">
                  <Icon size={34} strokeWidth={2.25} />
                </span>
                <span>
                  <span className="flex items-center justify-between gap-2 text-2xl font-bold">
                    {title}
                    <ArrowRight size={26} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="mt-1 block text-lg text-ink-soft">{description}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <Card title="Accesibilidad rápida" icon={Zap} description="Elige lo que se parezca a ti. Se aplica al instante y puedes deshacerlo.">
        <QuickProfiles />
      </Card>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="text-2xl font-bold">
          ¿Qué puede hacer Navi?
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {features.map(({ title, description, route, icon: Icon }) => (
            <li key={title}>
              <a href={`#/${route}`} className="flex h-full items-start gap-3 rounded-2xl border border-line-soft bg-surface p-4 hover:border-brand hover:bg-tint">
                <Icon size={26} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  <span className="block text-lg font-bold">{title}</span>
                  <span className="simplifiable block text-ink-soft">{description}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="audience-title" className="simplifiable rounded-3xl bg-tint p-6">
        <h2 id="audience-title" className="text-2xl font-bold">
          ¿Para quién es Navi?
        </h2>
        <p className="mt-1 text-lg text-ink-soft">Para cualquier estudiante de la UTP. Lo diseñamos pensando especialmente en:</p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {audiences.map(({ need, title, description }) => {
            const Icon = needIcons[need];
            return (
              <li key={need} className="flex items-start gap-3 rounded-2xl bg-surface p-4">
                <Icon size={26} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="block text-ink-soft">{description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <Card title="Usar Navi en UTP Class">
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
      </Card>
    </>
  );
}
