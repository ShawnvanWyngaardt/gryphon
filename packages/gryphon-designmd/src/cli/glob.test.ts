import { describe, expect, it } from 'vitest';

import { matchesAny } from './glob.js';

describe('matchesAny: the small glob subset used in gryphon.config.json', () => {
  it.each([
    ['**/*.css', 'a.css', true],
    ['**/*.css', 'src/deep/a.css', true],
    ['**/*.css', 'a.scss', false],
    ['*.vue', 'App.vue', true],
    ['*.vue', 'src/App.vue', false],
    ['src/**', 'src/a/b.css', true],
    ['src/**', 'srcx/a.css', false],
    ['**/legacy/**', 'src/legacy/old.css', true],
    ['**/legacy/**', 'legacy/old.css', true],
    ['a/?.css', 'a/b.css', true],
    ['a/?.css', 'a/bc.css', false],
    ['styles/tokens.css', 'styles/tokens.css', true],
    ['styles/tokens.css', 'styles/tokensXcss', false],
  ] as const)('%s matches %s: %s', (glob, path, expected) => {
    expect(matchesAny([glob], path)).toBe(expected);
  });

  it('is false for an empty list', () => {
    expect(matchesAny([], 'a.css')).toBe(false);
  });
});
