import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const APP_FILES = ['src/**/*.{js,jsx}', 'shared/**/*.js'];

export default [
  js.configs.recommended,
  {
    // 2022 so class fields parse — ErrorFallback.jsx uses one, and at 2021
    // ESLint failed on it with a parse error rather than a lint warning.
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    },
    files: APP_FILES,
    settings: { react: { version: 'detect' } },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin
    }
  },
  {
    files: APP_FILES,
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // The copy is full of apostrophes and quoted strategy lines on purpose;
      // they render correctly and &apos; soup would hurt readability.
      'react/no-unescaped-entities': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    // Worker runtime: Cloudflare Workers expose the fetch-platform globals.
    files: ['worker/src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.worker }
    }
  },
  {
    // Tests, setup and Node scripts: Vitest, Node and DOM globals.
    files: ['**/*.test.{js,jsx}', 'vitest.setup.js', '*.config.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...globals.vitest }
    }
  },
  {
    ignores: ['dist/**', 'worker/node_modules/**', 'worker/.wrangler/**', 'node_modules/**']
  }
];
