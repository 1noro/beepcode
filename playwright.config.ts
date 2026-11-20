import { defineConfig, devices } from '@playwright/test';

// Runs in the `e2e` container, which shares the network of the `web` service
// (make e2e): http://localhost there is nginx, and a secure context.
const baseURL = process.env.BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
