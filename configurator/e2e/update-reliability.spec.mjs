import { test, expect } from '@playwright/test';
import { invalidSortCriteria } from '../src/config/generated/aiostreams-sort-schema.js';
import { unknownConfigKeys } from '../src/config/generated/aiostreams-config-schema.js';
import { validateConfigOptions } from './lib/aiostreams-contract.mjs';

const BASE = {
  service: 'torbox-pro', multiServices: ['torbox-pro'], device: 'googletv',
  resolution: '4k', content: 'all', audio: 'limited', name: 'Core Google TV',
  quickStart: false, simpleMode: false, outputProfile: 'balanced', pseArch: 'standard',
  instanceHost: 'custom', instanceUrl: 'https://host.example.invalid',
  creds: { torbox: 'SYNTHETIC-TORBOX-KEY' },
};

async function boot(page, createTemplate = true) {
  // Never call a real host/provider with these synthetic fixtures.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.goto('/?cb-e2e=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__coreBuilds));
  return createTemplate ? page.evaluate(state => window.__coreBuilds.generate(state), BASE) : null;
}

async function review(page, template) {
  await page.locator('[data-action="update-template"]').click();
  await page.locator('#updTplInput').fill(JSON.stringify(template));
  await page.locator('#updTplApply').click();
  await expect(page.locator('#diffModal')).toBeVisible();
}

async function apply(page) {
  await page.locator('#dfApply').click();
  await expect(page.locator('#diffModal')).toHaveCount(0);
  return page.evaluate(() => window.__coreBuilds.generate());
}

test('update preserves keyed scrapers, multiple indexers, options and instance IDs', async ({ page }) => {
  const original = await boot(page);
  const sources = [
    { type: 'webstreamr', instanceId: 'my-webstreamr', enabled: true, resources: ['stream'], options: { name: 'My WebStreamr', timeout: 8000 } },
    { type: 'newznab', instanceId: 'indexer-one', enabled: true, resources: ['stream'], options: { name: 'Indexer One', timeout: 7000, api: { url: 'https://indexer-one.example.invalid/api', apiKey: 'SYNTHETIC-INDEXER-ONE' }, searchMode: 'auto' } },
    { type: 'newznab', instanceId: 'indexer-two', enabled: true, resources: ['stream'], options: { name: 'Indexer Two', timeout: 5000, api: { url: 'https://indexer-two.example.invalid/api', apiKey: 'SYNTHETIC-INDEXER-TWO' }, searchMode: 'auto' } },
    { type: 'debridio', instanceId: 'my-debridio', enabled: true, resources: ['stream'], options: { name: 'My Debridio', timeout: 6500, debridioApiKey: 'SYNTHETIC-DEBRIDIO' } },
  ];
  original.config.presets.push(...sources);
  await review(page, original);
  // Options are compared but credential values must not be rendered in the diff.
  await expect(page.locator('#diffModal')).not.toContainText('SYNTHETIC-');
  const updated = await apply(page);
  for (const source of sources) {
    expect(updated.config.presets.find(p => p.instanceId === source.instanceId)).toEqual(source);
  }
  const ids = updated.config.presets.map(p => p.instanceId);
  expect(new Set(ids).size).toBe(ids.length);
  expect(updated.config.services.find(s => s.id === 'torbox').credentials.apiKey).toBe('SYNTHETIC-TORBOX-KEY');

  // Reloading the local saved setup must not silently lose the preserved sources.
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__coreBuilds));
  const reloaded = await page.evaluate(() => window.__coreBuilds.generate());
  for (const source of sources) expect(reloaded.config.presets.find(p => p.instanceId === source.instanceId)).toEqual(source);
  const backups = await page.evaluate(() => localStorage.getItem('coreBuildBackups') || '');
  expect(backups).not.toContain('SYNTHETIC-');
});

test('keeping sorting preserves all scopes, directions and preference lists through Stable', async ({ page }) => {
  const original = await boot(page);
  original.metadata.coreBuildsProfile = 'stable';
  original.config.sortCriteria = {
    global: [{ key: 'resolution', direction: 'asc' }],
    movies: [{ key: 'size', direction: 'asc' }, { key: 'resolution', direction: 'desc' }],
    cachedAnime: [{ key: 'seadex', direction: 'desc' }, { key: 'size', direction: 'asc' }],
  };
  original.config.preferredResolutions = ['1080p', '2160p', '1440p', '720p', 'Unknown'];
  await review(page, original);
  await page.locator('[data-sec-key="sort"] input[type="checkbox"]').uncheck();
  const updated = await apply(page);
  expect(updated.config.sortCriteria).toEqual(original.config.sortCriteria);
  expect(updated.config.preferredResolutions).toEqual(original.config.preferredResolutions);
  expect(invalidSortCriteria(updated.config.sortCriteria)).toEqual([]);
});

test('identical final output is not reported as a raw-generator upgrade', async ({ page }) => {
  const original = await boot(page);
  await review(page, original);
  await expect(page.locator('#diffModal .df-empty')).toContainText('No configuration changes');
  await expect(page.locator('#diffModal .df-stat-num').last()).toHaveText('0');
});

test('preview and cancel leave stored metadata, backups and the active state unchanged', async ({ page }) => {
  const original = await boot(page);
  const meta = { sourceUrl: 'https://example.invalid/old.json', version: '1.0.0', name: 'Original' };
  const backups = [{ device: 'googletv', resolution: '4k', _ts: 123, _ver: '3.13' }];
  await page.evaluate(({ meta, backups }) => {
    localStorage.setItem('coreBuildLastTemplate', JSON.stringify(meta));
    localStorage.setItem('coreBuildBackups', JSON.stringify(backups));
  }, { meta, backups });
  original.metadata.sourceUrl = 'https://example.invalid/new.json';
  original.metadata.version = '2.0.0';
  await review(page, original);
  const storageBeforeCancel = await page.evaluate(() => ({
    meta: JSON.parse(localStorage.getItem('coreBuildLastTemplate')),
    backups: JSON.parse(localStorage.getItem('coreBuildBackups')),
  }));
  expect(storageBeforeCancel).toEqual({ meta, backups });
  await page.locator('#dfCancel').click();
  await expect(page.locator('#diffModal')).toHaveCount(0);
  const after = await page.evaluate(() => window.__coreBuilds.generate());
  expect(after.config).toEqual(original.config);
});

test('update accepts a single-template AIOStreams export and retains cached-only mode', async ({ page }) => {
  const original = await boot(page);
  original.config.excludeUncached = true;
  await review(page, [original]);
  const updated = await apply(page);
  expect(updated.config.excludeUncached).toBe(true);
  expect(updated.config.excludeCached).toBe(false);
});

test('same-label expression changes and direction-only sorting changes appear in the review', async ({ page }) => {
  const current = await boot(page);
  const original = structuredClone(current);
  original.config.excludedStreamExpressions[1].expression = original.config.excludedStreamExpressions[1].expression.replace('>= 3', '>= 4');
  original.config.sortCriteria.global[0].direction = 'asc';
  await review(page, original);
  await expect(page.locator('[data-sec-key="eses"]')).toContainText('updated');
  await expect(page.locator('[data-sec-key="sort"]')).toContainText('direction changed');
  const updated = await apply(page);
  expect(updated.config.excludedStreamExpressions).toEqual(current.config.excludedStreamExpressions);
  expect(updated.config.sortCriteria).toEqual(current.config.sortCriteria);
});

test('Undo restores local settings, source options and metadata without contacting a host', async ({ page }) => {
  const original = await boot(page);
  const meta = { sourceUrl: 'https://example.invalid/original.json', name: 'Original', version: '1.0.0' };
  await page.evaluate(meta => localStorage.setItem('coreBuildLastTemplate', JSON.stringify(meta)), meta);
  original.metadata.name = 'Changed name';
  original.metadata.sourceUrl = 'https://example.invalid/updated.json';
  original.metadata.version = '2.0.0';
  await review(page, original);
  await apply(page);
  await expect(page.getByRole('button', { name: 'Undo local update' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo local update' }).click();
  const restored = await page.evaluate(() => ({ template: window.__coreBuilds.generate(), meta: JSON.parse(localStorage.getItem('coreBuildLastTemplate')) }));
  expect(restored.template.metadata.name).toBe(BASE.name);
  expect(restored.meta).toEqual(meta);
  await expect(page.getByRole('button', { name: 'Undo local update' })).toHaveCount(0);
});

test('explicit optional-source edits are honoured after an update', async ({ page }) => {
  const original = await boot(page);
  original.config.presets.push({ type: 'webstreamr', instanceId: 'my-web', enabled: true, resources: ['stream'], options: { name: 'My Web', timeout: 7000 } });
  await review(page, original);
  await apply(page);
  await page.locator('[data-action="jump-step"][data-step="1"]:visible').first().click();
  const toggle = page.locator('[data-action="toggle-optional-scraper"][data-scraper-id="webstreamr"]').first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  const updated = await page.evaluate(() => window.__coreBuilds.generate());
  expect(updated.config.presets.some(p => p.type === 'webstreamr')).toBe(false);
});

test('multi-template collections and duplicate source IDs are rejected without opening a preview', async ({ page }) => {
  const original = await boot(page);
  await page.locator('[data-action="update-template"]').click();
  await page.locator('#updTplInput').fill(JSON.stringify([original, original]));
  await page.locator('#updTplApply').click();
  await expect(page.locator('#updTplErr')).toContainText('Choose one template');
  await expect(page.locator('#diffModal')).toHaveCount(0);
  original.config.presets.push(structuredClone(original.config.presets[0]));
  await page.locator('#updTplInput').fill(JSON.stringify(original));
  await page.locator('#updTplApply').click();
  await expect(page.locator('#updTplErr')).toContainText('Duplicate preset instanceId');
  await expect(page.locator('#diffModal')).toHaveCount(0);
});

test('first-time Google TV Express install submits a valid, bounded Stable payload', async ({ page }) => {
  await boot(page, false);
  let posted;
  await page.route('**/api/v1/status', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.34.1' } }) }));
  await page.route('**/api/v1/user', route => {
    if (route.request().method() !== 'POST') return route.abort();
    posted = JSON.parse(route.request().postData());
    const contract = validateConfigOptions(posted.config);
    expect(contract.ok).toBe(true);
    expect(unknownConfigKeys(posted.config)).toEqual([]);
    expect(invalidSortCriteria(posted.config.sortCriteria)).toEqual([]);
    expect(Buffer.byteLength(JSON.stringify(posted.config))).toBeLessThan(102400);
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: '11111111-2222-4333-8444-555555555555', encryptedPassword: 'synthetic-password' } }) });
  });
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('#expressLaneModal details > summary').click();
  await page.locator('[data-express-device="googletv"]').click();
  await page.locator('[data-express-cred="torbox"]').fill('SYNTHETIC-TORBOX-KEY');
  await page.locator('[data-express-target="manifest"]').click();
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#manifestModal')).toBeVisible();
  expect(posted.config.presets.length).toBeGreaterThan(0);
  expect(posted.config.groups.enabled).toBe(false);
  expect(posted.config.dynamicAddonFetching.enabled).toBe(false);
  expect(posted.config.hideErrors).toBe(false);
  expect(posted.config.services.find(s => s.id === 'torbox').credentials.apiKey).toBe('SYNTHETIC-TORBOX-KEY');
});

test('update works when structuredClone is unavailable in the browser', async ({ page }) => {
  await page.addInitScript(() => { window.structuredClone = undefined; });
  const original = await boot(page);
  await review(page, original);
  const updated = await apply(page);
  expect(updated.config).toEqual(original.config);
});

test('a manual global timeout edit reaches retained source options after an update', async ({ page }) => {
  const original = await boot(page);
  original.config.presets.push({ type: 'webstreamr', instanceId: 'my-web', enabled: true, resources: ['stream'], options: { name: 'My Web', timeout: 7500 } });
  await review(page, original);
  await apply(page);
  await page.locator('[data-action="jump-step"][data-step="1"]:visible').first().click();
  await page.locator('[data-action="open-advanced"]').click();
  await page.locator('[data-action="set-addon-timeout"][data-val="8000"]').click();
  const updated = await page.evaluate(() => window.__coreBuilds.generate());
  expect(updated.config.presets.find(p => p.instanceId === 'my-web').options.timeout).toBe(8000);
  expect(updated.config.presets.every(p => p.options.timeout === 8000)).toBe(true);
});

test('opening and cancelling formatter import does not release a kept formatter', async ({ page }) => {
  const original = await boot(page);
  original.metadata.coreBuildsProfile = 'stable';
  original.config.formatter = { id: 'tamtaro', definitions: { overrides: { tamtaro: { name: 'Custom kept name', description: 'Custom kept description' } } } };
  await review(page, original);
  await page.locator('[data-sec-key="formatter"] input[type="checkbox"]').uncheck();
  await apply(page);
  await page.locator('[data-action="jump-step"][data-step="1"]:visible').first().click();
  await page.locator('[data-action="open-advanced"]').click();
  await page.locator('#advancedDrawer [data-action="import-formatter"]').click();
  await page.locator('#fmtImClose').click();
  await expect(page.locator('#fmtImportModal')).toHaveCount(0);
  const updated = await page.evaluate(() => window.__coreBuilds.generate());
  expect(updated.config.formatter).toEqual(original.config.formatter);
});

test('manual subtitle edits release kept sources, respect language dialects and survive reload', async ({ page }) => {
  const original = await boot(page);
  const subtitleTypes = ['aiosubtitle', 'opensubtitles-v3-plus', 'subdl'];
  original.config.presets = original.config.presets.filter(p => !subtitleTypes.includes(p.type));
  const subtitles = [
    { type: 'aiosubtitle', instanceId: 'my-aiosubs', enabled: true, resources: ['subtitles'], options: { name: 'My AIOSubtitle', timeout: 7000, languages: ['en'] } },
    { type: 'opensubtitles-v3-plus', instanceId: 'my-opensubs', enabled: true, resources: ['subtitles'], options: { name: 'My OpenSubtitles', timeout: 7000, language: ['es'] } },
    { type: 'subdl', instanceId: 'my-subdl', enabled: true, resources: ['subtitles'], options: { name: 'My SubDL', timeout: 7000, language: ['IT'], subDlApiKey: 'SYNTHETIC-SUBDL' } },
  ];
  original.config.presets.push(...subtitles);
  // An omitted enabled flag defaults to enabled, but is still a native-value
  // difference from the regenerated service. Keep the whole source section.
  delete original.config.services.find(s => s.id === 'torbox').enabled;
  await review(page, original);
  await page.locator('[data-sec-key="sources"] input[type="checkbox"]').uncheck();
  await apply(page);
  await page.locator('[data-action="jump-step"][data-step="1"]:visible').first().click();
  await page.locator('[data-action="open-advanced"]').click();
  // Removing the last language is a no-op; it must not rewrite the other
  // providers' independently imported languages or release their kept values.
  await page.locator('#advancedDrawer [data-action="toggle-sub-lang"][data-val="en"]').click();
  const unchanged = await page.evaluate(() => window.__coreBuilds.generate());
  for (const source of subtitles) expect(unchanged.config.presets.find(p => p.instanceId === source.instanceId)).toEqual(source);
  await page.locator('#advancedDrawer [data-action="toggle-sub-lang"][data-val="fr"]').click();
  const updated = await page.evaluate(() => window.__coreBuilds.generate());
  expect(updated.config.presets.find(p => p.instanceId === 'my-aiosubs').options.languages).toEqual(['en', 'fr']);
  expect(updated.config.presets.find(p => p.instanceId === 'my-opensubs').options.language).toEqual(['en', 'fr']);
  expect(updated.config.presets.find(p => p.instanceId === 'my-subdl').options.language).toEqual(['EN', 'FR']);
  expect(updated.config.presets.find(p => p.instanceId === 'my-subdl').options.subDlApiKey).toBe('SYNTHETIC-SUBDL');
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__coreBuilds));
  const reloaded = await page.evaluate(() => window.__coreBuilds.generate());
  expect(reloaded.config.presets).toEqual(updated.config.presets);

  // Keep the sources again, then exercise the actual source-toggle control.
  await review(page, reloaded);
  await page.locator('[data-sec-key="sources"] input[type="checkbox"]').uncheck();
  await apply(page);
  await page.locator('[data-action="jump-step"][data-step="1"]:visible').first().click();
  await page.locator('[data-action="open-advanced"]').click();
  await page.locator('#advancedDrawer [data-action="toggle-sub-addon"][data-val="opensubtitles-v3-plus"]').click();
  const deselected = await page.evaluate(() => window.__coreBuilds.generate());
  expect(deselected.config.presets.some(p => p.instanceId === 'my-opensubs' && p.enabled !== false)).toBe(false);
  expect(deselected.config.presets.find(p => p.instanceId === 'my-aiosubs').options.timeout).toBe(7000);

  // SubDL-only exports use uppercase codes; the wizard must display them as
  // selected and remove French rather than append a duplicate FR entry.
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__coreBuilds));
  deselected.config.presets = deselected.config.presets.filter(p => p.instanceId !== 'my-aiosubs' && p.instanceId !== 'my-opensubs');
  deselected.config.presets.find(p => p.instanceId === 'my-subdl').options.language = ['EN', 'FR'];
  await review(page, deselected);
  await apply(page);
  await page.locator('[data-action="jump-step"][data-step="1"]:visible').first().click();
  await page.locator('[data-action="open-advanced"]').click();
  const french = page.locator('#advancedDrawer [data-action="toggle-sub-lang"][data-val="fr"]');
  await expect(french).toHaveCSS('font-weight', '700');
  await french.click();
  const subdlOnly = await page.evaluate(() => window.__coreBuilds.generate());
  expect(subdlOnly.config.presets.find(p => p.instanceId === 'my-subdl').options.language).toEqual(['EN']);
});
