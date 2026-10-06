/**
 * Lupa de lectura: una burbuja que amplía el texto bajo el cursor (o el elemento con foco del teclado)
 * sin cambiar el tamaño de toda la página. Vive en un Shadow DOM con `all: initial`, por eso los estilos de
 * UTP Class —ni el modo de alto contraste de Navi— pueden romperla.
 */
const LENS_SCALES = [1.5, 2, 2.5] as const;
export type LensScale = (typeof LENS_SCALES)[number];

const HOST_ID = 'navi-lens-host';
const BASE_FONT_PX = 18;
const MAX_CHARS = 260;
const TEXT_TARGETS = 'p, li, td, th, h1, h2, h3, h4, h5, h6, a, button, label, blockquote, dd, dt, figcaption, span, div, img, [role="button"], [role="link"]';
const HINT = 'Mueve el cursor sobre el texto que quieres ampliar.';

const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: 'Atkinson Hyperlegible', 'Segoe UI', system-ui, sans-serif; }
  .lens { position: fixed; z-index: 2; max-width: min(620px, calc(100vw - 16px)); min-width: 220px; padding: 16px 20px; border: 4px solid #1e3a8a; border-radius: 18px;
    background: #ffffff; color: #0f1b33; box-shadow: 0 12px 34px rgb(0 0 0 / 40%); font-weight: 700; line-height: 1.35; overflow-wrap: anywhere; pointer-events: none; }
  .lens.hc { background: #000000; color: #ffe600; border-color: #ffffff; }
  .toolbar { position: fixed; z-index: 3; left: 50%; bottom: 16px; transform: translateX(-50%); display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center;
    padding: 10px 12px; max-width: calc(100vw - 16px); border: 3px solid #1e3a8a; border-radius: 16px; background: #ffffff; color: #0f1b33; box-shadow: 0 8px 26px rgb(0 0 0 / 40%); pointer-events: auto; }
  .toolbar.hc { background: #000000; color: #ffffff; border-color: #ffffff; }
  .label { font-size: 15px; font-weight: 700; padding: 0 4px; }
  button { min-height: 44px; min-width: 44px; padding: 8px 14px; border: 2px solid currentColor; border-radius: 10px; background: transparent; color: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
  button[aria-pressed='true'] { background: #1e3a8a; border-color: #1e3a8a; color: #ffffff; }
  .hc button[aria-pressed='true'] { background: #ffe600; border-color: #ffe600; color: #000000; }
  button:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
  .hc button:focus-visible { outline-color: #00e5ff; }
  .close { margin-left: 4px; }
`;

interface LensState {
  host: HTMLElement;
  root: ShadowRoot;
  bubble: HTMLElement;
  toolbar: HTMLElement;
  scale: LensScale;
  contrast: boolean;
  teardown: () => void;
}

let lens: LensState | null = null;

export const isLensOpen = (): boolean => lens !== null;

/** Texto que se amplía para un elemento: el de su bloque más cercano, recortado. */
function lensTextFor(target: EventTarget | null): string {
  const element = target instanceof Element ? target : null;
  if (!element || element.id === HOST_ID || element.closest(`#${HOST_ID}`)) return '';
  if (element instanceof HTMLImageElement) return (element.alt || element.title || '').trim().slice(0, MAX_CHARS);
  const block = element.closest(TEXT_TARGETS) ?? element;
  const text = (block.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS).trimEnd()}…` : text;
}

function render(state: LensState, text: string): void {
  state.bubble.textContent = text || HINT;
  state.bubble.style.fontSize = `${BASE_FONT_PX * state.scale}px`;
}

function place(state: LensState, x: number, y: number): void {
  const { bubble } = state;
  const width = bubble.offsetWidth || 320;
  const height = bubble.offsetHeight || 120;
  const left = Math.min(Math.max(8, x + 22), window.innerWidth - width - 8);
  const below = y + 26 + height <= window.innerHeight - 8;
  const top = below ? y + 26 : Math.max(8, y - height - 18);
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
}

function applyContrast(state: LensState): void {
  state.bubble.classList.toggle('hc', state.contrast);
  state.toolbar.classList.toggle('hc', state.contrast);
  state.toolbar.querySelector('[data-action="contrast"]')?.setAttribute('aria-pressed', String(state.contrast));
}

function applyScale(state: LensState): void {
  state.toolbar.querySelectorAll<HTMLButtonElement>('[data-scale]').forEach((button) => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.scale) === state.scale));
  });
}

function closeLens(): void {
  lens?.teardown();
  lens = null;
}

/** Abre la lupa. onClosed se llama cuando el usuario la cierra (botón o Esc), para avisar al panel. */
function openLens(onClosed?: () => void): void {
  if (lens) return;
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-navi', '');
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLES;

  const bubble = document.createElement('div');
  bubble.className = 'lens';
  bubble.setAttribute('aria-hidden', 'true');

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Lupa de lectura');
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Lupa';
  toolbar.append(label);
  for (const scale of LENS_SCALES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.scale = String(scale);
    button.textContent = `${scale * 100} %`;
    button.setAttribute('aria-label', `Ampliar al ${scale * 100} por ciento`);
    toolbar.append(button);
  }
  const contrast = document.createElement('button');
  contrast.type = 'button';
  contrast.dataset.action = 'contrast';
  contrast.textContent = 'Contraste';
  contrast.setAttribute('aria-label', 'Alto contraste dentro de la lupa');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.dataset.action = 'close';
  close.textContent = 'Cerrar (Esc)';
  close.setAttribute('aria-label', 'Cerrar la lupa');
  toolbar.append(contrast, close);

  root.append(style, bubble, toolbar);
  document.body.append(host);

  const state: LensState = {
    host, root, bubble, toolbar, scale: 2, contrast: document.documentElement.classList.contains('navi-high-contrast'),
    teardown: () => undefined,
  };
  applyScale(state);
  applyContrast(state);
  render(state, '');
  place(state, window.innerWidth / 2 - 160, window.innerHeight / 3);

  const show = (target: EventTarget | null, x: number, y: number) => {
    render(state, lensTextFor(target));
    place(state, x, y);
  };
  const onMove = (event: MouseEvent) => show(event.target, event.clientX, event.clientY);
  const onFocus = (event: FocusEvent) => {
    const rect = event.target instanceof Element ? event.target.getBoundingClientRect() : null;
    if (rect) show(event.target, rect.left, rect.bottom);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    closeLens();
    onClosed?.();
  };
  const onToolbarClick = (event: Event) => {
    const button = (event.target as Element).closest('button');
    if (!button) return;
    if (button.dataset.scale) {
      state.scale = Number(button.dataset.scale) as LensScale;
      applyScale(state);
      render(state, state.bubble.textContent === HINT ? '' : state.bubble.textContent ?? '');
    } else if (button.dataset.action === 'contrast') {
      state.contrast = !state.contrast;
      applyContrast(state);
    } else if (button.dataset.action === 'close') {
      closeLens();
      onClosed?.();
    }
  };

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('keydown', onKey, true);
  toolbar.addEventListener('click', onToolbarClick);
  state.teardown = () => {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('focusin', onFocus, true);
    document.removeEventListener('keydown', onKey, true);
    host.remove();
  };
  lens = state;
}

export function toggleLens(onClosed?: () => void): boolean {
  if (lens) {
    closeLens();
    return false;
  }
  openLens(onClosed);
  return true;
}
