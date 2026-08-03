import { test, expect } from '@playwright/test';

test('SubDL serializes selected languages using the AIOStreams schema', async ({ page }) => {
  await page.goto('/?cb-e2e=1');
  await page.waitForFunction(() => !!window.__coreBuilds);

  const template = await page.evaluate(() => window.__coreBuilds.generate({
    service: 'multi',
    multiServices: ['realdebrid', 'torbox-ess'],
    device: 'windows',
    resolution: 'ultrawide',
    audio: 'lossless',
    content: 'all',
    formatter: 'family-v4',
    pseArch: 'standard',
    subtitleAddons: ['subdl'],
    subtitleLangs: ['en', 'it', 'fr'],
    creds: { subdl: 'test-subdl-key' },
    addonTimeout: 6000,
  }));

  const subdl = template.config.presets.find(preset => preset.type === 'subdl');
  expect(subdl).toBeTruthy();
  expect(subdl.options.language).toEqual(['EN', 'IT', 'FR']);
  expect(subdl.options.languages).toBeUndefined();
  expect(subdl.options.hearingImpairment).toBe('hiInclude');
  expect(subdl.options.resources).toEqual(['subtitles']);
});
