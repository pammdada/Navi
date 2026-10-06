import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MIN_CHROMA,
  colorDifference,
  colorWithLuminance,
  contrastRatio,
  ensureContrast,
  hueFamily,
  parseCssColor,
  parseHex,
  previewSamples,
  relativeLuminance,
  remapColor,
  rgbToOklch,
  simulateCvd,
  toHex,
  type CvdKind,
  type CvdMode,
  type Rgb,
} from '../utils/color-vision.ts';

const SUCCESS = parseHex('#2e7d32');
const DANGER = parseHex('#c62828');
const WARNING = parseHex('#f9a825');
const INFO = parseHex('#1565c0');
const ORANGE = parseHex('#e65100');
const TEAL = parseHex('#00838f');
const WHITE = parseHex('#ffffff');

const mapped = (rgb: Rgb, mode: CvdMode) => remapColor(rgb, mode) ?? rgb;
const seen = (a: Rgb, b: Rgb, kind: CvdKind) => colorDifference(simulateCvd(a, kind), simulateCvd(b, kind));

describe('lectura de colores', () => {
  it('entiende lo que devuelve getComputedStyle', () => {
    assert.deepEqual(parseCssColor('rgb(46, 125, 50)'), { r: 46, g: 125, b: 50, a: 1 });
    assert.deepEqual(parseCssColor('rgba(0, 0, 0, 0)'), { r: 0, g: 0, b: 0, a: 0 });
    assert.deepEqual(parseCssColor('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
    assert.equal(parseCssColor('transparent'), null);
    assert.equal(parseCssColor('oklch(0.5 0.1 200)'), null);
    assert.equal(toHex(parseHex('#2e7d32')), '#2e7d32');
  });

  it('clasifica los matices típicos de una interfaz', () => {
    const family = (hex: string) => hueFamily(rgbToOklch(parseHex(hex)).h);
    assert.equal(family('#c62828'), 'red');
    assert.equal(family('#dc3545'), 'red');
    assert.equal(family('#e65100'), 'orange');
    assert.equal(family('#f9a825'), 'yellow');
    assert.equal(family('#2e7d32'), 'green');
    assert.equal(family('#28a745'), 'green');
    assert.equal(family('#00838f'), 'cyan');
    assert.equal(family('#1565c0'), 'blue');
    assert.equal(family('#0d6efd'), 'blue');
    assert.equal(family('#6a1b9a'), 'purple');
  });
});

describe('remapeo de colores', () => {
  it('rojo/verde: solo cambia el verde; rojo, naranja, amarillo y azul quedan igual', () => {
    assert.ok(remapColor(SUCCESS, 'red-green-safe'));
    for (const untouched of [DANGER, ORANGE, WARNING, INFO]) assert.equal(remapColor(untouched, 'red-green-safe'), null);
  });

  it('azul/amarillo: solo cambia el azul y el cian; verde, rojo y amarillo quedan igual', () => {
    assert.ok(remapColor(INFO, 'blue-yellow-safe'));
    assert.ok(remapColor(TEAL, 'blue-yellow-safe'));
    for (const untouched of [SUCCESS, DANGER, WARNING]) assert.equal(remapColor(untouched, 'blue-yellow-safe'), null);
  });

  it('los verdes pasan a azul verdoso y los azules a magenta', () => {
    assert.equal(hueFamily(rgbToOklch(mapped(SUCCESS, 'red-green-safe')).h), 'cyan');
    assert.equal(hueFamily(rgbToOklch(mapped(INFO, 'blue-yellow-safe')).h), 'purple');
  });

  it('no toca grises, blancos ni negros', () => {
    for (const neutral of ['#ffffff', '#000000', '#333333', '#f3f3f3', '#808080']) {
      assert.equal(remapColor(parseHex(neutral), 'red-green-safe'), null);
      assert.equal(remapColor(parseHex(neutral), 'blue-yellow-safe'), null);
    }
    assert.ok(rgbToOklch(parseHex('#f3f5fb')).C < MIN_CHROMA);
  });

  it('conserva la luminancia, así que el contraste no cambia', () => {
    const samples = ['#2e7d32', '#28a745', '#1b5e20', '#e8f5e9', '#a5d6a7', '#1565c0', '#0d47a1', '#e3f2fd', '#90caf9', '#00838f', '#4dd0e1'];
    for (const hex of samples) {
      const original = parseHex(hex);
      for (const mode of ['red-green-safe', 'blue-yellow-safe'] as const) {
        const result = remapColor(original, mode);
        if (!result) continue;
        assert.ok(Math.abs(relativeLuminance(result) - relativeLuminance(original)) < 0.02, `${hex} en ${mode}: ${toHex(result)}`);
      }
    }
  });

  it('un botón de color con texto blanco sigue siendo legible', () => {
    for (const [hex, mode] of [['#2e7d32', 'red-green-safe'], ['#1b5e20', 'red-green-safe'], ['#1565c0', 'blue-yellow-safe'], ['#0d47a1', 'blue-yellow-safe']] as const) {
      const before = contrastRatio(WHITE, parseHex(hex));
      const after = contrastRatio(WHITE, mapped(parseHex(hex), mode));
      assert.ok(before >= 4.5, `${hex} debía ser legible al inicio`);
      assert.ok(after >= 4.5, `${hex} → ${toHex(mapped(parseHex(hex), mode))} perdió contraste (${after.toFixed(2)})`);
      assert.ok(Math.abs(after - before) < 0.4);
    }
  });

  it('el resultado siempre es un color válido y no se vuelve a remapear', () => {
    for (let hue = 0; hue < 360; hue += 15) {
      for (const L of [0.3, 0.5, 0.7, 0.9]) {
        const color = colorWithLuminance(0.15, hue, L * L);
        for (const channel of [color.r, color.g, color.b]) assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255);
      }
    }
    assert.equal(remapColor(mapped(SUCCESS, 'red-green-safe'), 'red-green-safe'), null);
    assert.equal(remapColor(mapped(INFO, 'blue-yellow-safe'), 'blue-yellow-safe'), null);
  });

  it('si el texto pierde legibilidad, usa negro o blanco', () => {
    const yellowBackground = parseHex('#f9a825');
    assert.deepEqual(ensureContrast(WHITE, yellowBackground, 4.5), { r: 0, g: 0, b: 0 });
    assert.deepEqual(ensureContrast(parseHex('#222222'), yellowBackground, 4.5), parseHex('#222222'));
    assert.deepEqual(ensureContrast(parseHex('#ffff00'), parseHex('#1b5e20'), 4.5), parseHex('#ffff00'));
  });
});

describe('qué ve una persona con daltonismo (simulación Machado 2009)', () => {
  it('rojo/verde: el verde y el rojo dejan de confundirse (deuteranopía)', () => {
    const before = seen(SUCCESS, DANGER, 'deutan');
    const after = seen(mapped(SUCCESS, 'red-green-safe'), DANGER, 'deutan');
    assert.ok(before < 6, `antes debía confundirse (${before.toFixed(1)})`);
    assert.ok(after >= 12, `después debe distinguirse (${after.toFixed(1)})`);
  });

  it('rojo/verde: el verde y el naranja dejan de confundirse (protanopía)', () => {
    const before = seen(SUCCESS, ORANGE, 'protan');
    const after = seen(mapped(SUCCESS, 'red-green-safe'), ORANGE, 'protan');
    assert.ok(before < 4, `antes debía confundirse (${before.toFixed(1)})`);
    assert.ok(after >= 10, `después debe distinguirse (${after.toFixed(1)})`);
  });

  it('rojo/verde: el verde sigue distinguiéndose del azul y del rojo', () => {
    for (const kind of ['protan', 'deutan'] as const) {
      const green = mapped(SUCCESS, 'red-green-safe');
      assert.ok(seen(green, INFO, kind) >= 10, `verde~azul ${kind}`);
      assert.ok(seen(green, DANGER, kind) >= 12, `verde~rojo ${kind}`);
    }
  });

  it('azul/amarillo: el azul y el verde dejan de confundirse (tritanopía)', () => {
    const before = seen(SUCCESS, INFO, 'tritan');
    const after = seen(SUCCESS, mapped(INFO, 'blue-yellow-safe'), 'tritan');
    assert.ok(before < 6, `antes debía confundirse (${before.toFixed(1)})`);
    assert.ok(after >= 15, `después debe distinguirse (${after.toFixed(1)})`);
  });

  it('azul/amarillo: el cian y el verde se distinguen, y el azul sigue distinguiéndose del rojo', () => {
    assert.ok(seen(SUCCESS, mapped(TEAL, 'blue-yellow-safe'), 'tritan') >= 12);
    assert.ok(seen(DANGER, mapped(INFO, 'blue-yellow-safe'), 'tritan') >= 10);
  });

  it('azul/amarillo: el amarillo sigue distinguiéndose del blanco', () => {
    assert.ok(seen(WARNING, WHITE, 'tritan') >= 10);
  });
});

describe('vista previa de las paletas', () => {
  it('estándar y alto contraste no cambian los colores de muestra', () => {
    for (const mode of ['standard', 'high-contrast'] as const) {
      for (const sample of previewSamples(mode)) assert.equal(sample.before, sample.after);
    }
  });

  it('cada paleta cambia exactamente lo que dice', () => {
    const changed = (mode: CvdMode) => previewSamples(mode).filter((sample) => sample.before !== sample.after).map((sample) => sample.id);
    assert.deepEqual(changed('red-green-safe'), ['success']);
    assert.deepEqual(changed('blue-yellow-safe'), ['info']);
  });
});
