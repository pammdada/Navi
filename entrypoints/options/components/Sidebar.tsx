import { RotateCcw, UserRound } from 'lucide-react';
import { routes, type RouteId } from '../routes';
import { useNavi } from '../state';

interface SidebarProps {
  current: RouteId;
  onNavigate: () => void;
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
  const { profile, updateProfile } = useNavi();
  const restartGuide = () => {
    onNavigate();
    void updateProfile({ onboardingCompleted: false, onboardingStep: 0 });
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <nav aria-label="Secciones de Navi">
        <ul className="grid gap-1.5">
          {routes.map(({ id, label, hint, icon: Icon }) => {
            const active = id === current;
            return (
              <li key={id}>
                <a
                  href={`#/${id}`}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex min-h-14 items-center gap-3 rounded-xl border-2 px-3 py-2 transition-colors ${
                    active ? 'border-brand bg-brand text-on-brand' : 'border-transparent text-ink hover:border-line-soft hover:bg-tint'
                  }`}
                >
                  <Icon size={24} strokeWidth={2.25} aria-hidden="true" className="shrink-0" />
                  <span className="leading-tight">
                    <span className="block font-bold">{label}</span>
                    <span className={`simplifiable block text-sm ${active ? 'text-on-brand' : 'text-ink-soft'}`}>{hint}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto grid gap-3 rounded-2xl border border-line-soft bg-tint p-4">
        <p className="flex items-center gap-3 font-bold">
          <span className="grid size-10 place-items-center rounded-full bg-brand text-on-brand" aria-hidden="true">
            <UserRound size={22} />
          </span>
          <span>
            <span className="block text-sm font-normal text-ink-soft">Sesión de</span>
            {profile.name || 'Invitado'}
          </span>
        </p>
        <button
          type="button"
          onClick={restartGuide}
          className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-brand bg-surface px-3 font-bold text-brand hover:bg-brand-soft"
        >
          <RotateCcw size={20} aria-hidden="true" />
          Ver la guía otra vez
        </button>
      </div>
    </div>
  );
}
