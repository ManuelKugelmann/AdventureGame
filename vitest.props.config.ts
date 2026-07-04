import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/property/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
