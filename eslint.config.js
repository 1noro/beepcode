import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'dev-dist/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      '.cache/',
      'node_modules/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['scripts/**', '*.config.{ts,js}'],
    languageOptions: { globals: { ...globals.node } },
  },
  // src/morse/ is pure logic (SPEC §10.2, ADR 0003): no DOM, audio or UI.
  {
    files: ['src/morse/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'localStorage',
          'AudioContext',
          'HTMLElement',
          'Event',
        ].map((name) => ({ name, message: 'src/morse/ is pure logic: no DOM or audio.' })),
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '!../morse/*'],
              message: 'src/morse/ imports nothing from outside src/morse/.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
