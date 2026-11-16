import { describe, expect, it } from 'vitest';

import { parseDesignMd } from '../parser/parse.js';
import type { Category, Occurrence, TokenSet } from '../types.js';
import { createMatcher } from './match.js';

function tokenSet(yaml: string): TokenSet {
  const result = parseDesignMd(`---\n${yaml}---\n`);
  if (!result.ok) throw new Error(result.error.message);
  return result.tokens;
}

const tokens = tokenSet(`colors:
  primary: "#1B1A17"
  tertiary: "#1F5C45"
  neutral: "#F6F3EC"
  ink: "{colors.primary}"
typography:
  body:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
  code:
    fontFamily: "Atkinson Hyperlegible Mono"
    fontSize: 0.875rem
  hero:
    fontSize: 2.5em
rounded:
  none: 0px
  sm: 2px
  md: 4px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  button:
    padding: 12px
`);

const match = createMatcher(tokens);

function occ(category: Category, value: string, property = 'x'): Occurrence {
  return { file: 'a.css', line: 3, column: 5, property, value, category };
}

describe('colours', () => {
  it('a value equal to a token is a raw-token-value warning, whatever the spelling', () => {
    for (const value of ['#1B1A17', '#1b1a17', 'rgb(27 26 23)']) {
      expect(match(occ('color', value))).toMatchObject({
        rule: 'raw-token-value',
        severity: 'warning',
        nearest: { path: 'colors.primary', value: '#1B1A17', distance: 0 },
      });
    }
  });

  it('when two tokens have the same value, the first defined wins (ADR 0005)', () => {
    expect(match(occ('color', '#1b1a17'))?.nearest?.path).toBe('colors.primary');
  });

  it('an off-token colour is an error with the nearest token by OKLab distance', () => {
    const finding = match(occ('color', '#205d46', 'color'));
    expect(finding).toMatchObject({
      rule: 'off-token',
      severity: 'error',
      file: 'a.css',
      line: 3,
      column: 5,
      property: 'color',
      value: '#205d46',
      category: 'color',
      nearest: { path: 'colors.tertiary', value: '#1F5C45' },
      approximate: false,
    });
    expect(finding?.nearest?.distance).toBeGreaterThan(0);
    expect(finding?.nearest?.distance).toBeLessThan(0.02);
    expect(finding?.message).toBe(
      '#205d46 is not a DESIGN.md colour. It looks the same as colors.tertiary (#1F5C45): use the token.',
    );
  });

  it('says when no token is close', () => {
    const finding = match(occ('color', '#6366f1'));
    expect(finding?.nearest?.distance).toBeGreaterThan(0.1);
    expect(finding?.message).toBe(
      '#6366f1 is not a DESIGN.md colour, and no token is close. Nearest is colors.tertiary (#1F5C45). If this colour is intended, add it to DESIGN.md.',
    );
  });

  it('a medium distance gets a plain "nearest" message', () => {
    expect(match(occ('color', '#2e6b54'))?.message).toBe(
      '#2e6b54 is not a DESIGN.md colour. Nearest token: colors.tertiary (#1F5C45).',
    );
  });

  it('the same colour with a different opacity is off-token, and the message says why', () => {
    const finding = match(occ('color', 'rgb(27 26 23 / 50%)'));
    expect(finding?.rule).toBe('off-token');
    expect(finding?.nearest).toMatchObject({ path: 'colors.primary', distance: 0 });
    expect(finding?.message).toContain('different opacity');
  });

  it('returns null for values it cannot judge', () => {
    expect(match(occ('color', 'currentColor'))).toBeNull();
    expect(match(occ('color', 'var(--brand)'))).toBeNull();
  });
});

describe('sizes', () => {
  it('compares spacing only with spacing tokens, including component padding', () => {
    expect(match(occ('spacing', '12px'))).toMatchObject({
      rule: 'raw-token-value',
      nearest: { path: 'components.button.padding', distance: 0 },
    });
    expect(match(occ('spacing', '13px'))).toMatchObject({
      rule: 'off-token',
      nearest: { path: 'components.button.padding', value: '12px', distance: 1 },
      message:
        '13px is not a DESIGN.md spacing value. Nearest token: components.button.padding (12px), 1px away.',
    });
  });

  it('compares radius only with rounded tokens', () => {
    expect(match(occ('radius', '3px'))).toMatchObject({
      nearest: { path: 'rounded.sm', distance: 1 },
    });
  });

  it('compares font sizes only with typography font sizes, across units', () => {
    expect(match(occ('fontSize', '14px'))).toMatchObject({
      rule: 'raw-token-value',
      nearest: { path: 'typography.code.fontSize', value: '0.875rem', distance: 0 },
    });
    expect(match(occ('fontSize', '1rem'))?.nearest?.path).toBe('typography.body.fontSize');
  });

  it('ties go to the token defined first', () => {
    // 6px is 2px from both xs (4px) and sm (8px).
    expect(match(occ('spacing', '6px'))?.nearest?.path).toBe('spacing.xs');
  });

  it('matches negative spacing on its absolute value', () => {
    expect(match(occ('spacing', '-8px'))).toMatchObject({
      rule: 'raw-token-value',
      nearest: { path: 'spacing.sm', distance: 0 },
    });
  });

  it('allows 0 in any unit, and returns null for values it cannot convert', () => {
    expect(match(occ('spacing', '0'))).toBeNull();
    expect(match(occ('spacing', '0px'))).toBeNull();
    expect(match(occ('spacing', '50%'))).toBeNull();
    expect(match(occ('spacing', 'auto'))).toBeNull();
  });

  it('uses the configured root size', () => {
    const at10 = createMatcher(tokens, { rootPx: 10 });
    expect(at10(occ('fontSize', '1.6rem'))).toMatchObject({
      rule: 'raw-token-value',
      nearest: { path: 'typography.body.fontSize' },
    });
  });
});

describe('em values are approximate (review of PR 10)', () => {
  it('marks a finding approximate when the value in the code uses em', () => {
    const finding = match(occ('spacing', '1em'));
    expect(finding).toMatchObject({ rule: 'raw-token-value', approximate: true });
    expect(finding?.message).toContain(
      'Approximate: em is measured as if the parent font size were 16px.',
    );
  });

  it('marks a finding approximate when the matched token uses em', () => {
    expect(match(occ('fontSize', '40px'))).toMatchObject({
      nearest: { path: 'typography.hero.fontSize' },
      approximate: true,
    });
  });

  it('does not mark px and rem findings approximate', () => {
    expect(match(occ('spacing', '1rem'))?.approximate).toBe(false);
    expect(match(occ('color', '#000'))?.approximate).toBe(false);
  });
});

describe('font families', () => {
  it('a family from DESIGN.md is a raw-token-value warning, ignoring case and quotes', () => {
    expect(match(occ('fontFamily', '"atkinson hyperlegible mono"'))).toMatchObject({
      rule: 'raw-token-value',
      nearest: { path: 'typography.code.fontFamily', distance: 0 },
    });
  });

  it('an unknown family is an error that lists the allowed families', () => {
    expect(match(occ('fontFamily', 'Inter'))).toMatchObject({
      rule: 'off-token',
      nearest: null,
      message:
        'Inter is not a DESIGN.md font family. DESIGN.md defines: Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono.',
    });
  });

  it('allows generic family keywords', () => {
    for (const generic of ['sans-serif', 'serif', 'monospace', 'system-ui', 'ui-monospace']) {
      expect(match(occ('fontFamily', generic))).toBeNull();
    }
  });
});

describe('a category with no tokens at all', () => {
  it('reports off-token with no nearest token', () => {
    const noRadius = createMatcher(tokenSet('colors:\n  primary: "#000"\n'));
    expect(noRadius(occ('radius', '4px'))).toMatchObject({
      rule: 'off-token',
      nearest: null,
      message: '4px is not a DESIGN.md radius value. DESIGN.md defines no radius values.',
    });
  });
});

describe('fix', () => {
  it('is left empty until G4-05 writes fixes in the file’s own style', () => {
    expect(match(occ('spacing', '13px'))?.fix).toBeNull();
  });
});
