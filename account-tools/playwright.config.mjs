import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: {
    browserName: 'chromium',
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    },
  },
});
