import { defineConfig } from 'vitest/config';

// Coverage floors from CLAUDE.md: at least 80% on the parser and the
// scanner. The folders do not exist yet; the thresholds apply as soon
// as they do (G3-04 and G3-09).
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
      },
    },
  },
});
