/**
 * G3-06: our parser must read DESIGN.md files the same way as Google's
 * reference implementation (ADR 0003). Google's library is a pinned
 * dev dependency, used here only. If Google changes its parser and we
 * bump the pin, this test shows where we disagree.
 */
import { lint } from '@google/design.md/linter';
import { describe, expect, it } from 'vitest';

import ourDesignMd from '../../../../../DESIGN.md?raw';
import { parseDesignMd } from './parse.js';

type Comparable = Record<string, string>;

/** Hex colours are compared in upper case; other values as written. */
const norm = (value: string): string => (value.startsWith('#') ? value.toUpperCase() : value);

/** Our tokens, minus component values (Google does not turn those into tokens). */
function ours(text: string): Comparable {
  const result = parseDesignMd(text);
  if (!result.ok) throw new Error(`our parser failed: ${result.error.message}`);
  return Object.fromEntries(
    result.tokens.tokens
      .filter((t) => !t.path.startsWith('components.'))
      .map((t) => [t.path, norm(t.value)]),
  );
}

/** Google's parsed design system, flattened into the same shape. */
function google(text: string): Comparable {
  const ds = lint(text).designSystem;
  const out: Comparable = {};
  const dim = (d: { value: number; unit: string }): string => `${d.value}${d.unit}`;
  for (const [name, color] of ds.colors) out[`colors.${name}`] = norm(color.hex);
  for (const [name, t] of ds.typography) {
    if (t.fontFamily !== undefined) out[`typography.${name}.fontFamily`] = t.fontFamily;
    if (t.fontSize !== undefined) out[`typography.${name}.fontSize`] = dim(t.fontSize);
  }
  for (const [name, d] of ds.rounded) out[`rounded.${name}`] = dim(d);
  for (const [name, d] of ds.spacing) out[`spacing.${name}`] = dim(d);
  return out;
}

// Values from the examples in the DESIGN.md spec and README
// (google-labs-code/design.md, Apache-2.0).
const fixtures: Record<string, string> = {
  'spec example (Daylight Prestige)': `---
version: alpha
name: Daylight Prestige
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.1em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  base: 16px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Overview

Example.
`,
  'README example (Heritage, rem sizes)': `---
name: Heritage
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 3rem
  body-md:
    fontFamily: Public Sans
    fontSize: 1rem
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 0.75rem
rounded:
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
---
`,
  references: `---
colors:
  primary: "#1A1C1E"
  ink: "{colors.primary}"
spacing:
  md: 16px
typography:
  body:
    fontFamily: Inter
    fontSize: "{spacing.md}"
---
`,
  'this repo’s DESIGN.md': ourDesignMd,
};

/**
 * Places where we knowingly differ from Google, with the reason. Each
 * entry is a token we produce and Google does not. Keep this list short
 * and explained: an unexplained difference is a bug in one of us.
 */
const knownDifferences: Record<string, Comparable> = {
  // Google 0.4.0 does not resolve references inside typography levels.
  // A fontSize reference, as here, is dropped with no finding (fontFamily
  // ones are kept as literal text). The spec allows references to any
  // primitive value, so we resolve them. See docs/drafts/google-issue.md.
  references: { 'typography.body.fontSize': '16px' },
};

describe('our parser agrees with Google’s @google/design.md 0.4.0', () => {
  for (const [name, text] of Object.entries(fixtures)) {
    it(name, () => {
      expect(ours(text)).toEqual({ ...google(text), ...knownDifferences[name] });
    });
  }

  it('every known difference is still a difference (remove it when Google fixes it)', () => {
    for (const [name, extra] of Object.entries(knownDifferences)) {
      const text = fixtures[name] ?? '';
      for (const path of Object.keys(extra)) expect(google(text)).not.toHaveProperty([path]);
    }
  });
});
