import { describe, expect, it } from 'vitest';

import type { Occurrence } from '../types.js';
import { scanCss } from './css.js';

/** `value @ line:column [category]`, which is easy to read in a failing test. */
function found(source: string, syntax: 'css' | 'scss' = 'css'): string[] {
  const result = scanCss(source, 'a.css', { syntax });
  if (result.error !== undefined) throw new Error(result.error);
  return result.occurrences.map((o) => `${o.value} @ ${o.line}:${o.column} [${o.category}]`);
}

describe('scanCss: colours', () => {
  it('finds hex, named and functional colours with their exact position', () => {
    const css =
      '.a {\n  color: #6366f1;\n  background-color: rgb(1 2 3);\n  border-color: red;\n}\n';
    expect(found(css)).toEqual([
      '#6366f1 @ 2:10 [color]',
      'rgb(1 2 3) @ 3:21 [color]',
      'red @ 4:17 [color]',
    ]);
  });

  it('finds the colour inside shorthands and gradients, and ignores the rest', () => {
    const css =
      '.a { border: 1px solid #ddd; background: url(a.png) linear-gradient(#fff, oklch(60% 0.1 250)); }';
    expect(found(css)).toEqual([
      '#ddd @ 1:24 [color]',
      '#fff @ 1:69 [color]',
      'oklch(60% 0.1 250) @ 1:75 [color]',
    ]);
  });

  it('covers every colour property in SPEC FR2', () => {
    const props = [
      'color',
      'background',
      'background-color',
      'border-color',
      'border-top-color',
      'border',
      'border-left',
      'outline-color',
      'outline',
      'fill',
      'stroke',
      'text-decoration-color',
      'caret-color',
      'accent-color',
    ];
    const css = props.map((p) => `.a { ${p}: #123456; }`).join('\n');
    expect(found(css)).toHaveLength(props.length);
  });

  it('allows currentColor, transparent, var() and CSS-wide keywords (AC2.2)', () => {
    const css =
      '.a { color: currentColor; background: transparent; border-color: var(--line, #fff); fill: inherit; stroke: none; outline-color: revert; }';
    expect(found(css)).toEqual([]);
  });

  it('ignores colours in properties we do not check, such as box-shadow', () => {
    expect(found('.a { box-shadow: 0 1px 2px #000; }')).toEqual([]);
  });
});

describe('scanCss: sizes', () => {
  it('finds each part of a spacing shorthand with its own column', () => {
    expect(found('.a {\n  padding: 8px 13px;\n}')).toEqual([
      '8px @ 2:12 [spacing]',
      '13px @ 2:16 [spacing]',
    ]);
  });

  it('covers margin, padding, gap and inset properties, including logical ones', () => {
    const props = [
      'margin',
      'margin-top',
      'margin-inline',
      'padding-block-end',
      'gap',
      'row-gap',
      'column-gap',
      'inset',
      'inset-inline-start',
      'top',
      'right',
      'bottom',
      'left',
    ];
    const css = props.map((p) => `.a { ${p}: 13px; }`).join('\n');
    expect(found(css)).toHaveLength(props.length);
  });

  it('finds radius and font size values', () => {
    expect(
      found('.a { border-radius: 10px 2px; border-top-left-radius: 3px; font-size: 1.1rem; }'),
    ).toEqual([
      '10px @ 1:21 [radius]',
      '2px @ 1:26 [radius]',
      '3px @ 1:55 [radius]',
      '1.1rem @ 1:71 [fontSize]',
    ]);
  });

  it('allows 0, auto, percentages, viewport units and keywords (AC2.2)', () => {
    expect(
      found(
        '.a { margin: 0 auto; padding: 0px 5% 2vw; font-size: larger; top: 50%; gap: normal; }',
      ),
    ).toEqual([]);
  });

  it('finds hard-coded values inside calc(), but not var()', () => {
    expect(found('.a { padding: calc(var(--space-md) + 3px); margin: var(--m, 7px); }')).toEqual([
      '3px @ 1:38 [spacing]',
    ]);
  });

  it('keeps negative values whole', () => {
    expect(found('.a { margin-top: -12px; }')).toEqual(['-12px @ 1:18 [spacing]']);
  });

  it('ignores sizes in properties we do not check, such as width and border width', () => {
    expect(found('.a { width: 13px; border: 3px solid; line-height: 22px; }')).toEqual([]);
  });
});

describe('scanCss: fonts', () => {
  it('checks only the first family in a stack, quoted or not (D1, approved in PR 15)', () => {
    expect(
      found('.a { font-family: "Inter Display", Atkinson Hyperlegible Next, sans-serif; }'),
    ).toEqual(['"Inter Display" @ 1:19 [fontFamily]']);
    expect(found('.a { font-family: Atkinson Hyperlegible Next, Inter; }')).toEqual([
      'Atkinson Hyperlegible Next @ 1:19 [fontFamily]',
    ]);
  });

  it('does not check fallbacks behind a variable or a system font', () => {
    expect(found('.a { font-family: var(--font-body), Inter, sans-serif; }')).toEqual([]);
    expect(found('.a { font-family: $body-font, Inter; }', 'scss')).toEqual([]);
    expect(found('.a { font-family: system-ui, -apple-system, "Segoe UI", Roboto; }')).toEqual([
      'system-ui @ 1:19 [fontFamily]',
    ]);
  });

  it('reads the size and the first family from the font shorthand, but not the line height', () => {
    expect(found('.a { font: italic 700 15px/1.4 Inter, serif; }')).toEqual([
      '15px @ 1:23 [fontSize]',
      'Inter @ 1:32 [fontFamily]',
    ]);
  });

  it('ignores font shorthands that are system keywords', () => {
    expect(found('.a { font: inherit; } .b { font: caption; }')).toEqual([]);
  });
});

describe('scanCss: definitions are not usages (AC2.4)', () => {
  it('skips custom property definitions', () => {
    expect(found(':root { --brand: #6366f1; --space: 13px; }')).toEqual([]);
  });

  it('skips @font-face, which defines a font instead of using one (found in G3-11)', () => {
    expect(
      found(
        "@font-face { font-family: 'Inter Core'; src: url(a.woff2); font-weight: 400; }\n.a { font-family: Inter; }",
      ),
    ).toEqual(['Inter @ 2:19 [fontFamily]']);
  });

  it('skips SCSS variable definitions, and allows SCSS variables as values', () => {
    expect(found('$brand: #6366f1;\n.a { color: $brand; padding: $space-md; }', 'scss')).toEqual(
      [],
    );
  });
});

describe('scanCss: SCSS', () => {
  it('finds values in nested rules and media queries, with correct lines', () => {
    const scss =
      '.card {\n  @media (min-width: 600px) {\n    .title {\n      color: #222;\n    }\n  }\n}\n';
    expect(found(scss, 'scss')).toEqual(['#222 @ 4:14 [color]']);
  });

  it('ignores // comments and interpolation', () => {
    const scss =
      '// color: #fff;\n.a {\n  #{$side}-color: #333;\n  padding: #{$x}px;\n  margin: 4px; // was 6px\n}\n';
    expect(found(scss, 'scss')).toEqual(['4px @ 5:11 [spacing]']);
  });

  it('finds raw values passed to SCSS functions', () => {
    expect(found('.a { color: darken(#336699, 10%); }', 'scss')).toEqual([
      '#336699 @ 1:20 [color]',
    ]);
  });
});

describe('scanCss: comments, values across lines and positions', () => {
  it('ignores values inside comments', () => {
    expect(found('/* color: red; */ .a { color: /* was red */ blue; }')).toEqual([
      'blue @ 1:45 [color]',
    ]);
  });

  it('gets positions right when a value spans lines', () => {
    expect(found('.a {\n  padding:\n    4px\n    13px;\n}')).toEqual([
      '4px @ 3:5 [spacing]',
      '13px @ 4:5 [spacing]',
    ]);
  });

  it('handles Windows line endings', () => {
    expect(found('.a {\r\n  color: red;\r\n}\r\n')).toEqual(['red @ 2:10 [color]']);
  });

  it('applies line and column offsets, for CSS inside a Vue file (G4-01)', () => {
    const result = scanCss('.a { color: red; }', 'a.vue', {
      syntax: 'css',
      lineOffset: 10,
      columnOffset: 2,
    });
    const first: Occurrence | undefined = result.occurrences[0];
    expect(first).toEqual({
      file: 'a.vue',
      line: 11,
      column: 15,
      property: 'color',
      value: 'red',
      category: 'color',
    });
  });

  it('records the property in lower case', () => {
    expect(scanCss('.a { COLOR: red; }', 'a.css', { syntax: 'css' }).occurrences[0]?.property).toBe(
      'color',
    );
  });
});

describe('scanCss: broken files (AC2.8)', () => {
  it('returns an error instead of throwing', () => {
    const result = scanCss('.a { color: red;', 'broken.css', { syntax: 'css' });
    expect(result.occurrences).toEqual([]);
    expect(result.error).toMatch(/^could not parse: .*Unclosed block/);
  });

  it('returns an error for broken SCSS too', () => {
    const result = scanCss('.a {\n  color: red;\n', 'broken.scss', { syntax: 'scss' });
    expect(result.occurrences).toEqual([]);
    expect(result.error).toMatch(/^could not parse: .*\(line 1\)$/);
  });
});
