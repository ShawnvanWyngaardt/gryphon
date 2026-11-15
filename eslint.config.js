import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // ADR 0002: the engine must run in the browser, so src/core may
    // not use Node modules or Node globals.
    files: ['packages/gryphon-designmd/src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(node:|fs$|path$|os$|child_process$|url$|process$|buffer$)',
              message:
                'src/core must run in the browser. Read files in the CLI or Action and pass text in.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'src/core must run in the browser.' },
        { name: 'Buffer', message: 'src/core must run in the browser.' },
        { name: 'require', message: 'src/core is ESM and must run in the browser.' },
      ],
    },
  },
);
