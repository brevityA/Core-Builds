import { test, expect } from '@playwright/test';
import { validateConfigOptions } from './lib/aiostreams-contract.mjs';

/**
 * Direct Install key gate + truthful host picker — e2e half of audit defects 3
 * and 4 (the pure rules live in src/core/install-policy.js and
 * src/core/host-routing.js, covered by tests/*.test.mjs).
 *
 * The mocked AIOStreams backend enforces the preset option contract, so a gate
 * regression that lets a keyless config through fails here on the POST itself,
 * not just on a missing message.
 */

const UUID = '11111111-2222-4333-8444-555555555555';
// Same CORS-noise filter as express-install.spec.mjs: public hosts don't send
// Access-Control-Allow-Origin, so the /api/v1/status probe logs an expected
// browser error and falls back to the registry — that line is not a defect.
const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_FAILED$|favicon|404 \(Not Found\)|Failed to load resource: the server responded with a status of 404|Access to fetch at '[^']*\/api\/v1\/status'[^\\n]*blocked by CORS|\/api\/v1\/status[^\\n]*(?:blocked by CORS|net::ERR_FAILED)/;

async function fresh(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !CORS_NOISE.test(message.text())) errors.push(message.text()); });
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForTimeout(950);
  return errors;
}

async function mockBackend(page, posted) {
  await page.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    if (url.includes('/api/v1/status')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.34.0' } }) });
    }
    if (url.includes('/api/v1/user') && request.method() === 'POST') {
      posted.push(JSON.parse(request.postData() || '{}'));
      const verdict = validateConfigOptions(JSON.parse(request.postData() || '{}').config);
      if (!verdict.ok) {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: verdict.error }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: UUID, encryptedPassword: 'encrypted-password' } }) });
    }
    if (url.includes('core-builds-cors-proxy') && (url.includes('/api/visit') || url.includes('/api/generate') || url.includes('/api/stats'))) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.continue();
  });
}

test.describe('Direct Install key gate', () => {
  test('an empty TorBox key blocks the install with a message naming the key — nothing is posted', async ({ page }) => {
    const posted = [];
    await mockBackend(page, posted);
    const errors = await fresh(page);
    await page.locator('[data-action="open-express-lane"]').click();
    // TorBox is the default service; leave the key EMPTY, pick the manifest
    // target (it POSTs too) and go.
    await page.locator('[data-express-target="manifest"]').click();
    await page.locator('#expressGo').click();
    await expect(page.locator('#aioResult')).toContainText('Direct Install needs a key');
    await expect(page.locator('#aioResult')).toContainText('TorBox API Key');
    await page.waitForTimeout(800);
    expect(posted, 'a keyless config must never be POSTed').toEqual([]);
    expect(errors).toEqual([]);
  });

  test('with the key entered the same flow posts exactly one config', async ({ page }) => {
    const posted = [];
    await mockBackend(page, posted);
    await fresh(page);
    page.on('dialog', dialog => dialog.accept());
    await page.locator('[data-action="open-express-lane"]').click();
    await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
    await page.locator('[data-express-target="manifest"]').click();
    await page.locator('#expressGo').click();
    await page.locator('#pwdPrompt .pwd-go').click();
    await expect(page.locator('#manifestModal')).toBeVisible({ timeout: 45000 });
    expect(posted).toHaveLength(1);
    expect(posted[0].config.services.some(s => s.id === 'torbox')).toBe(true);
  });

  test('EasyNews install demands username AND password by name', async ({ page }) => {
    const posted = [];
    await mockBackend(page, posted);
    await fresh(page);
    await page.locator('[data-action="open-express-lane"]').click();
    await page.locator('[data-express-service="easynews"]').click();
    await page.locator('[data-express-cred="easynews"]').fill('just-a-username');
    await page.locator('[data-express-target="manifest"]').click();
    await page.locator('#expressGo').click();
    await expect(page.locator('#aioResult')).toContainText('EasyNews Password');
    await page.waitForTimeout(500);
    expect(posted).toEqual([]);
  });

  test('Export JSON stays keyless and working (the gate is install-only)', async ({ page }) => {
    await page.goto('/?cb-e2e=1');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
    await page.reload();
    await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 15000 });
    const tpl = await page.evaluate(() => window.__coreBuilds.generate({
      service: 'torbox-pro', multiServices: ['torbox-pro'], device: 'generic',
      resolution: '1080p', content: 'all', instanceHost: 'elfhosted',
    }));
    expect(tpl.config, 'keyless export must still build').toBeTruthy();
    expect(tpl.config.presets.some(p => p.type === 'library'), 'debrid-backed export keeps the Library addon').toBe(true);
    expect(
      (tpl.config.services || []).flatMap(svc => Object.values(svc.credentials || {})).filter(Boolean),
      'exports never carry credentials',
    ).toEqual([]);
  });
});

test.describe('truthful host picker', () => {
  test('the Express host options state capabilities and AIOStreams version', async ({ page }) => {
    await fresh(page);
    await page.locator('[data-action="open-express-lane"]').click();
    const elf = page.locator('#expressHost option[value="elfhosted"]');
    await expect(elf).toHaveAttribute('value', 'elfhosted');
    expect(await elf.textContent()).toContain('Debrid only — no P2P/HTTP');
    expect(await elf.textContent()).toContain('v2.34.0');
    const midnight = page.locator('#expressHost option[value="midnight"]');
    expect(await midnight.textContent()).toContain('Debrid + P2P + HTTP');
    expect(await midnight.textContent()).toContain('v2.33.2');
    const ftw = page.locator('#expressHost option[value="fortheweak"]');
    expect(await ftw.textContent()).toContain('v2.34.0');
  });

  test('the chip flags a pick the capability matrix blocks (P2P on ElfHosted)', async ({ page }) => {
    // Stub the status probe so the chip verdict is deterministic and no real
    // CORS noise hits the console (same pattern as mockBackend).
    await page.route('**/api/v1/status', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.34.0' } }) }));
    const errors = await fresh(page);
    await page.locator('[data-action="open-express-lane"]').click();
    await page.locator('[data-express-service="p2p"]').click();
    await page.locator('#expressHost').selectOption('elfhosted');
    await expect(page.locator('#expressHostChip')).toContainText(/does not serve P2P/i);
    expect(errors).toEqual([]);
  });
});
