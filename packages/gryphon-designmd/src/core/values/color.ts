import {
  converter,
  modeHsl,
  modeHwb,
  modeLab,
  modeLch,
  modeOklab,
  modeOklch,
  modeRgb,
  parse,
  useMode,
  type Color,
} from 'culori/fn';

// Register only the colour spaces the DESIGN.md spec allows, so the
// playground bundle stays small (culori/fn is tree-shakable).
useMode(modeRgb);
useMode(modeHsl);
useMode(modeHwb);
useMode(modeLab);
useMode(modeLch);
useMode(modeOklab);
useMode(modeOklch);

const toRgb = converter('rgb');
const toOklab = converter('oklab');

/** A colour in the two forms the matcher needs (ADR 0005). */
export interface NormalColor {
  /** 8-bit sRGB, clamped to the sRGB gamut. Used for exact matches. */
  rgb: [number, number, number];
  /** 0 to 1, rounded to 3 decimals. */
  alpha: number;
  /** OKLab, used for "nearest token" distances. */
  oklab: { l: number; a: number; b: number };
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const to8bit = (v: number): number => Math.round(clamp01(v) * 255);

function normalise(color: Color): NormalColor {
  const rgb = toRgb(color);
  const lab = toOklab({ ...rgb, r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b) });
  return {
    rgb: [to8bit(rgb.r), to8bit(rgb.g), to8bit(rgb.b)],
    alpha: Math.round(clamp01(rgb.alpha ?? 1) * 1000) / 1000,
    oklab: { l: lab.l, a: lab.a, b: lab.b },
  };
}

/**
 * Parses any colour the DESIGN.md spec allows (AC1.5): hex, named,
 * rgb, hsl, hwb, lab, lch, oklab, oklch and color-mix(). Returns null
 * for anything else, including `currentColor` and `var(...)`.
 */
export function parseColor(input: string): NormalColor | null {
  const color = parseAny(input.trim());
  return color === null ? null : normalise(color);
}

function parseAny(input: string): Color | null {
  if (/^color-mix\(/i.test(input)) return parseColorMix(input);
  return parse(input) ?? null;
}

/** Splits on commas that are not inside brackets. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

/** `<color> [<percentage>]`, with the percentage at either end. */
function parseMixInput(text: string): { color: Color; percent: number | undefined } | null {
  const match = /^(?:(\d*\.?\d+)%\s+)?(.+?)(?:\s+(\d*\.?\d+)%)?$/.exec(text);
  const colorText = match?.[2];
  if (match === null || colorText === undefined) return null;
  const color = parseAny(colorText);
  if (color === null) return null;
  const percent = match[1] ?? match[3];
  return { color, percent: percent === undefined ? undefined : Number(percent) };
}

/**
 * color-mix() as CSS Color 5 defines it, for the `srgb` and `oklab`
 * spaces: percentages are filled in and scaled to 100, a total under
 * 100 lowers the alpha, and channels are mixed premultiplied by alpha.
 */
function parseColorMix(input: string): Color | null {
  const inner = /^color-mix\((.*)\)$/is.exec(input)?.[1];
  if (inner === undefined) return null;
  const [spaceText, firstText, secondText, ...rest] = splitTopLevel(inner);
  if (firstText === undefined || secondText === undefined || rest.length > 0) return null;

  const space = /^in\s+(srgb|oklab)$/i.exec(spaceText ?? '')?.[1]?.toLowerCase();
  const first = parseMixInput(firstText);
  const second = parseMixInput(secondText);
  if (space === undefined || first === null || second === null) return null;

  let p1 = first.percent;
  let p2 = second.percent;
  if (p1 === undefined && p2 === undefined) p1 = p2 = 50;
  else if (p1 === undefined) p1 = 100 - (p2 ?? 0);
  else if (p2 === undefined) p2 = 100 - p1;
  const total = (p1 ?? 0) + (p2 ?? 0);
  if (total <= 0) return null;
  const w1 = (p1 ?? 0) / total;
  const w2 = (p2 ?? 0) / total;
  const alphaScale = Math.min(total, 100) / 100;

  const mode = space === 'srgb' ? 'rgb' : 'oklab';
  const convert = converter(mode);
  const a = convert(first.color) as unknown as Record<string, number | undefined>;
  const b = convert(second.color) as unknown as Record<string, number | undefined>;
  const channels = mode === 'rgb' ? ['r', 'g', 'b'] : ['l', 'a', 'b'];

  const a1 = a['alpha'] ?? 1;
  const a2 = b['alpha'] ?? 1;
  const alpha = a1 * w1 + a2 * w2;
  const mixed: Record<string, number | string> = { mode, alpha: alpha * alphaScale };
  for (const ch of channels) {
    const premultiplied = (a[ch] ?? 0) * a1 * w1 + (b[ch] ?? 0) * a2 * w2;
    mixed[ch] = alpha === 0 ? 0 : premultiplied / alpha;
  }
  return mixed as unknown as Color;
}
