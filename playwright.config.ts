import { defineConfig } from '@playwright/test';

// Uses the pre-installed Chromium; do not run `playwright install`.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/simrule/',
    viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' },
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort --base /simrule/',
    url: 'http://localhost:4173/simrule/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
