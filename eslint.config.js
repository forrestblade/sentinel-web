import neostandard, { plugins } from 'neostandard'

const tsPlugin = plugins['typescript-eslint'].plugin

export default [
  { ignores: ['**/dist/', '**/public/'] },
  ...neostandard({ ts: true }),
  {
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-redeclare': 'off',
      complexity: ['error', 20],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ThrowStatement',
          message: 'Use Result/ResultAsync instead of throw'
        },
        {
          selector: 'TryStatement',
          message: 'Use Result/ResultAsync instead of try/catch'
        },
        {
          selector: 'TSEnumDeclaration',
          message: 'Use const unions instead of enum'
        },
        {
          selector: 'SwitchStatement',
          message: 'Use dictionary maps instead of switch'
        },
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports instead of export default'
        }
      ]
    }
  },
  {
    files: ['vitest.config.ts', 'eslint.config.js', 'playwright.config.ts'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  {
    files: ['**/__tests__/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  }
]
