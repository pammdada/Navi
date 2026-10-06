// Colores para daltonismo. Módulo sin dependencias del navegador: se usa en la página y en las pruebas.
//
// Idea: no se pinta encima ni se aplica un filtro. Se toma cada color real de la página, se mira su matiz y,
// si pertenece a un matiz que ese tipo de visión confunde, se gira a otro matiz (en OKLCH) conservando la
// LUMINANCIA relativa. Como el contraste WCAG depende solo de la luminancia, un botón que tenía contraste 5,6
// sigue teniendo 5,6 después del cambio.

export interface Rgb { r: number; g: number; b: number }

export type CvdMode = 'red-green-safe' | 'blue-yellow-safe';
export type HueFamily = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple';
export type CvdKind = 'protan' | 'deutan' | 'tritan';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const toLinear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (linear: number) => {
  const c = clamp01(linear);
  return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
};

export const relativeLuminance = ({ r, g, b }: Rgb): number => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

export const toHex = ({ r, g, b }: Rgb): string => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

export function parseHex(hex: string): Rgb {
  const value = hex.replace('#', '');
  return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) };
}

/** Lee `rgb(…)` / `rgba(…)` (lo que devuelve getComputedStyle). Devuelve null si no se entiende. */
export function parseCssColor(value: string): (Rgb & { a: number }) | null {
  const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(value.trim());
  if (!match) return null;
  const alphaRaw = match[4];
  const alpha = alphaRaw === undefined ? 1 : alphaRaw.endsWith('%') ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);
  return { r: Math.round(+match[1]!), g: Math.round(+match[2]!), b: Math.round(+match[3]!), a: alpha };
}

// ---- OKLab / OKLCH ----

type Triple = [number, number, number];

function linearToOklab([r, g, b]: Triple): Triple {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([L, a, b]: Triple): Triple {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const rgbToLinear = ({ r, g, b }: Rgb): Triple => [toLinear(r), toLinear(g), toLinear(b)];
const linearToRgb = ([r, g, b]: Triple): Rgb => ({ r: fromLinear(r), g: fromLinear(g), b: fromLinear(b) });
const inGamut = (linear: Triple) => linear.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

export function rgbToOklch(rgb: Rgb): { L: number; C: number; h: number } {
  const [L, a, b] = linearToOklab(rgbToLinear(rgb));
  return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

/** Pasa a RGB lineal reduciendo la saturación hasta que el color existe en sRGB. */
function oklchToLinearInGamut(L: number, C: number, h: number): Triple {
  const rad = (h * Math.PI) / 180;
  const at = (chroma: number) => oklabToLinear([L, chroma * Math.cos(rad), chroma * Math.sin(rad)]);
  const full = at(C);
  if (inGamut(full)) return full;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(at(mid))) lo = mid;
    else hi = mid;
  }
  return at(lo);
}

const luminanceOfLinear = ([r, g, b]: Triple) => 0.2126 * clamp01(r) + 0.7152 * clamp01(g) + 0.0722 * clamp01(b);

/** Color con el matiz y la saturación dados y la luminancia relativa pedida (se busca la claridad por bisección). */
export function colorWithLuminance(C: number, h: number, targetY: number): Rgb {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 32; i += 1) {
    const mid = (lo + hi) / 2;
    if (luminanceOfLinear(oklchToLinearInGamut(mid, C, h)) < targetY) lo = mid;
    else hi = mid;
  }
  return linearToRgb(oklchToLinearInGamut((lo + hi) / 2, C, h));
}

// ---- Matices ----

/**
 * Familias de matiz en grados OKLCH. Referencias: rojo #c62828 ≈ 27°, naranja #e65100 ≈ 40°, ámbar #f9a825 ≈ 72°,
 * amarillo #ffc107 ≈ 85°, amarillo puro ≈ 110°, verde #2e7d32 ≈ 144°, cian #00838f ≈ 206°, azul #1565c0 ≈ 256°, púrpura #6a1b9a ≈ 308°.
 */
export function hueFamily(hue: number): HueFamily {
  const h = ((hue % 360) + 360) % 360;
  if (h >= 345 || h < 38) return 'red';
  if (h < 65) return 'orange';
  if (h < 118) return 'yellow';
  if (h < 180) return 'green';
  if (h < 230) return 'cyan';
  if (h < 293) return 'blue';
  return 'purple';
}

/**
 * A qué matiz se gira cada familia confundible. Lo que no aparece aquí no se toca. Los ángulos se eligieron
 * midiendo, con la simulación de abajo, la diferencia entre los pares que cada tipo de visión confunde
 * (ver tests/color-vision.test.ts):
 *  - Rojo/verde (protanopía, deuteranopía): el verde pasa a un azul verdoso (200°). Verde~rojo sube de 4,3 a 14,2
 *    en deuteranopía y verde~naranja de 2,2 a 13,1 en protanopía. El naranja no se toca: girarlo empeoraba el resultado.
 *  - Azul/amarillo (tritanopía): el azul y el cian pasan a magenta (330°). Azul~verde sube de 4,4 a 20,5 y
 *    rojo~azul se mantiene en 12,5. Girar el amarillo no mejoraba nada, así que no se toca.
 */
const targetHues: Record<CvdMode, Partial<Record<HueFamily, number>>> = {
  'red-green-safe': { green: 200 },
  'blue-yellow-safe': { blue: 330, cyan: 330 },
};

/** Saturación mínima para considerar que un color tiene matiz (por debajo es gris, blanco o negro). */
export const MIN_CHROMA = 0.018;

/** Nuevo color para `rgb` en ese modo, o null si no hay que cambiarlo. La luminancia se conserva. */
export function remapColor(rgb: Rgb, mode: CvdMode): Rgb | null {
  const { C, h } = rgbToOklch(rgb);
  if (C < MIN_CHROMA) return null;
  const target = targetHues[mode][hueFamily(h)];
  if (target === undefined) return null;
  return colorWithLuminance(C, target, relativeLuminance(rgb));
}

/** Si tras el cambio el texto perdió legibilidad frente a su fondo, usa negro o blanco (el que mejor contraste dé). */
export function ensureContrast(foreground: Rgb, background: Rgb, minimum: number): Rgb {
  if (contrastRatio(foreground, background) >= minimum) return foreground;
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  return contrastRatio(black, background) >= contrastRatio(white, background) ? black : white;
}

// ---- Simulación de daltonismo (Machado, Oliveira y Fernandes, 2009; severidad completa) ----

const cvdMatrices: Record<CvdKind, [Triple, Triple, Triple]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

/** Cómo vería este color una persona con ese tipo de daltonismo. */
export function simulateCvd(rgb: Rgb, kind: CvdKind): Rgb {
  const [r, g, b] = rgbToLinear(rgb);
  const [row1, row2, row3] = cvdMatrices[kind];
  const apply = (row: Triple) => row[0] * r + row[1] * g + row[2] * b;
  return linearToRgb([apply(row1), apply(row2), apply(row3)]);
}

/** Diferencia perceptual entre dos colores (distancia OKLab × 100). Más de ~10 se distingue con claridad. */
export function colorDifference(a: Rgb, b: Rgb): number {
  const [L1, a1, b1] = linearToOklab(rgbToLinear(a));
  const [L2, a2, b2] = linearToOklab(rgbToLinear(b));
  return 100 * Math.hypot(L1 - L2, a1 - a2, b1 - b2);
}

// ---- Colores típicos de interfaz, para las vistas previas y las pruebas ----

const UI_SAMPLES = [
  { id: 'success', label: 'Correcto', hex: '#2e7d32' },
  { id: 'danger', label: 'Error', hex: '#c62828' },
  { id: 'warning', label: 'Aviso', hex: '#f9a825' },
  { id: 'info', label: 'Información', hex: '#1565c0' },
] as const;

/** Cómo quedan los colores típicos en cada modo (para mostrarle al usuario qué hace la paleta). */
export function previewSamples(mode: CvdMode | 'standard' | 'high-contrast'): { id: string; label: string; before: string; after: string }[] {
  return UI_SAMPLES.map(({ id, label, hex }) => {
    const mapped = mode === 'standard' || mode === 'high-contrast' ? null : remapColor(parseHex(hex), mode);
    return { id, label, before: hex, after: mapped ? toHex(mapped) : hex };
  });
}
