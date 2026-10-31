import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    // Every test by name, so a run (local or in CI) shows what was checked.
    reporters: ['verbose'],
    root: __dirname,
    // The rules tests talk to one emulator instance and clear it between
    // cases, so running files in parallel would have them wipe each other.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
