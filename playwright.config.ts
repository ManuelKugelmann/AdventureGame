import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview', // always serve current code, not a stale dist
    url: 'http://localhost:4173/AdventureGame/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
