import { useEffect, useId, useState, type FormEvent } from 'react';
import { validateEndpoint } from '@/utils/ai-summary';
import { colorModeLabel } from '@/utils/preferences';
import { aiSummarySettings } from '@/utils/storage';
import { Bot,Contrast, Languages, Mic, Palette, RotateCcw, Settings, Sparkles, UserRound, Waves } from 'lucide-react';
import { fontSizeLabels } from '@/utils/profiles';
import { Card, ColorModePicker, FontSizePicker, Switch, ViewHeader, buttonStyles } from '../components/ui';
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

function AiSettingsForm() {
  const { notify } = useNavi();
  const [endpoint, setEndpoint] = useState('');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  useEffect(() => {
    void aiSummarySettings.getValue().then((settings) => {
      setEndpoint(settings.endpoint ?? '');
      setSaved(settings.endpoint ?? '');
    });
  }, []);

  const store = async (value: string) => {
    await aiSummarySettings.setValue({ endpoint: value });
    setSaved(value);
    setEndpoint(value);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const value = endpoint.trim();
    const problem = value ? validateEndpoint(value) : null;
    setError(problem);
    if (problem) return;
    void store(value);
    notify(value ? 'Dirección guardada. Navi te pedirá permiso cada vez que quieras enviar una página.' : 'Resumen con IA desactivado.');
  };

  const remove = () => {
    // Si ya se había concedido permiso a ese servidor, también se retira.
    try {
      void browser.permissions.remove({ origins: [`${new URL(saved).origin}/*`] }).catch(() => undefined);
    } catch {
      /* dirección ya inválida: nada que retirar */
    }
    void store('');
    setError(null);
    notify('Resumen con IA desactivado.');
  };

  return (
    <form onSubmit={save} className="grid gap-4" noValidate>
      <ul className="grid list-disc gap-1 pl-6 text-lg">
        <li>Navi <strong>no contiene ninguna clave de IA</strong>: se conecta a un servidor tuyo que la guarda.</li>
        <li>Siempre verás el texto exacto que se enviará y tendrás que aceptar cada vez.</li>
        <li>La IA solo devuelve un resumen; nunca hace nada en UTP Class.</li>
      </ul>
      <div className="grid gap-2">
        <label htmlFor={inputId} className="text-lg font-bold">Dirección de tu servidor de resumen</label>
        <input
          id={inputId}
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
          aria-invalid={error ? true : undefined}
          inputMode="url"
          autoComplete="off"
          placeholder="https://mi-servidor.example/resumen"
          className="min-h-12 w-full rounded-xl border-2 border-line bg-surface px-3 text-lg placeholder:text-ink-soft"
        />
        <p id={hintId} className="text-ink-soft">Debe empezar con https:// y no llevar claves ni parámetros. Déjala vacía para mantenerlo desactivado.</p>
      </div>
      {error && <p id={errorId} role="alert" className="rounded-xl bg-danger-soft p-3 font-bold text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={buttonStyles.primary}>Guardar dirección</button>
        {saved && <button type="button" className={buttonStyles.danger} onClick={remove}>Quitar y desactivar</button>}
        <span className="font-bold" role="status">{saved ? 'Resumen con IA: activado' : 'Resumen con IA: desactivado'}</span>
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

      <Card title="Colores" icon={Palette} description="Elige la paleta que se distinga mejor para ti. El alto contraste es una de las opciones.">
        <ColorModePicker
          value={preferences.colorVisionMode}
          onChange={(colorVisionMode) => void updatePreferences({ colorVisionMode }, `Colores: ${colorModeLabel(colorVisionMode).toLowerCase()}.`)}
        />
      </Card>

      <Card title="Resumen con IA (opcional)" icon={Bot} description="Desactivado por defecto. El resumen de página que ya trae Navi funciona sin internet y no envía nada fuera de tu navegador.">
        <AiSettingsForm />
      </Card>

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
