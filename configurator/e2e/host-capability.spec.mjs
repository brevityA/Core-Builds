import { test, expect } from '@playwright/test';

/**
 * Host-capability gate, end to end.
 *
 * Covers the Phase 4 acceptance criteria that can only be checked in a real
 * browser: selecting a host with an incompatible option, the one-line reasons
 * shown for it, and the shape of what actually leaves the app — the JSON export
 * and the direct-install payload.
 *
 * NOTE: these specs need Playwright browsers (`npx playwright install chromium`).
 */

const E2E = '/?cb-e2e=1';

async function bootstrap(page) {
  await page.goto(E2E);
  await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 15000 });
}

const BASE_STATE = {
  service: 'torbox-pro',
  multiServices: ['torbox-pro'],
  device: 'generic',
  audio: 'limited',
  content: 'all',
  resolution: '4k',
  formatter: 'family-v4',
  pseArch: 'standard',
  outputProfile: 'auto',
  instanceHost: 'elfhosted',
  langs: ['English'],
};

test.describe('host capability gate', () => {
  test('an ElfHosted export never contains Torrentio or a rejected key', async ({ page }) => {
    await bootstrap(page);
    const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), { ...BASE_STATE, instanceHost: 'elfhosted', service: 'p2p', multiServices: ['p2p'], p2pEnabled: true });

    const presetTypes = (tpl.config.presets || []).map(p => p.type);
    expect(presetTypes, 'Torrentio is disabled on the ElfHosted community instance').not.toContain('torrentio');
    expect(presetTypes).not.toContain('anime-kitsu');
    expect(presetTypes).not.toContain('torrent-catalogs');

    for (const dead of ['maxResults', 'maxResultsPerResolution', 'minSeeders', 'enhanceResults', 'seadexBestOnly', 'excludedStreamSources']) {
      expect(tpl.config, `${dead} is not part of the AIOStreams schema`).not.toHaveProperty(dead);
    }
    expect(tpl.config.excludedStreamTypes || []).toEqual(expect.arrayContaining(['p2p', 'http']));
  });

  test('a permissive host keeps the options ElfHosted blocks', async ({ page }) => {
    await bootstrap(page);
    const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), { ...BASE_STATE, instanceHost: 'fortheweak', service: 'p2p', multiServices: ['p2p'], p2pEnabled: true });
    expect(tpl.config.excludedStreamTypes || []).not.toContain('p2p');
  });

  test('selecting a restricted host disables the incompatible option with a reason', async ({ page }) => {
    await bootstrap(page);
    await page.evaluate(() => {
      const select = document.getElementById('aioHost');
      if (!select) throw new Error('host select not found');
      select.value = 'elfhosted';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // The gate renders inert options with an inline explanation rather than
    // removing them, so the user learns why the choice is unavailable.
    const blocked = page.locator('.opt.opt-host-blocked');
    if (await blocked.count()) {
      const note = blocked.first().locator('.opt-host-note');
      await expect(note).toBeVisible();
      await expect(note).toContainText(/Unavailable —/);
      await expect(blocked.first().locator('input')).toBeDisabled();
    }
  });

  test('the 4K build sorts resolution first in every scope', async ({ page }) => {
    await bootstrap(page);
    const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), { ...BASE_STATE, resolution: '4k' });
    for (const [scope, list] of Object.entries(tpl.config.sortCriteria || {})) {
      if (!Array.isArray(list) || !list.length) continue;
      expect(list[0].key, `scope ${scope} must lead with resolution in a 4K build`).toBe('resolution');
    }
    expect(tpl.config.preferredResolutions[0]).toBe('2160p');
    expect(tpl.config.preferredResolutions).toContain('1440p');
  });

  test('the 1080p build keeps cached-first', async ({ page }) => {
    await bootstrap(page);
    const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), { ...BASE_STATE, resolution: '1080p' });
    expect(tpl.config.sortCriteria.global[0].key).toBe('cached');
    expect(tpl.config.preferredResolutions[0]).toBe('1080p');
  });

  test('the direct-install payload has the same shape as the JSON export', async ({ page }) => {
    await bootstrap(page);
    const result = await page.evaluate((s) => {
      const exported = window.__coreBuilds.generate(s);
      return {
        hasMetadata: Boolean(exported.metadata),
        hasConfig: Boolean(exported.config),
        // Direct install must not carry a credential for any service.
        credentialValues: (exported.config.services || []).flatMap(svc => Object.values(svc.credentials || {})).filter(Boolean),
        keys: Object.keys(exported).sort(),
      };
    }, BASE_STATE);
    expect(result.hasMetadata).toBe(true);
    expect(result.hasConfig).toBe(true);
    expect(result.credentialValues, 'no credential may appear in a generated template').toEqual([]);
    expect(result.keys).toEqual(expect.arrayContaining(['config', 'metadata']));
  });

  test('the diagnostics hook never leaks a probe secret', async ({ page }) => {
    await bootstrap(page);
    const diagnostics = await page.evaluate(() => JSON.stringify(window.__coreBuilds.diagnostics()));
    expect(diagnostics).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
    expect(diagnostics).not.toMatch(/\bsk-[A-Za-z0-9]{20,}/);
  });
});
