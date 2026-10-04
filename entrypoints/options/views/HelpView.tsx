import { Accessibility, Keyboard, LifeBuoy, RotateCcw, ScreenShare } from 'lucide-react';
import { Card, ViewHeader, buttonStyles } from '../components/ui';
import { useNavi } from '../state';

const shortcuts = [
  { keys: ['Alt', 'A'], action: 'Abrir o cerrar el botón de Accesibilidad' },
  { keys: ['Tab'], action: 'Ir al siguiente elemento' },
  { keys: ['Shift', 'Tab'], action: 'Volver al elemento anterior' },
  { keys: ['Enter'], action: 'Abrir un enlace o pulsar un botón' },
  { keys: ['Espacio'], action: 'Activar o desactivar un interruptor' },
  { keys: ['Esc'], action: 'Cerrar un menú o una ventana' },
];

const faqs = [
  {
    question: '¿Navi guarda mis datos?',
    answer: 'Solo tu nombre y tus ajustes, en tu navegador (y en tu cuenta de Chrome si tienes la sincronización activada). Navi no los envía a ningún otro lugar.',
  },
  {
    question: '¿Por qué no funciona el micrófono?',
    answer: 'El navegador debe tener permiso para usarlo. Pulsa el candado junto a la dirección de la página y permite el micrófono.',
  },
  {
    question: '¿En qué páginas funciona Navi?',
    answer: 'El panel lateral funciona en UTP Class (class.utp.edu.pe). Tus ajustes se aplican ahí automáticamente.',
  },
  {
    question: '¿Puedo deshacer un cambio?',
    answer: 'Sí. Cada vez que cambias un ajuste aparece un aviso con el botón "Deshacer". También puedes restablecer todo en Configuración.',
  },
];

export function HelpView() {
  const { updateProfile } = useNavi();
  return (
    <>
      <ViewHeader icon={LifeBuoy} title="Ayuda" intro="Atajos de teclado, respuestas a dudas frecuentes y la guía de bienvenida." />

      <Card title="Guía de bienvenida" icon={RotateCcw} description="Vuelve a ver los 5 pasos para conocer Navi y ajustar tu perfil.">
        <button type="button" className={buttonStyles.primary} onClick={() => void updateProfile({ onboardingCompleted: false, onboardingStep: 0 })}>
          <RotateCcw size={20} aria-hidden="true" />
          Ver la guía otra vez
        </button>
      </Card>

      <Card title="Atajos de teclado" icon={Keyboard} description="Puedes usar todo Navi sin mouse.">
        <table className="w-full border-collapse text-left text-lg">
          <caption className="sr-only">Atajos de teclado de Navi</caption>
          <thead>
            <tr className="border-b-2 border-line">
              <th scope="col" className="py-2 pr-4">
                Teclas
              </th>
              <th scope="col" className="py-2">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map(({ keys, action }) => (
              <tr key={action} className="border-b border-line-soft">
                <td className="py-3 pr-4 whitespace-nowrap">
                  {keys.map((key, index) => (
                    <span key={key}>
                      {index > 0 && ' + '}
                      <kbd className="rounded-lg border-2 border-b-4 border-line bg-tint px-2 py-0.5 font-sans font-bold">{key}</kbd>
                    </span>
                  ))}
                </td>
                <td className="py-3">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Preguntas frecuentes" icon={LifeBuoy}>
        <div className="grid gap-3">
          {faqs.map(({ question, answer }) => (
            <details key={question} className="group rounded-2xl border-2 border-line-soft open:border-brand">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 text-lg font-bold">
                {question}
                <span aria-hidden="true" className="text-2xl transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-4 pb-4 text-lg text-ink-soft">{answer}</p>
            </details>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Lectores de pantalla" icon={ScreenShare}>
          <p className="text-lg">
            Navi está construido con HTML semántico, etiquetas en todos los controles y avisos accesibles, para funcionar con NVDA, JAWS, Narrador de
            Windows y TalkBack.
          </p>
        </Card>
        <Card title="Nuestro compromiso" icon={Accessibility}>
          <p className="text-lg">
            Seguimos las pautas <abbr title="Web Content Accessibility Guidelines">WCAG</abbr> 2.2 nivel AA y las heurísticas de usabilidad de Nielsen. Si
            algo no te funciona, cuéntaselo al equipo del proyecto.
          </p>
        </Card>
      </div>
    </>
  );
}
