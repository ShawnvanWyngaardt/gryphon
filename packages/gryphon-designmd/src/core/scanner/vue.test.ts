import { describe, expect, it } from 'vitest';

import { scanVue } from './vue.js';

const SFC = `<template>
  <div class="card" style="color: #6366f1; padding: 13px">
    <p :style="{ color: '#fff' }">Hi</p>
    <span
      style="
        margin: 7px;
      "
    >x</span>
  </div>
</template>

<script setup lang="ts">
const color = '#123456';
</script>

<style scoped>
.card {
  margin: 13px;
}
</style>

<style lang="scss">
$x: #fff;
.a { color: darken(#336699, 10%); }
</style>
`;

function found(source: string): string[] {
  const result = scanVue(source, 'a.vue');
  if (result.error !== undefined) throw new Error(result.error);
  return result.occurrences.map((o) => `${o.value} @ ${o.line}:${o.column} [${o.category}]`);
}

describe('scanVue (G4-01)', () => {
  it('finds values in style attributes and style blocks, with positions in the .vue file', () => {
    // Positions computed independently from the fixture text.
    expect(found(SFC)).toEqual([
      '#6366f1 @ 2:35 [color]',
      '13px @ 2:53 [spacing]',
      '7px @ 6:17 [spacing]',
      '13px @ 18:11 [spacing]',
      '#336699 @ 24:20 [color]',
    ]);
  });

  it('records the file and property', () => {
    const first = scanVue(SFC, 'src/Card.vue').occurrences[0];
    expect(first).toMatchObject({ file: 'src/Card.vue', property: 'color' });
  });

  it('ignores bound :style, script code and SCSS variable definitions', () => {
    const values = found(SFC);
    expect(values.join(' ')).not.toMatch(/#fff|#123456/);
  });

  it('skips style blocks in languages we cannot parse, and external styles', () => {
    const sfc =
      '<style lang="less">.a { color: red; }</style>\n<style lang="stylus">.a\n  color red</style>\n<style src="./x.css"></style>\n<style>.b { color: blue; }</style>';
    expect(found(sfc)).toEqual(['blue @ 5:20 [color]']);
  });

  it('handles empty style blocks, components without a template, and Windows line endings', () => {
    expect(found('<style></style>')).toEqual([]);
    expect(found('<script setup>\nconst a = 1\n</script>\n')).toEqual([]);
    expect(found('<template>\r\n  <i style="color: red"></i>\r\n</template>\r\n')).toEqual([
      'red @ 2:20 [color]',
    ]);
  });

  it('finds style attributes in nested elements and components', () => {
    expect(found('<template><Card><b style="gap: 3px" /></Card></template>')).toEqual([
      '3px @ 1:32 [spacing]',
    ]);
  });

  it('checks local colour redefinitions in a component, but not :root tokens (D3)', () => {
    const sfc =
      '<style scoped>\n.hero { --hero-orange: #f34213; }\n</style>\n<style>\n:root { --brand: #000; }\n</style>';
    expect(found(sfc)).toEqual(['#f34213 @ 2:24 [color]']);
  });

  it('passes an explicit tokenSource decision to every style block', () => {
    const sfc = '<style>\n:root { --brand: #000; }\n.a { --x: #fff; }\n</style>';
    const values = (tokenSource: boolean): string[] =>
      scanVue(sfc, 'a.vue', { tokenSource }).occurrences.map((o) => o.value);
    expect(values(true)).toEqual([]);
    expect(values(false)).toEqual(['#000', '#fff']);
  });

  it('returns an error for a broken template, without throwing (AC2.8)', () => {
    const result = scanVue('<template><div></template>', 'broken.vue');
    expect(result.occurrences).toEqual([]);
    expect(result.error).toMatch(/^could not parse: /);
  });

  it('reports a CSS error with its line in the .vue file, not in the block', () => {
    const result = scanVue(
      '<template><i /></template>\n\n<style>\n.a { color: red;\n</style>\n',
      'broken.vue',
    );
    expect(result.error).toMatch(/^could not parse: .*\(line 4\)$/);
  });
});
