import { describe, expect, it } from 'vitest';

import { parseDesignMd, type ParseError } from './parse.js';

function tokens(text: string): Record<string, string> {
  const result = parseDesignMd(text);
  if (!result.ok)
    throw new Error(`expected success, got ${result.error.code}: ${result.error.message}`);
  return Object.fromEntries(result.tokens.tokens.map((t) => [t.path, t.value]));
}

function error(text: string): ParseError {
  const result = parseDesignMd(text);
  if (result.ok) throw new Error('expected an error, but parsing succeeded');
  return result.error;
}

const fm = (yaml: string): string => `---\n${yaml}---\n`;

describe('references resolve to their final value (AC1.2)', () => {
  it('resolves a colour alias and keeps the alias as its own token', () => {
    expect(tokens(fm('colors:\n  primary: "#1A1C1E"\n  ink: "{colors.primary}"\n'))).toEqual({
      'colors.primary': '#1A1C1E',
      'colors.ink': '#1A1C1E',
    });
  });

  it('records the alias at the line where the reference is written', () => {
    const result = parseDesignMd(fm('colors:\n  primary: "#1A1C1E"\n  ink: "{colors.primary}"\n'));
    const ink = result.ok ? result.tokens.tokens.find((t) => t.path === 'colors.ink') : undefined;
    expect(ink?.position).toEqual({ line: 4, column: 8 });
  });

  it('follows a chain of references', () => {
    expect(
      tokens(fm('colors:\n  a: "{colors.b}"\n  b: "{colors.c}"\n  c: "#ffffff"\n'))['colors.a'],
    ).toBe('#ffffff');
  });

  it('resolves references across groups, for example a font size from the spacing scale', () => {
    expect(
      tokens(
        fm(
          'spacing:\n  md: 16px\ntypography:\n  body:\n    fontSize: "{spacing.md}"\n    fontFamily: "{typography.base.fontFamily}"\n  base:\n    fontFamily: Public Sans\n',
        ),
      ),
    ).toMatchObject({
      'typography.body.fontSize': '16px',
      'typography.body.fontFamily': 'Public Sans',
    });
  });

  it('resolves references in nested groups', () => {
    expect(
      tokens(fm('colors:\n  light:\n    ink: "#111111"\n  dark:\n    ink: "{colors.light.ink}"\n'))[
        'colors.dark.ink'
      ],
    ).toBe('#111111');
  });

  it('still checks the resolved value: a radius pointing at a colour is not a dimension', () => {
    const result = parseDesignMd(
      fm('colors:\n  primary: "#000"\nrounded:\n  sm: "{colors.primary}"\n'),
    );
    expect(result.ok && result.warnings.map((w) => `${w.code} ${w.path}`)).toEqual([
      'not-a-dimension rounded.sm',
    ]);
  });
});

describe('references in components', () => {
  it('accepts a reference to a whole typography level, as the spec allows in components', () => {
    expect(
      tokens(
        fm(
          'colors:\n  primary: "#000"\ntypography:\n  label:\n    fontFamily: Inter\ncomponents:\n  button:\n    typography: "{typography.label}"\n    textColor: "{colors.primary}"\n',
        ),
      ),
    ).not.toHaveProperty('components.button.textColor');
  });

  it('rejects a broken reference in a component', () => {
    const e = error(
      fm('colors:\n  primary: "#000"\ncomponents:\n  button:\n    textColor: "{colors.missing}"\n'),
    );
    expect(e.code).toBe('broken-reference');
    expect(e.message).toBe(
      'components.button.textColor refers to {colors.missing}, which is not defined in DESIGN.md.',
    );
    expect(e.position).toEqual({ line: 6, column: 16 });
  });
});

describe('bad references stop the run with a clear error (AC1.2)', () => {
  it('names the token and the missing path', () => {
    const e = error(fm('colors:\n  ink: "{colors.primary}"\n'));
    expect(e).toEqual({
      code: 'broken-reference',
      message: 'colors.ink refers to {colors.primary}, which is not defined in DESIGN.md.',
      position: { line: 3, column: 8 },
    });
  });

  it('treats a path that goes past a value as broken', () => {
    expect(error(fm('colors:\n  primary: "#000"\n  ink: "{colors.primary.dark}"\n')).code).toBe(
      'broken-reference',
    );
  });

  it('detects a loop and shows the whole chain', () => {
    const e = error(fm('colors:\n  a: "{colors.b}"\n  b: "{colors.a}"\n'));
    expect(e.code).toBe('reference-loop');
    expect(e.message).toBe(
      'colors.a is part of a reference loop: colors.a -> colors.b -> colors.a.',
    );
  });

  it('detects a token that refers to itself', () => {
    expect(error(fm('colors:\n  a: "{colors.a}"\n')).code).toBe('reference-loop');
  });

  it('rejects a reference to a group outside components, as the spec says', () => {
    const e = error(
      fm('typography:\n  h1:\n    fontFamily: Inter\ncolors:\n  ink: "{typography.h1}"\n'),
    );
    expect(e.code).toBe('invalid-reference');
    expect(e.message).toContain('typography.h1 is a group');
  });

  it('stops after 10 hops, like Google’s linter', () => {
    let yaml = 'colors:\n';
    for (let i = 0; i < 11; i++) yaml += `  c${i}: "{colors.c${i + 1}}"\n`;
    yaml += '  c11: "#000"\n';
    expect(error(fm(yaml)).code).toBe('reference-too-deep');
    // Ten hops is still fine.
    expect(tokens(fm(yaml.replace('  c0: "{colors.c1}"\n', '')))['colors.c1']).toBe('#000');
  });
});
