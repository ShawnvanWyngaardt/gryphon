import { parseColor, type NormalColor } from '../values/color.js';
import { parseDimension } from '../values/dimension.js';
import type { Category, Finding, NearestToken, Occurrence, Token, TokenSet } from '../types.js';

/** Below this OKLab distance two colours look the same (ADR 0005). */
export const SAME_COLOR = 0.02;
/** Above this OKLab distance no token is close (ADR 0005). */
export const FAR_COLOR = 0.1;

export interface MatcherOptions {
  /** px per rem and em. Default 16. */
  rootPx?: number;
}

/**
 * CSS generic families, always allowed (AC2.3). Also the vendor names
 * for the system font, which act like `system-ui` (found in G3-11).
 */
const GENERIC_FAMILIES = new Set([
  '-apple-system',
  'blinkmacsystemfont',
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
]);

const CATEGORY_NAME: Record<Category, string> = {
  color: 'colour',
  fontFamily: 'font family',
  fontSize: 'font size',
  spacing: 'spacing',
  radius: 'radius',
};

const APPROXIMATE_NOTE = 'Approximate: em is measured as if the parent font size were 16px.';

const usesEm = (value: string): boolean => /\dem$/i.test(value.trim());
const familyKey = (value: string): string =>
  value
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase();
const round = (n: number, places: number): number => Number(n.toFixed(places));

interface Prepared<T> {
  token: Token;
  value: T;
}

/**
 * Builds a matcher for one token set (ADR 0005). The matcher judges one
 * hard-coded value at a time and returns:
 * - a `raw-token-value` warning when it equals a token,
 * - an `off-token` error with the nearest token when it does not,
 * - `null` when the value cannot be judged (`currentColor`, `auto`, `0`,
 *   generic font families and similar; see AC2.2 and AC2.3), or when
 *   DESIGN.md has no tokens for its category (decision D2).
 */
interface PreparedTokens {
  colors: Prepared<NormalColor>[];
  sizes: Map<Category, Prepared<number>[]>;
  families: Token[];
}

/** Converts the tokens once, so each value is not parsed again per occurrence. */
function prepare(tokenSet: TokenSet, rootPx: number): PreparedTokens {
  const of = (category: Category): Token[] =>
    tokenSet.tokens.filter((t) => t.category === category);
  const colors: Prepared<NormalColor>[] = [];
  for (const token of of('color')) {
    const value = parseColor(token.value);
    if (value !== null) colors.push({ token, value });
  }
  const sizes = new Map<Category, Prepared<number>[]>();
  for (const category of ['spacing', 'radius', 'fontSize'] as const) {
    const list: Prepared<number>[] = [];
    for (const token of of(category)) {
      const value = parseDimension(token.value, rootPx);
      if (value !== null) list.push({ token, value: Math.abs(value) });
    }
    sizes.set(category, list);
  }
  return { colors, sizes, families: of('fontFamily') };
}

const CATEGORY_ORDER: readonly Category[] = [
  'color',
  'fontFamily',
  'fontSize',
  'spacing',
  'radius',
];

/**
 * Categories DESIGN.md has no usable tokens for. The matcher does not
 * check them, and the CLI prints one notice per category (decision D2,
 * approved in PR 15). Tokens that cannot be converted count as missing.
 */
export function ungovernedCategories(tokenSet: TokenSet, options: MatcherOptions = {}): Category[] {
  const { colors, sizes, families } = prepare(tokenSet, options.rootPx ?? 16);
  const count = (category: Category): number =>
    category === 'color'
      ? colors.length
      : category === 'fontFamily'
        ? families.length
        : (sizes.get(category)?.length ?? 0);
  return CATEGORY_ORDER.filter((category) => count(category) === 0);
}

export function createMatcher(
  tokenSet: TokenSet,
  options: MatcherOptions = {},
): (occurrence: Occurrence) => Finding | null {
  const rootPx = options.rootPx ?? 16;
  const { colors, sizes, families } = prepare(tokenSet, rootPx);

  const finding = (
    occurrence: Occurrence,
    exact: boolean,
    nearest: NearestToken | null,
    message: string,
    approximate: boolean,
  ): Finding => ({
    ...occurrence,
    rule: exact ? 'raw-token-value' : 'off-token',
    severity: exact ? 'warning' : 'error',
    nearest,
    // Written in the file's own style by G4-05.
    fix: null,
    message: approximate ? `${message} ${APPROXIMATE_NOTE}` : message,
    approximate,
  });

  const nearestOf = (token: Token, distance: number): NearestToken => ({
    path: token.path,
    value: token.value,
    distance,
  });

  function matchColor(occurrence: Occurrence): Finding | null {
    const color = parseColor(occurrence.value);
    if (color === null) return null;
    const v = occurrence.value;
    let best: { token: Token; distance: number; sameAlpha: boolean } | null = null;
    for (const { token, value } of colors) {
      const sameRgb = value.rgb.every((c, i) => c === color.rgb[i]);
      const sameAlpha = Math.round(value.alpha * 255) === Math.round(color.alpha * 255);
      if (sameRgb && sameAlpha) {
        return finding(
          occurrence,
          true,
          nearestOf(token, 0),
          `${v} is the value of ${token.path}: use the token instead.`,
          false,
        );
      }
      const distance = sameRgb
        ? 0
        : Math.hypot(
            value.oklab.l - color.oklab.l,
            value.oklab.a - color.oklab.a,
            value.oklab.b - color.oklab.b,
          );
      if (best === null || distance < best.distance) best = { token, distance, sameAlpha };
    }
    // No tokens in this category: not governed by DESIGN.md (D2).
    if (best === null) return null;
    const { token, distance } = best;
    const name = `${token.path} (${token.value})`;
    let message: string;
    if (distance === 0) {
      message = `${v} is ${name} with a different opacity. DESIGN.md has no token for this opacity.`;
    } else if (distance < SAME_COLOR) {
      message = `${v} is not a DESIGN.md colour. It looks the same as ${name}: use the token.`;
    } else if (distance > FAR_COLOR) {
      message = `${v} is not a DESIGN.md colour, and no token is close. Nearest is ${name}. If this colour is intended, add it to DESIGN.md.`;
    } else {
      message = `${v} is not a DESIGN.md colour. Nearest token: ${name}.`;
    }
    return finding(occurrence, false, nearestOf(token, round(distance, 4)), message, false);
  }

  function matchSize(
    occurrence: Occurrence,
    category: 'spacing' | 'radius' | 'fontSize',
  ): Finding | null {
    const px = parseDimension(occurrence.value, rootPx);
    if (px === null || px === 0) return null;
    const target = Math.abs(px);
    let best: Prepared<number> | null = null;
    for (const candidate of sizes.get(category) ?? []) {
      if (best === null || Math.abs(candidate.value - target) < Math.abs(best.value - target)) {
        best = candidate;
      }
    }
    // No tokens in this category: not governed by DESIGN.md (D2).
    if (best === null) return null;
    const distance = round(Math.abs(best.value - target), 4);
    const approximate = usesEm(occurrence.value) || usesEm(best.token.value);
    const name = `${best.token.path} (${best.token.value})`;
    const message =
      distance === 0
        ? `${occurrence.value} is the value of ${best.token.path}: use the token instead.`
        : `${occurrence.value} is not a DESIGN.md ${CATEGORY_NAME[category]} value. Nearest token: ${name}, ${distance}px away.`;
    return finding(
      occurrence,
      distance === 0,
      nearestOf(best.token, distance),
      message,
      approximate,
    );
  }

  function matchFamily(occurrence: Occurrence): Finding | null {
    const key = familyKey(occurrence.value);
    if (key === '' || GENERIC_FAMILIES.has(key)) return null;
    const same = families.find((t) => familyKey(t.value) === key);
    if (same !== undefined) {
      return finding(
        occurrence,
        true,
        nearestOf(same, 0),
        `${occurrence.value} is the value of ${same.path}: use the token instead.`,
        false,
      );
    }
    if (families.length === 0) return null;
    const allowed = [...new Set(families.map((t) => t.value))].join(', ');
    return finding(
      occurrence,
      false,
      null,
      `${occurrence.value} is not a DESIGN.md font family. DESIGN.md defines: ${allowed}.`,
      false,
    );
  }

  return (occurrence) => {
    switch (occurrence.category) {
      case 'color':
        return matchColor(occurrence);
      case 'fontFamily':
        return matchFamily(occurrence);
      case 'spacing':
      case 'radius':
      case 'fontSize':
        return matchSize(occurrence, occurrence.category);
    }
  };
}
