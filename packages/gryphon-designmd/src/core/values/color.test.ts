import { describe, expect, it } from 'vitest';

import { parseColor } from './color.js';

const rgb = (input: string): [number, number, number, number] | null => {
  const c = parseColor(input);
  return c === null ? null : [...c.rgb, c.alpha];
};

describe('parseColor: every format the DESIGN.md spec allows (AC1.5)', () => {
  it.each([
    ['#1A1C1E', [26, 28, 30, 1]],
    ['#1a1c1e', [26, 28, 30, 1]],
    ['#fff', [255, 255, 255, 1]],
    ['#ffff', [255, 255, 255, 1]],
    ['#00000080', [0, 0, 0, 0.502]],
    ['white', [255, 255, 255, 1]],
    ['CornflowerBlue', [100, 149, 237, 1]],
    ['transparent', [0, 0, 0, 0]],
    ['rgb(255 0 0)', [255, 0, 0, 1]],
    ['rgb(255, 0, 0)', [255, 0, 0, 1]],
    ['rgba(0, 0, 0, 0.5)', [0, 0, 0, 0.5]],
    ['rgb(0 0 0 / 50%)', [0, 0, 0, 0.5]],
    ['hsl(0 100% 50%)', [255, 0, 0, 1]],
    ['hsla(120, 100%, 25%, 1)', [0, 128, 0, 1]],
    ['hwb(240 0% 0%)', [0, 0, 255, 1]],
    ['oklch(62.8% 0.2577 29.23)', [255, 0, 0, 1]],
    ['oklab(0.628 0.2249 0.1258)', [255, 0, 0, 1]],
    ['lab(54.29% 80.8 69.89)', [255, 0, 0, 1]],
    ['lch(54.29% 106.84 40.85)', [255, 0, 0, 1]],
  ] as const)('%s', (input, expected) => {
    expect(rgb(input)).toEqual(expected);
  });

  it('treats different spellings of the same colour as equal', () => {
    const forms = ['#FFFFFF', '#fff', 'white', 'rgb(255 255 255)', 'hsl(0 0% 100%)'];
    expect(new Set(forms.map((f) => JSON.stringify(rgb(f)))).size).toBe(1);
  });

  it('trims whitespace', () => {
    expect(rgb('  #000  ')).toEqual([0, 0, 0, 1]);
  });

  it('clamps colours outside the sRGB gamut to the nearest sRGB value', () => {
    const c = parseColor('oklch(70% 0.4 150)');
    expect(c?.rgb.every((v) => v >= 0 && v <= 255 && Number.isInteger(v))).toBe(true);
  });

  it('returns null for things that are not colours', () => {
    for (const input of [
      '',
      'currentColor',
      'inherit',
      'var(--brand)',
      '#12',
      '#ggg',
      'rgb(1 2)',
      '16px',
    ]) {
      expect(parseColor(input)).toBeNull();
    }
  });
});

describe('parseColor: OKLab, for distances (ADR 0005)', () => {
  it('gives white L = 1 and black L = 0', () => {
    expect(parseColor('#fff')?.oklab.l).toBeCloseTo(1, 3);
    expect(parseColor('#000')?.oklab.l).toBeCloseTo(0, 3);
  });

  it('gives a neutral grey no colour (a = b = 0)', () => {
    const grey = parseColor('#777777');
    expect(grey?.oklab.a).toBeCloseTo(0, 3);
    expect(grey?.oklab.b).toBeCloseTo(0, 3);
  });
});

describe('parseColor: color-mix() (ADR 0005)', () => {
  it('mixes in sRGB, 50/50 by default', () => {
    expect(rgb('color-mix(in srgb, #000000, #ffffff)')).toEqual([128, 128, 128, 1]);
  });

  it('uses one percentage for the other colour too', () => {
    expect(rgb('color-mix(in srgb, #ff0000 25%, #0000ff)')).toEqual([64, 0, 191, 1]);
    expect(rgb('color-mix(in srgb, #ff0000, #0000ff 25%)')).toEqual([191, 0, 64, 1]);
  });

  it('scales percentages that do not add up to 100, and lowers alpha when they add up to less', () => {
    expect(rgb('color-mix(in srgb, #000 60%, #fff 60%)')).toEqual([128, 128, 128, 1]);
    expect(rgb('color-mix(in srgb, #000 25%, #fff 25%)')).toEqual([128, 128, 128, 0.5]);
  });

  it('mixes with premultiplied alpha, as CSS does', () => {
    // Transparent black carries no colour, so the result is the red at half alpha.
    expect(rgb('color-mix(in srgb, #ff0000, transparent)')).toEqual([255, 0, 0, 0.5]);
  });

  it('mixes in OKLab', () => {
    const mixed = parseColor('color-mix(in oklab, #000, #fff)');
    expect(mixed?.oklab.l).toBeCloseTo(0.5, 3);
  });

  it('accepts other colour formats and nested mixes as inputs', () => {
    expect(rgb('color-mix(in srgb, rgb(0 0 0), color-mix(in srgb, #fff, #fff))')).toEqual([
      128, 128, 128, 1,
    ]);
  });

  it('returns null for spaces or inputs we cannot resolve', () => {
    for (const input of [
      'color-mix(in hsl, red, blue)',
      'color-mix(in srgb, var(--a), blue)',
      'color-mix(in srgb, red 0%, blue 0%)',
      'color-mix(in srgb, red)',
      'color-mix(srgb, red, blue)',
    ]) {
      expect(parseColor(input)).toBeNull();
    }
  });
});
