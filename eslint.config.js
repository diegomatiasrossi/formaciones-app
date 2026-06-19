import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'design-system'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // react-refresh: warn para exports no-component (aceptable en este proyecto)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Reglas v7 demasiado estrictas para patrones legítimos en este codebase:
      'react-hooks/set-state-in-effect': 'off',  // setState en effect es intencional en usePlan, tutorial
      'react-hooks/refs': 'off',                  // refs en render: ya migradas donde correspondía

      // TypeScript: permitir any con advertencia solo en casos aislados
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
)
