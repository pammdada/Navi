import { Check } from 'lucide-react';
import { needProfiles } from '@/utils/profiles';
import type { NeedProfile } from '@/utils/storage';
import { needIcons } from '../content';
import { useNavi } from '../state';

/** Selector de accesibilidad rápida: aplica un perfil completo con un clic y se puede deshacer. */
export function QuickProfiles() {
  const { profile, updatePreferences, updateProfile } = useNavi();

  const apply = (need: NeedProfile) => {
    const info = needProfiles.find((item) => item.id === need)!;
    void updatePreferences(info.settings, `Perfil "${info.shortLabel}" aplicado.`);
    if (!profile.needs.includes(need)) void updateProfile({ needs: [...profile.needs, need] });
  };

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {needProfiles.map(({ id, shortLabel, label, description }) => {
        const Icon = needIcons[id];
        const inProfile = profile.needs.includes(id);
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => apply(id)}
              className="flex h-full w-full cursor-pointer items-start gap-3 rounded-2xl border-2 border-line-soft bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-tint"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
                <Icon size={26} strokeWidth={2.25} />
              </span>
              <span>
                <span className="block text-lg font-bold">{label}</span>
                <span className="block text-ink-soft">
                  {description}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold">
                  <span className="rounded-full bg-tint px-2 py-0.5">Perfil {shortLabel.toLowerCase()}</span>
                  {inProfile && (
                    <span className="inline-flex items-center gap-1 text-success">
                      <Check size={16} aria-hidden="true" /> En tu perfil
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
