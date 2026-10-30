// PURPOSE: Playwright end-to-end tests (tests/e2e) against the running app and the real backend.
// WHY: QA automation on stable data-testid locators (tests/locators, docs/locators.md) with page objects.
// DEPENDS ON: the backend running (default http://localhost:4000, from VITE_API_URL in .env.local) and the test
//             accounts in .env.e2e (see docs/test-accounts.md). Vite is started here unless E2E_BASE_URL is given.

import { defineConfig, devices } from '@playwright/test';

// Test account e-mails and password live in .env.e2e (git-ignored). Missing file = the role tests are skipped.
try {
  process.loadEnvFile('.env.e2e');
} catch {
  /* no local file: rely on the CI environment */
}

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: 'tests/e2e',
  // Sign-ins go to Supabase Auth, which rate-limits; two workers keep the suite quick without tripping it.
  workers: 2,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    testIdAttribute: 'data-testid',
    // the app turns animations off for reduced motion (src/styles/theme.css)
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      // Installed Google Chrome by default (no browser download); PW_CHANNEL=chromium uses Playwright's own build.
      use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL ?? 'chrome' },
    },
  ],
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run dev -- --port 5173 --strictPort',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
