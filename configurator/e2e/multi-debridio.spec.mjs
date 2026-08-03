import { test, expect } from '@playwright/test';

test('multi-service output includes Debridio and selected Usenet Crawler', async ({ page }) => {
  await page.goto('/?cb-e2e=1');
  await page.waitForFunction(() => !!window.__coreBuilds);

  const template = await page.evaluate(() => window.__coreBuilds.generate({
    service: 'multi',
    multiServices: ['torbox-pro', 'premiumize', 'debridio'],
    optionalScrapers: ['usenetcrawler'],
    creds: {
      torbox: 'test-torbox-key',
      premiumize: 'test-premiumize-key',
      debridio: 'test-debridio-key',
      usenetcrawler: 'test-usenet-crawler-key',
    },
    device: 'generic',
    resolution: '4k',
    audio: 'limited',
    content: 'all',
    formatter: 'family-v4',
    pseArch: 'standard',
    addonTimeout: 6000,
  }));

  const debridio = template.config.presets.find(preset => preset.type === 'debridio');
  const crawler = template.config.presets.find(preset => preset.instanceId === 'usenetcrawler-1');
  const diagnostics = await page.evaluate(() => window.__coreBuilds.diagnostics());

  expect(debridio, 'Debridio must survive multi-service generation').toBeTruthy();
  expect(debridio.options.apiKey).toBe('test-debridio-key');
  expect(crawler, 'Usenet Crawler must survive optional-scraper generation').toBeTruthy();
  expect(crawler.type).toBe('newznab');
  expect(crawler.options.apiKey).toBe('test-usenet-crawler-key');
  expect(diagnostics.settings.optionalScrapers).toEqual(['usenetcrawler']);
  expect(JSON.stringify(diagnostics)).not.toContain('test-usenet-crawler-key');
});
