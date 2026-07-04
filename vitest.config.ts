import { defineConfig } from 'vitest/config';

// Default test run: unit + golden + playtest smoke. Property tests run via vitest.props.config.ts.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/property/**', '**/node_modules/**'],
  },
});
