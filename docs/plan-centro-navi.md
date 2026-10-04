# Plan de implementación: rediseño de "Configuración de Navi"

## 1. Objetivo

Convertir la página de opciones de la extensión (`entrypoints/options/`) en el **Centro Navi**, una página completa con:

1. **Onboarding** la primera vez que se abre: pide el nombre, explica qué hace Navi y para qué sirve, y deja configurado un perfil inicial.
2. **Landing (Inicio)** personalizada ("Hola, {nombre}") con opciones grandes y un selector de accesibilidad rápida.
3. **Barra lateral** para navegar entre las secciones del prototipo: Inicio, Lectura de información, Asistente de voz, Subtítulos y multimedia, Configuración de accesibilidad y Ayuda.
4. **Botón de accesibilidad** fijo y siempre visible, que abre un panel con ajustes inmediatos.
5. **Logo propio** en SVG, accesible y reutilizable en el panel lateral, el popup y los iconos.

La página debe cumplir **WCAG 2.2 nivel AA** y seguir las **10 heurísticas de Nielsen**, porque eso es lo que evalúa el curso.

### Usuarios y qué necesita cada uno

| Usuario | Necesidad principal | Cómo responde la página |
|---|---|---|
| Discapacidad visual | Leer sin esfuerzo o escuchar | Texto ampliable, alto contraste, botón "Escuchar" en cada sección, buena compatibilidad con lectores de pantalla |
| Discapacidad auditiva | No depender del audio | Subtítulos automáticos, todo mensaje de voz también se muestra como texto |
| Discapacidad motora | Menos precisión y menos clics | Botones de 48 px como mínimo, uso completo con teclado, comandos de voz, atajos |
| Dificultad cognitiva leve | Claridad, un paso a la vez | Modo simplificado, lenguaje sencillo, onboarding por pasos, sin límites de tiempo |
| Adultos mayores | Confianza y pocas opciones | Perfiles de un clic, guardado automático con "Deshacer", la guía se puede volver a ver |

---

## 2. Arquitectura propuesta

Se mantiene el stack actual: **WXT + React 19 + Tailwind v4**. Tailwind ya está configurado en `wxt.config.ts` pero todavía no se usa; esta página empezaría a usarlo y los colores se definirían como variables CSS.

### Navegación
Se usa enrutado por hash (`#/inicio`, `#/lectura`, `#/voz`, `#/multimedia`, `#/configuracion`, `#/ayuda`) con un hook propio `useHashRoute`, sin agregar dependencias. Así el panel lateral puede enlazar directo a una sección (`/options.html#/voz`) y los botones Atrás/Adelante del navegador funcionan.

### Estructura de archivos

```
entrypoints/options/
  index.html                 ← lang="es", título dinámico
  main.tsx
  Options.tsx                ← decide entre onboarding o la app
  options.css                ← @import "tailwindcss" + tokens + modos (contraste, tamaños)
  hooks/
    usePreferences.ts        ← lee y vigila storage, guarda automáticamente, permite deshacer
    useHashRoute.ts
    useAnnouncer.ts          ← región aria-live compartida
  components/
    NaviLogo.tsx             ← SVG accesible
    AppShell.tsx             ← skip link + header + sidebar + main + footer
    Sidebar.tsx
    AccessibilityButton.tsx  ← botón flotante y diálogo de ajustes rápidos
    QuickProfiles.tsx        ← perfiles de un clic (se usa en onboarding, landing y diálogo)
    ListenButton.tsx         ← "Escuchar esta sección" (usa utils/speech/synthesis)
    Toast.tsx                ← "Guardado · Deshacer"
    controls/ (Switch, FontSizePicker, Slider: accesibles y con etiqueta)
  onboarding/
    Onboarding.tsx           ← controla los pasos, el progreso y el foco
    steps/Welcome.tsx, NameStep.tsx, NeedsStep.tsx, AdjustStep.tsx, HowToStep.tsx
  views/
    HomeView.tsx             ← landing
    ReadingView.tsx, VoiceView.tsx, MediaView.tsx, SettingsView.tsx, HelpView.tsx
utils/
  storage.ts                 ← + userProfile, + reduceMotion
  profiles.ts                ← perfiles de necesidad → preferencias (lógica compartida)
assets/
  navi-logo.svg
```

### Cambios en `utils/storage.ts`

```ts
export type NeedProfile = 'visual' | 'auditiva' | 'motora' | 'cognitiva' | 'mayor';

export interface UserProfile {
  name: string;               // puede quedar vacío; el nombre es opcional
  needs: NeedProfile[];
  onboardingCompleted: boolean;
}
export const userProfile = storage.defineItem<UserProfile>('sync:user-profile', { fallback: {...} });
```

A `AccessibilityPreferences` se le agrega `reduceMotion: boolean`. Los demás ajustes ya existen.

### Perfiles de necesidad (`utils/profiles.ts`)

| Perfil | Preferencias que activa |
|---|---|
| Visual | `highContrast`, `fontSize: 'x-large'`, `voiceEnabled` |
| Auditiva | `captionsEnabled` |
| Motora | `voiceEnabled` (y la guía resalta los atajos de teclado) |
| Cognitiva | `simplifiedMode`, `fontSize: 'large'`, `reduceMotion` |
| Adulto mayor | `fontSize: 'large'`, `simplifiedMode`, `speechRate: 0.9` |

Se pueden elegir varios perfiles a la vez y sus ajustes se combinan. El panel lateral también usaría este mismo archivo.

---

## 3. Diseño de cada pantalla

### 3.1 Onboarding (primera visita)

Se muestra cuando `onboardingCompleted === false`. Se puede volver a abrir desde **Ayuda → "Ver la guía otra vez"**.

| Paso | Contenido | Detalles de UX y accesibilidad |
|---|---|---|
| 1. Bienvenida | Logo, "Hola, soy Navi", qué es en una frase y botón **"Escuchar esta presentación"** | Desde el primer paso ya se puede activar el contraste o agrandar la letra, para que la persona pueda leer el resto de la guía |
| 2. Tu nombre | `<label for>` "¿Cómo te llamas?" + input con `autocomplete="given-name"` | El nombre es opcional ("Prefiero no decirlo"). Si se valida, el error se muestra en texto y se asocia con `aria-describedby` |
| 3. ¿Qué te ayudaría? | 5 tarjetas grandes de selección múltiple (`fieldset` + `legend` + checkbox) | Cada tarjeta tiene ícono, título y una línea de descripción. El texto dice "Puedes elegir varias o ninguna" |
| 4. Ajusta tu experiencia | Vista previa en vivo: tamaño de letra, contraste, velocidad de voz con botón "Probar voz" | El cambio se ve al instante, sin tener que imaginar el resultado |
| 5. Cómo usar Navi | Fijar la extensión, abrir el panel lateral en UTP Class, ejemplos de comandos de voz y atajos | Termina con "Ir al inicio". Pasa la etapa del onboarding a la landing personalizada |

En todos los pasos:
- Indicador **"Paso 2 de 5"** en texto y con `<progress>` o `aria-valuenow`.
- Botones **Atrás**, **Siguiente** y **Saltar guía**, siempre en el mismo lugar.
- Al cambiar de paso, el foco pasa al `<h1>` del paso (`tabIndex={-1}`) y se actualiza `document.title`.
- No hay límites de tiempo, carruseles automáticos ni animaciones cuando `reduceMotion` está activo o el sistema tiene `prefers-reduced-motion`.
- El avance se guarda: si la persona cierra la pestaña, retoma en el mismo paso.

### 3.2 Landing (Inicio)

1. **Encabezado**: logo y "Hola, {nombre} 👋" (o "Hola" si no dio nombre), más un resumen en una línea de lo que tiene activado ("Tienes activo: letra grande, alto contraste").
2. **Tres acciones grandes** (tarjetas de 2 columnas que pasan a 1 en pantallas angostas):
   - 🔊 Escuchar contenido → Lectura
   - 🎙️ Hablar con Navi → Asistente de voz
   - ⚙️ Ajustar accesibilidad → Configuración
3. **Selector de accesibilidad rápida**: `QuickProfiles`, con los perfiles de un clic.
4. **"¿Qué puede hacer Navi?"**: cuadrícula con las 9 funciones de la propuesta. Cada una con ícono, nombre, una frase y un enlace a su sección.
5. **"¿Para quién es Navi?"**: los 5 grupos de usuarios, en lenguaje inclusivo.
6. **Primeros pasos en UTP Class**: cómo abrir el panel lateral.

### 3.3 Barra lateral

- `<nav aria-label="Secciones de Navi">` con una lista de enlaces; la sección actual lleva `aria-current="page"`.
- Cada enlace tiene ícono y texto (nunca solo ícono) y mide al menos 48 px de alto.
- En pantallas angostas (menos de 900 px) se oculta detrás de un botón "Menú" con `aria-expanded` y `aria-controls`. Se cierra con Esc y devuelve el foco al botón.
- Abajo: nombre del usuario, "Ver la guía otra vez" y "Restablecer ajustes" (este último pide confirmación).

### 3.4 Secciones

| Vista | Contenido |
|---|---|
| Lectura de información | Tamaño de letra (A, A+, A++ con vista previa), cambio de contraste, velocidad y volumen de lectura, botón "Escuchar texto de ejemplo" |
| Asistente de voz | Activar comandos, lista de comandos disponibles (sale de `utils/speech/commands.ts`), botón "Probar micrófono" que muestra lo que entendió. Las respuestas habladas también se muestran en texto |
| Subtítulos y multimedia | Activar subtítulos automáticos y explicación de cuándo están disponibles |
| Configuración de accesibilidad | Todos los ajustes juntos: tamaño, subtítulos, modo simplificado, reducir movimiento, idioma |
| Ayuda | Atajos de teclado, preguntas frecuentes, volver a ver la guía, sección "Navi y la accesibilidad" (WCAG) |

**Guardado:** se elimina el botón "Guardar configuración". Cada cambio se guarda solo y aparece un aviso "Guardado · **Deshacer**" en una región `role="status"`. Así nadie pierde cambios por olvidar guardar (heurísticas 1, 3 y 5).

### 3.5 Botón de accesibilidad

- Botón flotante abajo a la derecha, de 64 px, con el ícono universal de accesibilidad y el texto **"Accesibilidad"** visible (no solo el ícono). Alto contraste con el fondo y anillo de foco grueso.
- Atajo **Alt + A**, que también se muestra en el `title` y en la Ayuda.
- Abre un `<dialog>` nativo modal: atrapa el foco, se cierra con Esc y devuelve el foco al botón al cerrar.
- Contiene: A− / A / A+, alto contraste, modo simplificado, lectura en voz alta de la página, reducir movimiento y "Restablecer".
- Los cambios se aplican en vivo en toda la página.

### 3.6 Logo

Concepto: una **"N" formada por un camino que guía** (Navi = navegar), con **ondas de sonido** que salen de la diagonal (voz y lectura) y un **punto de destino** (llegar a tu clase).
- SVG con `role="img"` y `<title>Navi</title>`. Cuando va junto al texto "Navi" se marca `aria-hidden`.
- Colores: azul profundo `#1E3A8A` y ámbar `#F59E0B` (el ámbar se usa en el ícono, no como color de texto sobre blanco).
- Tiene una versión monocroma para el modo de alto contraste.
- Se exportan los PNG de `public/icon/` (16, 32, 48, 96, 128) para que el ícono de la barra del navegador sea el mismo logo.

---

## 4. Cumplimiento de accesibilidad (WCAG 2.2 AA)

| Criterio | Cómo se cumple |
|---|---|
| 1.1.1 Contenido no textual | Íconos decorativos con `aria-hidden`; el logo con `<title>` |
| 1.3.1 Info y relaciones | Landmarks `header`/`nav`/`main`/`footer`, un solo `h1` por vista y jerarquía h2/h3, `fieldset`/`legend`, `label` en todos los campos |
| 1.4.3 / 1.4.6 Contraste | 4.5:1 como mínimo en modo normal y 7:1 en modo de alto contraste (nivel AAA) |
| 1.4.4 / 1.4.10 Cambio de tamaño y reflujo | Unidades `rem`; sin scroll horizontal a 320 px de ancho ni con zoom al 400 % |
| 1.4.11 Contraste de componentes | Bordes de controles y anillo de foco con 3:1 como mínimo |
| 1.4.12 Espaciado de texto | El diseño no se rompe al aumentar interlineado y espaciado |
| 2.1.1 Teclado | Todo funciona con teclado; sin trampas fuera de los modales |
| 2.3.3 / prefers-reduced-motion | Animaciones desactivables |
| 2.4.1 Saltar bloques | Enlace "Saltar al contenido" como primer elemento enfocable |
| 2.4.2 Título de página | `document.title` cambia según la vista o el paso: "Paso 2 de 5 · Navi" |
| 2.4.3 Orden del foco | Orden lógico y foco gestionado al cambiar de vista o paso |
| 2.4.7 / 2.4.11 Foco visible y no tapado | Anillo de 3 px; el botón flotante no tapa el foco (`scroll-padding`) |
| 2.5.8 Tamaño del objetivo | 48 × 48 px como mínimo (más que los 24 px que pide la norma) |
| 3.1.1 Idioma | `lang="es"` |
| 3.2.6 Ayuda consistente | El botón de accesibilidad y el enlace de Ayuda están en el mismo lugar en todas las vistas |
| 3.3.1 / 3.3.2 Errores y etiquetas | Mensajes en texto asociados al campo y sin depender solo del color |
| 4.1.2 / 4.1.3 Nombre, rol, valor y mensajes de estado | Switch con `role="switch"` + `aria-checked`; avisos en `aria-live="polite"` |

## 5. Heurísticas de Nielsen

| Heurística | Aplicación |
|---|---|
| 1. Visibilidad del estado del sistema | Progreso del onboarding, aviso "Guardado", resumen de ajustes activos en Inicio |
| 2. Relación con el mundo real | Lenguaje cotidiano ("letra más grande" en lugar de "font-size"), íconos conocidos |
| 3. Control y libertad | Deshacer, Atrás, Saltar guía, Restablecer |
| 4. Consistencia y estándares | Mismos controles en todas las vistas; ícono universal de accesibilidad |
| 5. Prevención de errores | Guardado automático; confirmación antes de restablecer |
| 6. Reconocer antes que recordar | Lista de comandos de voz visible; atajos en Ayuda |
| 7. Flexibilidad y eficiencia | Perfiles de un clic para principiantes; atajos y voz para usuarios avanzados |
| 8. Diseño estético y minimalista | Una tarea principal por pantalla; el modo simplificado oculta lo secundario |
| 9. Ayudar a reconocer y corregir errores | Mensajes claros en el micrófono ("No te escuché, revisa el permiso del micrófono") |
| 10. Ayuda y documentación | Sección de Ayuda y la guía que se puede repetir |

---

## 6. Integración con el resto de la extensión

- `background.ts`: con `runtime.onInstalled` y `reason === 'install'`, abre `options.html` para que el onboarding aparezca justo después de instalar.
- **Panel lateral**: saluda con el nombre ("Hola, Ana") y su enlace de configuración apunta a `options.html#/configuracion`.
- **Popup**: usa el nuevo logo y enlaza a `options.html#/inicio`.
- Los ajustes siguen en `accessibilityPreferences`, así que el content script de UTP Class los aplica igual que ahora.

## 7. Fases de implementación

| Fase | Entregable | Archivos |
|---|---|---|
| 1. Base | Storage, perfiles, tokens de color, logo SVG | `utils/storage.ts`, `utils/profiles.ts`, `options.css`, `NaviLogo.tsx` |
| 2. Estructura | AppShell, barra lateral, rutas, botón de accesibilidad, avisos | `AppShell`, `Sidebar`, `AccessibilityButton`, hooks |
| 3. Onboarding | Los 5 pasos con gestión del foco y progreso guardado | `onboarding/*` |
| 4. Vistas | Landing y las 5 secciones; se retira el formulario anterior | `views/*` |
| 5. Integración | Background, panel lateral, popup, íconos PNG | `background.ts`, `SidePanel.tsx`, `App.tsx`, `public/icon/*` |
| 6. Validación | `npm run compile`, revisión con axe DevTools y Lighthouse (meta: 100 en accesibilidad), solo teclado, NVDA, zoom al 200 % y 400 %, ancho de 320 px | — |

## 8. Decisiones por confirmar

1. **Tailwind en esta página** (recomendado, porque ya está instalado) o seguir con CSS propio como el panel lateral.
2. **Guardado automático con Deshacer** (recomendado) o mantener el botón "Guardar".
3. **Concepto del logo**: la "N" como camino con ondas de sonido, o prefieres otra idea.
4. **Nombre opcional** (recomendado, por privacidad e inclusión) u obligatorio.
