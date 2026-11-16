const DIMENSION = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em)$/i;

/**
 * Converts a px, rem or em value to px (AC1.6). Returns null for any
 * other unit, for unitless numbers other than 0, and for calc().
 *
 * `em` is treated like `rem`: it really depends on the parent's font
 * size, which a static checker cannot know. We say so in the docs.
 */
export function parseDimension(input: string, rootPx = 16): number | null {
  const text = input.trim();
  if (text === '0') return 0;
  const match = DIMENSION.exec(text);
  if (match?.[1] === undefined || match[2] === undefined) return null;
  const value = Number(match[1]);
  const px = match[2].toLowerCase() === 'px' ? value : value * rootPx;
  // Avoid floating-point noise such as 17.600000000000001.
  return Math.round(px * 10000) / 10000;
}
