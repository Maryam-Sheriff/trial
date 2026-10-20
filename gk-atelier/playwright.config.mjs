import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'line' : 'list',
  webServer: {
    command: 'node tests/e2e/serve-fixtures.mjs',
    url: 'http://localhost:4311/',
    timeout: 120_000,
    reuseExistingServer: false,
  },
  use: {
    baseURL: 'http://localhost:4310',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
