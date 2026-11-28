import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      jsxA11y.flatConfigs.recommended,
      sonarjs.configs.recommended,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': 'error',
      eqeqeq: 'error',
      'no-nested-ternary': 'error',
      'no-param-reassign': 'error',
      'prefer-const': 'error',
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'import-x/no-cycle': 'error',
      'import-x/no-duplicates': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server', '**/server/*', '@/server', '@/server/*'],
              message: 'Client code in src/ must not import from server/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['server/**/*.ts', 'server.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src', '**/src/*', '@/src', '@/src/*'],
              message: 'Server code must not import from src/. Use shared/ instead.',
            },
            {
              group: ['@/*', '@shared', '@shared/*'],
              message:
                'Server files run directly in Node and must use relative paths instead of path aliases.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src', '**/src/*', '**/server', '**/server/*', '@/src/*', '@/server/*'],
              message: 'shared/ modules must stay independent of src/ and server/.',
            },
            {
              group: ['@/*', '@shared', '@shared/*'],
              message: 'shared/ modules must use relative imports for Node compatibility.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/tests/**/*.{ts,tsx}'],
    rules: {
      'max-lines-per-function': 'off',
      'no-restricted-imports': 'off',
    },
  },
  eslintConfigPrettier,
);
