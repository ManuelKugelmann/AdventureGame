import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'content/content.json', 'reports/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Engine purity: no react/dom/IO imports inside /engine
    files: ['engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['react*', 'konva*', 'zustand*', 'node:*', 'fs', 'path'], message: 'engine must stay pure (no UI/IO imports)' }] },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'fetch'],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'engine is deterministic — no wall clock' },
        { object: 'Math', property: 'random', message: 'engine uses seeded RNG only' },
      ],
    },
  },
);
