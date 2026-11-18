import { test, expect } from '@playwright/test';
import { generateFor, PROFILES, DEVICES, SERVICES } from '../../scripts/smart-template/dimensions.mjs';

// The smart template (Templates/Smart/core-builds.json) promises the setup Quick
// install builds for the same answers. packages/core/tests/smart-template.test.mjs
// proves the template equals generateFor(); this proves generateFor() equals what
// the configurator itself builds from Quick install's state. Before v3.31 nothing
// checked this side, and the template preferred lossless audio on devices that
// cannot play it.
//
// Host: ForTheWeak, which restricts nothing. On ElfHosted the configurator drops
// what that host refuses (Torrentio, P2P); AIOStreams does the same to an imported
// template through its own preset filter.
test('every service and device: Quick install builds what the smart template reproduces', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?cb-e2e=1');
  await page.waitForFunction(() => !!window.__coreBuilds);
  const services = [...SERVICES.map(([id, cfg]) => [id, cfg]), ['', 'p2p']];
  const resolutions = ['4k', '1080p', 'mixed'];
  const profiles = Object.keys(PROFILES);
  let i = 0;
  const mismatches = [];
  for (const [serviceId, cfg] of services) for (const [device] of DEVICES) {
    // The other answers cycle, so each value meets every service and device somewhere.
    const answers = { device, resolution: resolutions[i % 3], profile: profiles[(i >> 1) % 3], cachedOnly: i % 2 === 1, anime: i % 5 === 0, language: 'English' };
    i++;
    const state = {
      service: cfg, multiServices: [cfg], p2pEnabled: cfg === 'p2p', optionalScrapers: [], addonServices: [],
      device, resolution: answers.resolution, content: answers.anime ? 'anime' : 'all', langs: ['English'],
      cacheMode: answers.cachedOnly ? 'cached' : 'mixed', ...PROFILES[answers.profile], quickProfile: answers.profile,
      formatter: 'family-v4', matchMode: 'balanced', excludeDV: false, exclude4K: false, quickStart: true,
      instanceHost: 'fortheweak', creds: {},
    };
    const web = (await page.evaluate(s => window.__coreBuilds.generate(s), state)).config;
    const want = generateFor(answers, serviceId);
    const keys = [...new Set([...Object.keys(web), ...Object.keys(want)])].filter(k => JSON.stringify(web[k]) !== JSON.stringify(want[k]));
    if (keys.length) mismatches.push(`${cfg}/${device}/${answers.resolution}/${answers.profile}: ${keys.join(', ')}`);
  }
  expect(i).toBe(services.length * DEVICES.length);
  expect(mismatches, mismatches.slice(0, 8).join('\n')).toEqual([]);
});
