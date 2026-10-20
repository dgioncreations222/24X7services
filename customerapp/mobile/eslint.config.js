// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    // scripts/ is the web export tooling, left alone until the web app is picked up again.
    ignores: ['dist/*', 'dist-web/*', 'scripts/*', 'src/uniwind-types.d.ts', 'src/lib/publicAssets.generated.ts'],
  },
  {
    // Screens and components get their data from src/lib (lib/data hooks,
    // lib/api functions), never from the backend or the mock directly, so
    // wiring the real backend in changes src/lib and no screen.
    files: ['src/app/**', 'src/screens/**', 'src/components/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            // Matches firebase/* and @/lib/firebase alike.
            { group: ['firebase', 'firebase/*'], message: 'Read data through a src/lib/data hook or src/lib/api function.' },
            { group: ['@/lib/mock', '@/lib/mock/*'], message: 'Mock data is reached only through src/lib/data.' },
          ],
        },
      ],
    },
  },
])
