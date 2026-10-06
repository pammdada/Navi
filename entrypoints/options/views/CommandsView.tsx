import { useEffect, useId, useState, type FormEvent } from 'react';
import { Pencil, Plus, Save, ShieldCheck, Trash, WandSparkles } from 'lucide-react';
import {
  MAX_CUSTOM_COMMANDS,
  MAX_RESPONSE_LENGTH,
  customActionOptions,
  defaultResponseFor,
  pendingCustomActions,
  sanitizeStoredCommands,
  validateCustomCommand,
} from '@/utils/speech/commands';
import { customCommands, type CommandAction, type CustomCommand } from '@/utils/storage';
import { Card, Switch, ViewHeader, buttonStyles } from '../components/ui';
import { useNavi } from '../state';

const actionLabel = (action: CommandAction) => customActionOptions.find((option) => option.id === action)?.label ?? action;

function useCommands() {
  const [list, setList] = useState<CustomCommand[]>([]);
  useEffect(() => {
    void customCommands.getValue().then((value) => setList(sanitizeStoredCommands(value)));
    return customCommands.watch((value) => setList(sanitizeStoredCommands(value)));
  }, []);
  const save = async (next: CustomCommand[]) => {
    setList(next);
    await customCommands.setValue(next);
  };
  return { list, save };
}

const field = 'min-h-12 w-full rounded-xl border-2 border-line bg-surface px-3 text-lg';

export function CommandsView() {
  const { preferences, notify } = useNavi();
  const { list, save } = useCommands();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [phrase, setPhrase] = useState('');
  const [action, setAction] = useState<CommandAction>('go-courses');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const ids = { phrase: useId(), action: useId(), response: useId(), error: useId(), hint: useId() };

  const reset = () => {
    setEditingId(null);
    setPhrase('');
    setAction('go-courses');
    setResponse('');
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateCustomCommand({ phrase, action, response }, list, editingId ?? undefined);
    if (problem) {
      setError(problem);
      document.getElementById(ids.phrase)?.focus();
      return;
    }
    const command: CustomCommand = { id: editingId ?? crypto.randomUUID(), phrase: phrase.trim(), action, response: response.trim() || undefined, enabled: true };
    const previous = list.find((item) => item.id === editingId);
    void save(editingId ? list.map((item) => (item.id === editingId ? { ...command, enabled: previous?.enabled ?? true } : item)) : [...list, command]);
    notify(editingId ? `Comando “${command.phrase}” actualizado.` : `Comando “${command.phrase}” guardado.`);
    reset();
  };

  const edit = (command: CustomCommand) => {
    setEditingId(command.id);
    setPhrase(command.phrase);
    setAction(command.action);
    setResponse(command.response ?? '');
    setError(null);
    document.getElementById(ids.phrase)?.focus();
  };

  const remove = (command: CustomCommand) => {
    const before = list;
    void save(list.filter((item) => item.id !== command.id));
    setConfirmingId(null);
    if (editingId === command.id) reset();
    notify(`Comando “${command.phrase}” eliminado.`, () => void save(before));
  };

  return (
    <>
      <ViewHeader
        icon={WandSparkles}
        title="Mis comandos"
        intro="Crea tus propias frases para hablar con Navi. Por ejemplo, decir “ver pendientes” para que Navi te lea el resumen de la página."
      />

      <p className="flex items-start gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-4 text-lg">
        <ShieldCheck size={26} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
        <span>
          <strong>Es seguro:</strong> solo puedes elegir una acción de la lista. Navi nunca abre direcciones, ejecuta código ni usa selectores que tú escribas, y ningún comando puede entregar, borrar ni confirmar nada en UTP Class.
        </span>
      </p>

      {!preferences.voiceEnabled && (
        <p role="status" className="rounded-2xl bg-danger-soft p-4 font-bold text-danger">
          Los comandos de voz están desactivados, así que tus frases no funcionarán. Actívalos en Asistente de voz.
        </p>
      )}

      <Card title={editingId ? 'Editar comando' : 'Nuevo comando'} icon={editingId ? Pencil : Plus}>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <label htmlFor={ids.phrase} className="text-lg font-bold">Frase que dirás</label>
            <input
              id={ids.phrase}
              value={phrase}
              maxLength={50}
              onChange={(event) => setPhrase(event.target.value)}
              aria-describedby={`${ids.hint}${error ? ` ${ids.error}` : ''}`}
              aria-invalid={error ? true : undefined}
              placeholder="Por ejemplo: ver pendientes"
              className={`${field} placeholder:text-ink-soft`}
            />
            <p id={ids.hint} className="text-ink-soft">Entre 3 letras y 8 palabras.</p>
          </div>

          <div className="grid gap-2">
            <label htmlFor={ids.action} className="text-lg font-bold">Acción</label>
            <select id={ids.action} value={action} onChange={(event) => setAction(event.target.value as CommandAction)} className={field}>
              {customActionOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
              <optgroup label="Próximamente (falta validar con UTP Class)">
                {pendingCustomActions.map((option) => (
                  <option key={option.id} value={option.id} disabled>{option.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="grid gap-2">
            <label htmlFor={ids.response} className="text-lg font-bold">
              Respuesta hablada <span className="font-normal text-ink-soft">(opcional)</span>
            </label>
            <input
              id={ids.response}
              value={response}
              maxLength={MAX_RESPONSE_LENGTH}
              onChange={(event) => setResponse(event.target.value)}
              placeholder={defaultResponseFor(action)}
              className={`${field} placeholder:text-ink-soft`}
            />
          </div>

          {error && (
            <p id={ids.error} role="alert" className="rounded-xl bg-danger-soft p-3 font-bold text-danger">{error}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="submit" className={buttonStyles.primary}>
              <Save size={20} aria-hidden="true" />
              {editingId ? 'Guardar cambios' : 'Guardar comando'}
            </button>
            {editingId && (
              <button type="button" className={buttonStyles.secondary} onClick={reset}>Cancelar</button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Tus comandos" icon={WandSparkles} description={`Tienes ${list.length} de ${MAX_CUSTOM_COMMANDS}. Se guardan solo en este navegador.`}>
        {list.length === 0 ? (
          <p className="rounded-2xl bg-tint p-4 text-lg">Todavía no creaste ningún comando. Empieza con el formulario de arriba.</p>
        ) : (
          <ul className="grid gap-3">
            {list.map((command) => (
              <li key={command.id} className="grid gap-3 rounded-2xl border-2 border-line-soft p-4">
                <div>
                  <p className="text-xl font-bold">“{command.phrase}”</p>
                  <p className="text-ink-soft">
                    {actionLabel(command.action)} · Responde: “{command.response || defaultResponseFor(command.action)}”
                  </p>
                </div>
                <Switch
                  label="Activo"
                  checked={command.enabled}
                  onChange={(enabled) => void save(list.map((item) => (item.id === command.id ? { ...item, enabled } : item)))}
                />
                {confirmingId === command.id ? (
                  <div role="group" aria-label={`Confirmar eliminar ${command.phrase}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-danger-soft p-3">
                    <p className="font-bold text-danger">¿Eliminar este comando?</p>
                    <button type="button" className={buttonStyles.danger} onClick={() => remove(command)}>Sí, eliminar</button>
                    <button type="button" className={buttonStyles.secondary} onClick={() => setConfirmingId(null)}>No</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className={buttonStyles.secondary} onClick={() => edit(command)} aria-label={`Editar ${command.phrase}`}>
                      <Pencil size={20} aria-hidden="true" /> Editar
                    </button>
                    <button type="button" className={buttonStyles.danger} onClick={() => setConfirmingId(command.id)} aria-label={`Eliminar ${command.phrase}`}>
                      <Trash size={20} aria-hidden="true" /> Eliminar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
