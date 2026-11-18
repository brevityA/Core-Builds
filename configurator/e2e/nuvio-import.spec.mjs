import { test, expect } from '@playwright/test';
import { unknownConfigKeys } from '../src/config/generated/aiostreams-config-schema.js';
import { invalidSortCriteria } from '../src/config/generated/aiostreams-sort-schema.js';
import { validateConfigOptions } from './lib/aiostreams-contract.mjs';

for (const service of ['p2p', 'torbox-pro']) {
  test(`Nuvio import from ${service} uploads the specialised config and falls back to dpaste`, async ({ page }) => {
    const requests = [];
    let uploadedTemplate = '';

    await page.route('**/*', async route => {
      const url = route.request().url();
      if (url.includes('core-builds-cors-proxy') && url.endsWith('/paste')) {
        requests.push('worker');
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) });
      }
      if (url.startsWith('https://paste.rs/')) {
        requests.push('paste.rs');
        return route.abort('failed');
      }
      if (url.startsWith('https://dpaste.com/api/v2/')) {
        requests.push('dpaste');
        uploadedTemplate = new URLSearchParams(route.request().postData() || '').get('content') || '';
        return route.fulfill({ status: 200, contentType: 'text/plain', body: 'https://dpaste.com/nuvio-fallback' });
      }
      return route.continue();
    });

    await page.goto('/?cb-e2e=1');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
    await page.reload();
    await page.waitForFunction(() => !!window.__coreBuilds);
    // Seed a token as if the visitor had configured TMDB before switching to the
    // Nuvio route. It must not be sent to the public import/paste endpoint.
    await page.evaluate(service => window.__coreBuilds.generate({
      service, multiServices: [service], device: 'generic', resolution: '1080p',
      creds: { torbox: 'NUVIO_TORBOX_KEY_MUST_NOT_LEAK' },
      content: 'all', tmdbToken: 'NUVIO_TMDB_TOKEN_MUST_NOT_LEAK', tmdbApiKey: '',
    }), service);

    await page.locator('[data-action="open-express-lane"]').click();
    await page.locator('#expressHost').selectOption('midnight'); // explicit compatible host — Express honors the pick post-#684 (#682)
    await page.locator('[data-express-target="nuvio"]').click();
    await page.locator('#expressGo').click();

    await expect(page.locator('#aioResult')).toContainText('Nuvio template ready');
    await expect(page.locator('#aioResult')).toContainText('https://dpaste.com/nuvio-fallback.txt');
    expect(requests).toEqual(['worker', 'paste.rs', 'dpaste']);
    expect(uploadedTemplate).not.toContain('NUVIO_TMDB_TOKEN_MUST_NOT_LEAK');
    expect(uploadedTemplate).not.toContain('NUVIO_TORBOX_KEY_MUST_NOT_LEAK');
    const template = JSON.parse(uploadedTemplate);
    expect(template.config).toBeTruthy();
    expect(template.config.services).toEqual([]);
    expect(template.config.preferredStreamTypes).toEqual(['p2p']);
    expect(template.config.presets.some(p => p.type === 'library')).toBe(false);
    for (const type of ['torrentio', 'comet', 'mediafusion', 'meteor', 'stremthruTorz']) {
      expect(template.config.presets.some(p => p.type === type), type).toBe(true);
    }
    expect(template.config.presets.find(p => p.type === 'comet').options.scrapeDebridAccountTorrents).toBe(false);
    expect(template.config.presets.find(p => p.type === 'stremthruTorz').options.includeP2P).toBe(true);
    await expect(page.locator('#aioResult .inst-chip-import')).toHaveCount(1);
    await expect(page.locator('#aioResult .inst-chip-import')).toHaveAttribute('href', /midnight.*template=/);
    expect(unknownConfigKeys(template.config)).toEqual([]);
    expect(invalidSortCriteria(template.config.sortCriteria)).toEqual([]);
    expect(validateConfigOptions(template.config).ok).toBe(true);
    await expect(page.locator('#aioResult')).toContainText(/import.*AIOStreams/i);
  });
}

test('Nuvio paste failure offers the actual Nuvio JSON instead of the previous wizard config', async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.fulfill({ status: 503, body: 'Unavailable' });
  });
  await page.goto('/?cb-e2e=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__coreBuilds));
  await page.evaluate(() => window.__coreBuilds.generate({ service: 'torbox-pro', multiServices: ['torbox-pro'], device: 'googletv', resolution: '4k', content: 'all', creds: { torbox: 'LOCAL-TORBOX-KEY' } }));
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('#expressHost').selectOption('midnight');
  await page.locator('[data-express-target="nuvio"]').click();
  await page.locator('#expressGo').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Nuvio JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('core-nuvio-torbox-instant.json');
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const json = Buffer.concat(chunks).toString('utf8');
  const template = JSON.parse(json);
  expect(template.config.services).toEqual([]);
  expect(template.config.preferredStreamTypes).toEqual(['p2p']);
  expect(template.config.presets.find(p => p.type === 'stremthruTorz').options.includeP2P).toBe(true);
  expect(json).not.toContain('LOCAL-TORBOX-KEY');
});
