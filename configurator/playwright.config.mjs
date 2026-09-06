import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Aborts the run if dist/web does not match the working tree. dist/ is gitignored, so it
  // survives branch switches and the webServer below would otherwise serve another branch's
  // build without any signal that it had done so.
  globalSetup: './e2e/global-setup.mjs',
  timeout: 45_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  // The `github` reporter turns each failure into a workflow annotation, which
  // lands inline on the PR diff and in the Checks API. Without it the only
  // record of *which* spec failed is inside the uploaded HTML report, which
  // costs a download and is unavailable to anything reading the API.
  reporter: process.env.CI
    ? [['github'], ['line'], ['html', { open: 'never' }]]
    : 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Optional escape hatch for sandboxes whose Chromium binary predates the
    // pinned one and rejects flags Playwright adds itself (e.g. Chrome 149
    // rejecting --disable-headless-shell). No-op when unset.
    launchOptions: process.env.PW_IGNORE_DEFAULT_ARGS
      ? { ignoreDefaultArgs: process.env.PW_IGNORE_DEFAULT_ARGS.split(',') }
      : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'python3 -m http.server 4173 -d dist/web',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
