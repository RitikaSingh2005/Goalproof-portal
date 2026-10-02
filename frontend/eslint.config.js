import js from '@eslint/js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'test.jsx']
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        Promise: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'warn',
      'no-empty': 'warn'
    }
  }
];
