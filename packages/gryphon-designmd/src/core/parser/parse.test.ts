import { describe, expect, it } from 'vitest';

import ourDesignMd from '../../../../../DESIGN.md?raw';
import { parseDesignMd, type ParseSuccess } from './parse.js';

/** Fails the test with the parser's error if parsing did not succeed. */
function ok(text: string): ParseSuccess {
  const result = parseDesignMd(text);
  if (!result.ok)
    throw new Error(`expected success, got ${result.error.code}: ${result.error.message}`);
  return result;
}

function tokenMap(text: string): Record<string, string> {
  return Object.fromEntries(ok(text).tokens.tokens.map((t) => [t.path, t.value]));
}

// Values from the example in the DESIGN.md spec (google-labs-code/design.md, Apache-2.0).
const specExample = `---
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
rounded:
  sm: 4px
  md: 8px
spacing:
  xs: 4px
  md: 16px
---

## Overview

Architectural Minimalism.

## Colors

The palette is rooted in high-contrast neutrals.
`;

describe('parseDesignMd: the spec example (AC1.1)', () => {
  it('reads version and name', () => {
    const { tokens } = ok(specExample);
    expect(tokens.specVersion).toBe('alpha');
    expect(tokens.name).toBe('Daylight Prestige');
  });

  it('returns every colour, font family, font size, radius and spacing token with its path', () => {
    expect(tokenMap(specExample)).toEqual({
      'colors.primary': '#1A1C1E',
      'colors.secondary': '#6C7278',
      'colors.tertiary': '#B8422E',
      'colors.neutral': '#F7F5F2',
      'typography.h1.fontFamily': 'Public Sans',
      'typography.h1.fontSize': '48px',
      'typography.body-md.fontFamily': 'Public Sans',
      'typography.body-md.fontSize': '16px',
      'rounded.sm': '4px',
      'rounded.md': '8px',
      'spacing.xs': '4px',
      'spacing.md': '16px',
    });
  });

  it('gives each token the category the matcher needs', () => {
    const byPath = Object.fromEntries(
      ok(specExample).tokens.tokens.map((t) => [t.path, t.category]),
    );
    expect(byPath['colors.primary']).toBe('color');
    expect(byPath['typography.h1.fontFamily']).toBe('fontFamily');
    expect(byPath['typography.h1.fontSize']).toBe('fontSize');
    expect(byPath['rounded.sm']).toBe('radius');
    expect(byPath['spacing.xs']).toBe('spacing');
  });

  it('lists the ## sections in order', () => {
    expect(ok(specExample).sections.map((s) => s.heading)).toEqual(['Overview', 'Colors']);
  });
});

describe('parseDesignMd: positions (AC1.8)', () => {
  it('records the 1-based line and column of each value in the file', () => {
    const tokens = ok(specExample).tokens.tokens;
    const primary = tokens.find((t) => t.path === 'colors.primary');
    // Line 5 of the file is `  primary: "#1A1C1E"`; the value starts at column 12.
    expect(primary?.position).toEqual({ line: 5, column: 12 });
    const h1Size = tokens.find((t) => t.path === 'typography.h1.fontSize');
    expect(h1Size?.position).toEqual({ line: 12, column: 15 });
  });

  it('records the line of each section heading', () => {
    expect(ok(specExample).sections[0]).toEqual({ heading: 'Overview', line: 27 });
  });

  it('handles Windows line endings', () => {
    const tokens = ok(specExample.replaceAll('\n', '\r\n')).tokens.tokens;
    expect(tokens.find((t) => t.path === 'colors.primary')?.position).toEqual({
      line: 5,
      column: 12,
    });
  });
});

describe('parseDesignMd: components', () => {
  const text = `---
colors:
  primary: "#111111"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: 2px
    padding: 12px
    height: 40px
    borderColor: "#222222"
---
`;

  it('turns literal component values into tokens, so `padding: 12px` on a button is allowed', () => {
    const map = tokenMap(text);
    expect(map['components.button-primary.textColor']).toBe('#FFFFFF');
    expect(map['components.button-primary.rounded']).toBe('2px');
    expect(map['components.button-primary.padding']).toBe('12px');
  });

  it('skips references (they point at tokens we already have) and sizes we do not check', () => {
    const map = tokenMap(text);
    expect(map['components.button-primary.backgroundColor']).toBeUndefined();
    expect(map['components.button-primary.height']).toBeUndefined();
  });

  it('accepts an unknown component property with a warning, as the spec says', () => {
    const result = ok(text);
    expect(tokenMap(text)['components.button-primary.borderColor']).toBeUndefined();
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'unknown-component-property',
        path: 'components.button-primary.borderColor',
      }),
    );
  });
});

describe('parseDesignMd: unknown and nested content (AC1.3, AC1.7)', () => {
  it('accepts unknown token names and unknown sections', () => {
    const result = ok(`---
colors:
  surface-container-high: "#ede7dd"
---

## Iconography

Line icons only.
`);
    expect(tokenMap(`---\ncolors:\n  surface-container-high: "#ede7dd"\n---\n`)).toEqual({
      'colors.surface-container-high': '#ede7dd',
    });
    expect(result.sections.map((s) => s.heading)).toEqual(['Iconography']);
  });

  it('accepts unknown top-level groups with a warning', () => {
    const result = ok(`---\ncolors:\n  primary: "#000"\nmotion:\n  fast: 100ms\n---\n`);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'unknown-group', path: 'motion' }),
    );
  });

  it('flattens nested colour groups such as light and dark', () => {
    expect(
      tokenMap(`---\ncolors:\n  light:\n    primary: "#111"\n  dark:\n    primary: "#eee"\n---\n`),
    ).toEqual({ 'colors.light.primary': '#111', 'colors.dark.primary': '#eee' });
  });

  it('keeps non-dimension spacing values out of the token set, with a warning', () => {
    const result = ok(`---\nspacing:\n  sm: 8px\n  grid-columns: 12\n---\n`);
    expect(tokenMap(`---\nspacing:\n  sm: 8px\n  grid-columns: 12\n---\n`)).toEqual({
      'spacing.sm': '8px',
    });
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'not-a-dimension', path: 'spacing.grid-columns' }),
    );
  });

  it('warns about a colour that is not a string and skips it', () => {
    const result = ok(`---\ncolors:\n  primary: "#000"\n  broken: 12\n---\n`);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'invalid-value', path: 'colors.broken' }),
    );
  });

  it('explains an unquoted hex colour, which YAML reads as a comment', () => {
    const result = ok('---\ncolors:\n  primary: "#000"\n  accent: #ff0000\n---\n');
    const warning = result.warnings.find((w) => w.path === 'colors.accent');
    expect(warning?.code).toBe('invalid-value');
    expect(warning?.message).toContain('must be quoted');
  });

  it('warns about malformed typography and components instead of crashing', () => {
    const result = ok(`---
colors:
  primary: "#000"
typography:
  body:
    fontFamily: 400
    fontSize: big
  caption: 12px
components:
  card: plain
---
`);
    expect(result.warnings.map((w) => `${w.code} ${w.path}`)).toEqual([
      'invalid-value typography.body.fontFamily',
      'not-a-dimension typography.body.fontSize',
      'invalid-value typography.caption',
      'invalid-value components.card',
    ]);
  });

  it('stops at 20 levels of nesting, like Google’s linter', () => {
    let yaml = 'colors:\n';
    for (let depth = 1; depth <= 21; depth++) yaml += `${'  '.repeat(depth)}g${depth}:\n`;
    yaml += `${'  '.repeat(22)}deep: "#fff"\n  primary: "#000"\n`;
    const result = ok(`---\n${yaml}---\n`);
    expect(result.warnings.map((w) => w.code)).toEqual(['too-deep']);
    expect(tokenMap(`---\n${yaml}---\n`)).toEqual({ 'colors.primary': '#000' });
  });

  it('ignores ## headings inside fenced code blocks', () => {
    const result = ok(
      '---\ncolors:\n  primary: "#000"\n---\n\n## Colors\n\n```markdown\n## Colors\n```\n',
    );
    expect(result.sections.map((s) => s.heading)).toEqual(['Colors']);
  });
});

describe('parseDesignMd: errors', () => {
  it('rejects a file with no front matter (AC1.4)', () => {
    const result = parseDesignMd('# Just prose\n\n## Colors\n');
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'no-tokens',
        message: 'No design tokens found in DESIGN.md',
      }),
    });
  });

  it('rejects front matter that defines no tokens (AC1.4)', () => {
    const result = parseDesignMd('---\nname: Empty\n---\n');
    expect(result.ok ? null : result.error.code).toBe('no-tokens');
  });

  it('rejects front matter that never closes', () => {
    const result = parseDesignMd('---\ncolors:\n  primary: "#000"\n');
    expect(result.ok ? null : result.error.code).toBe('unclosed-front-matter');
  });

  it('rejects invalid YAML and says where', () => {
    const result = parseDesignMd('---\ncolors:\n  primary: "#000\n---\n');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid-yaml');
      expect(result.error.position?.line).toBeGreaterThanOrEqual(2);
    }
  });

  it('rejects duplicate YAML keys', () => {
    const result = parseDesignMd('---\ncolors:\n  primary: "#000"\n  primary: "#fff"\n---\n');
    expect(result.ok ? null : result.error.code).toBe('invalid-yaml');
  });

  it('rejects front matter that is not a map', () => {
    const result = parseDesignMd('---\n- one\n- two\n---\n');
    expect(result.ok ? null : result.error.code).toBe('invalid-front-matter');
  });

  it('rejects a duplicate section heading, as the spec says (AC1.3)', () => {
    const result = parseDesignMd(
      '---\ncolors:\n  primary: "#000"\n---\n\n## Colors\n\nA\n\n## Colors\n\nB\n',
    );
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'duplicate-section',
        position: { line: 10, column: 1 },
      }),
    });
  });
});

describe('parseDesignMd: this repo’s own DESIGN.md', () => {
  it('parses without errors and finds the palette, type scale and spacing', () => {
    const result = ok(ourDesignMd);
    const map = tokenMap(ourDesignMd);
    expect(result.tokens.name).toBe('Proof Sheet');
    expect(map['colors.primary']).toBe('#1B1A17');
    expect(map['typography.label-caps.fontSize']).toBe('13px');
    expect(map['spacing.page-max']).toBe('1280px');
    expect(result.sections).toHaveLength(8);
  });

  it('warns about our three borderColor properties, which the spec does not define', () => {
    const codes = ok(ourDesignMd).warnings.filter((w) => w.code === 'unknown-component-property');
    expect(codes.map((w) => w.path)).toEqual([
      'components.panel.borderColor',
      'components.panel-dark.borderColor',
      'components.input.borderColor',
    ]);
  });
});
