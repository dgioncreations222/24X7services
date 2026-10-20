import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    root: __dirname,
    // The rules tests talk to one emulator instance and clear it between
    // cases, so running files in parallel would have them wipe each other.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
