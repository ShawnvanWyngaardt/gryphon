import { defineConfig } from 'vitest/config';

// Coverage floors: at least 80% on the parser and the scanner (CLAUDE.md),
// and on the value normalisers, which both of them rely on (G3-07).
const floor = { lines: 80, branches: 80, functions: 80, statements: 80 };

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        'packages/gryphon-designmd/src/core/parser/**': floor,
        'packages/gryphon-designmd/src/core/scanner/**': floor,
        'packages/gryphon-designmd/src/core/values/**': floor,
      },
    },
  },
});
