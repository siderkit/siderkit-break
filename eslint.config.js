import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import sonarjs from 'eslint-plugin-sonarjs';

const cleanCodeRules = {
  complexity: ['error', 10],
  'max-depth': ['error', 4],
  'max-nested-callbacks': ['error', 3],
  'max-params': ['error', 4],
  'max-statements': ['error', 40],
  'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
  'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
  'no-else-return': 'error',
  'no-lonely-if': 'error',
  'no-useless-return': 'error',
  'sonarjs/cognitive-complexity': ['error', 15],
  'sonarjs/no-identical-functions': 'error',
  'sonarjs/no-duplicate-string': ['error', { threshold: 4 }],
  '@typescript-eslint/no-explicit-any': 'error',
  'no-console': 'error',
};

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '**/node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.svelte-kit/**',
      '.vite/**',
      'src/paraglide/**',
      'src-tauri/target/**',
      'src-tauri/gen/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  sonarjs.configs.recommended,
  {
    files: ['**/*.{ts,svelte}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: cleanCodeRules,
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // Tests run on Node's test runner and are outside the app tsconfig, so
    // they are linted without type information.
    files: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}'],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: false,
        project: false,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      'max-lines': ['error', { max: 600, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['*.config.{js,mjs,ts}', '*.cjs', 'vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Gate scripts report findings to a terminal; console output is their API.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
);
