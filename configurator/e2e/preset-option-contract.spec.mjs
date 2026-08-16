/**
 * Preset option contract — the gate that would have caught the Debridio bug on day one.
 *
 * The generated config is checked against option ids read from the AIOStreams preset sources.
 * Three shipped bugs had the same shape: a bare `apiKey` emitted for a preset whose schema
 * declares a prefixed key (debridioApiKey / jackettApiKey / prowlarrApiKey). The host rejects
 * such a config; our mock used to accept it, so the suite stayed green while the live feature
 * was broken for anyone who supplied a key.
 */
import { test, expect } from '@playwright/test';
import {
  validateConfigOptions,
  assertKnownPresetTypes,
  PRESET_OPTION_IDS,
} from './lib/aiostreams-contract.mjs';

/** Generate a config in-page with every credential-bearing preset switched on. */
async function generateWithCredentials(page) {
  await page.goto('/?cb-e2e=1');
  await page.waitForFunction(() => !!window.__coreBuilds);
  return page.evaluate(() => window.__coreBuilds.generate({
    service: 'multi',
    multiServices: ['torbox-pro', 'debridio'],
    optionalScrapers: ['jackett', 'prowlarr', 'usenetcrawler'],
    subtitleAddons: ['subdl'],
    creds: {
      torbox: 'test-torbox-key',
      debridio: 'test-debridio-key',
      // jackettUrl / prowlarrUrl are seeded straight into state because NO UI FIELD COLLECTS
      // THEM — see the known-issue note in the v2.94 changelog. Without this seeding both
      // presets are unreachable and the option-name assertions below would silently cover
      // nothing. Treat this fixture as a contract check on the generator, not as evidence that
      // the feature is reachable from the app.
      jackett: 'test-jackett-key',
      jackettUrl: 'http://localhost:9117',
      prowlarr: 'test-prowlarr-key',
      prowlarrUrl: 'http://localhost:9696',
      usenetcrawler: 'test-crawler-key',
      subdl: 'test-subdl-key',
    },
    device: 'generic', resolution: '4k', audio: 'limited', content: 'all',
    formatter: 'family-v4', pseArch: 'standard', addonTimeout: 6000,
  }));
}

test('generated config satisfies the AIOStreams preset option contract', async ({ page }) => {
  const template = await generateWithCredentials(page);
  const verdict = validateConfigOptions(template.config);
  expect(verdict.ok, verdict.ok ? '' : verdict.error?.message).toBe(true);
});

test('credential presets use their prefixed key, never a bare apiKey', async ({ page }) => {
  const template = await generateWithCredentials(page);
  const byType = Object.fromEntries(template.config.presets.map(p => [p.type, p]));

  // The three that shipped broken. Each must carry its prefixed key and no bare apiKey.
  //
  // These are REQUIRED to exist, not skipped when absent: the fixture supplies a key (and a
  // URL for jackett/prowlarr) for every one, so a missing preset means the generator stopped
  // emitting it — a regression. An `if (!preset) continue` here would let that pass silently,
  // which is precisely the vacuous-assertion pattern this suite exists to stamp out.
  for (const [type, key] of [
    ['debridio', 'debridioApiKey'],
    ['jackett', 'jackettApiKey'],
    ['prowlarr', 'prowlarrApiKey'],
    ['subdl', 'subDlApiKey'], // already correct — anchors the convention rather than a fix
  ]) {
    const preset = byType[type];
    expect(preset, `${type} preset must be emitted when its credentials are supplied`).toBeTruthy();
    expect(preset.options[key], `${type} must emit ${key}`).toBeTruthy();
    expect(preset.options.apiKey, `${type} must not emit a bare apiKey`).toBeUndefined();
  }
});

test('the contract table has not fallen behind the generator', async ({ page }) => {
  // C4 taught this: a hand-maintained table needs a drift alarm, or it silently rots.
  const template = await generateWithCredentials(page);
  const types = template.config.presets.map(p => p.type);
  expect(() => assertKnownPresetTypes(types)).not.toThrow();
});

test('the contract actually rejects a bare apiKey (negative control)', () => {
  // Guards the guard: proves a violating config fails rather than passing vacuously.
  const bad = { presets: [{ type: 'debridio', options: { name: 'Debridio', apiKey: 'k' } }] };
  const verdict = validateConfigOptions(bad);
  expect(verdict.ok).toBe(false);
  expect(verdict.error.message).toContain('apiKey');
  expect(verdict.error.message).toContain('debridio');

  const good = { presets: [{ type: 'debridio', options: { name: 'Debridio', debridioApiKey: 'k' } }] };
  expect(validateConfigOptions(good).ok).toBe(true);

  // Nested shapes (newznab's api:{url,apiKey}) must not trip the unknown-key check...
  const nested = { presets: [{ type: 'newznab', options: { name: 'NZB', api: { url: 'u', apiKey: 'k' } } }] };
  expect(validateConfigOptions(nested).ok).toBe(true);

  // ...but an unmodelled key INSIDE that nested object must still be caught. Accepting the
  // parent wholesale would make the nested case look validated while checking nothing.
  const nestedBad = { presets: [{ type: 'newznab', options: { name: 'NZB', api: { url: 'u', unexpected: 'x' } } }] };
  const nestedVerdict = validateConfigOptions(nestedBad);
  expect(nestedVerdict.ok).toBe(false);
  expect(nestedVerdict.error.message).toContain('api.unexpected');

  // And PRESET_OPTION_IDS must not be empty — an empty table would pass everything.
  expect(Object.keys(PRESET_OPTION_IDS).length).toBeGreaterThan(0);
});
