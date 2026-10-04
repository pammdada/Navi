import { useId, useState, type FormEvent } from 'react';
import { Captions, Contrast, Languages, Mic, RotateCcw, Settings, Sparkles, UserRound, Waves } from 'lucide-react';
import { fontSizeLabels } from '@/utils/profiles';
import { Card, FontSizePicker, Switch, ViewHeader, buttonStyles } from '../components/ui';
import { QuickProfiles } from '../components/QuickProfiles';
import { useNavi } from '../state';

const languages = [
  { value: 'es-PE', label: 'Español (Perú)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'es-ES', label: 'Español (España)' },
];

function NameForm() {
  const { profile, updateProfile, notify } = useNavi();
  const [name, setName] = useState(profile.name);
  const inputId = useId();
  const hintId = useId();
  const save = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    void updateProfile({ name: trimmed });
    notify(trimmed ? `Listo, te saludaremos como ${trimmed}.` : 'Se quitó tu nombre.');
  };
  return (
    <form onSubmit={save} className="grid gap-3">
      <label htmlFor={inputId} className="text-lg font-bold">
        ¿Cómo quieres que te llamemos?
      </label>
      <p id={hintId} className="text-ink-soft">
        Es opcional. Solo se usa para saludarte y se guarda en tu navegador.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          id={inputId}
          aria-describedby={hintId}
          value={name}
          maxLength={40}
          autoComplete="given-name"
          onChange={(event) => setName(event.target.value)}
          className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-4 text-lg"
        />
        <button type="submit" className={buttonStyles.primary}>
          Guardar nombre
        </button>
      </div>
    </form>
  );
}

export function SettingsView() {
  const { preferences, updatePreferences, resetPreferences } = useNavi();
  const [confirmReset, setConfirmReset] = useState(false);
  const languageId = useId();

  return (
    <>
      <ViewHeader icon={Settings} title="Configuración de accesibilidad" intro="Todos tus ajustes en un solo lugar. Se guardan solos y puedes deshacer cada cambio." />

      <Card title="Accesos rápidos" description="Aplica un perfil completo con un clic.">
        <QuickProfiles />
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Visualización" icon={Contrast}>
          <div className="grid gap-4">
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
              icon={Waves}
              label="Reducir movimiento"
              description="Quita animaciones y transiciones."
              checked={preferences.reduceMotion}
              onChange={(reduceMotion) => void updatePreferences({ reduceMotion }, reduceMotion ? 'Movimiento reducido.' : 'Animaciones activadas.')}
            />
          </div>
        </Card>

        <Card title="Ayudas" icon={Sparkles}>
          <div className="grid gap-4">
            <Switch
              icon={Sparkles}
              label="Modo simplificado"
              description="Oculta lo secundario y deja solo lo esencial."
              checked={preferences.simplifiedMode}
              onChange={(simplifiedMode) => void updatePreferences({ simplifiedMode }, simplifiedMode ? 'Modo simplificado activado.' : 'Modo simplificado desactivado.')}
            />
            <Switch
              icon={Captions}
              label="Subtítulos automáticos"
              checked={preferences.captionsEnabled}
              onChange={(captionsEnabled) => void updatePreferences({ captionsEnabled }, captionsEnabled ? 'Subtítulos activados.' : 'Subtítulos desactivados.')}
            />
            <Switch
              icon={Mic}
              label="Comandos de voz"
              checked={preferences.voiceEnabled}
              onChange={(voiceEnabled) => void updatePreferences({ voiceEnabled }, voiceEnabled ? 'Comandos de voz activados.' : 'Comandos de voz desactivados.')}
            />
            <div className="grid gap-2">
              <label htmlFor={languageId} className="flex items-center gap-2 text-lg font-bold">
                <Languages size={22} aria-hidden="true" className="text-brand" />
                Idioma de la voz
              </label>
              <select
                id={languageId}
                value={preferences.language}
                onChange={(event) => void updatePreferences({ language: event.target.value }, 'Idioma de la voz actualizado.')}
                className="min-h-12 rounded-xl border-2 border-line bg-surface px-3 text-lg"
              >
                {languages.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Tu perfil" icon={UserRound}>
        <NameForm />
      </Card>

      <Card title="Restablecer" icon={RotateCcw} description="Vuelve a la configuración original de Navi. Tu nombre se conserva.">
        {confirmReset ? (
          <div role="group" aria-label="Confirmar restablecimiento" className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger-soft p-4">
            <p className="font-bold text-danger">¿Seguro que quieres restablecer todos los ajustes?</p>
            <button
              type="button"
              className={buttonStyles.danger}
              onClick={() => {
                void resetPreferences();
                setConfirmReset(false);
              }}
            >
              Sí, restablecer
            </button>
            <button type="button" className={buttonStyles.secondary} onClick={() => setConfirmReset(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" className={buttonStyles.danger} onClick={() => setConfirmReset(true)}>
            <RotateCcw size={20} aria-hidden="true" />
            Restablecer ajustes
          </button>
        )}
      </Card>
    </>
  );
}
