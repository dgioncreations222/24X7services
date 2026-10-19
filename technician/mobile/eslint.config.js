// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'dist-web*/*',
      'src/uniwind-types.d.ts',
      // Kept in the repo but no longer reached from the new job flow (the
      // customer signs nothing on the technician's phone). Not linted rather
      // than edited, per the plan's no-delete / don't-touch rule.
      'src/components/SignaturePad.tsx',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // @app/shared resolves for the type checker only (tsconfig paths); it is
      // not in the app's bundle, so a value import would fail at runtime.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@app/shared', allowTypeImports: true, message: 'Type-only: @app/shared is not bundled into the app yet.' }],
        },
      ],
    },
  },
])
