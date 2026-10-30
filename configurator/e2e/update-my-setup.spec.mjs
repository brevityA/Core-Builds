import { test, expect } from '@playwright/test';
import { mockSplashRequests } from './lib/mock-splash-requests.mjs';
import { validateConfigOptions } from './lib/aiostreams-contract.mjs';

// "Update my setup": after Core Builds saves a config, the first screen offers to
// rebuild it, shows what changes, and saves over the same UUID. It must never
// create a second config, whatever the host answers.
test.describe.configure({ retries: 2 });

const UUID = '11111111-2222-4333-8444-555555555555';
const CORS_NOISE = /core-builds-cors-proxy|favicon|404 \(Not Found\)|Failed to load resource|blocked by CORS|\/api\/v1\/status/;

async function mockHost(page, calls, { patchStatus = 200 } = {}) {
  await page.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    if (url.includes('/api/v1/status')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.36.0' } }) });
    }
    if (url.includes('/api/v1/user')) {
      const body = JSON.parse(request.postData() || '{}');
      calls.push({ method: request.method(), url, body });
      if (request.method() === 'POST') {
        const verdict = validateConfigOptions(body.config);
        if (!verdict.ok) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: verdict.error }) });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: UUID, encryptedPassword: 'encrypted-password' } }) });
      }
      if (request.method() === 'PATCH') {
        if (patchStatus !== 200) return route.fulfill({ status: patchStatus, contentType: 'application/json', body: JSON.stringify({ success: false, error: { message: 'Invalid password' } }) });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
      }
    }
    if (url.includes('core-builds-cors-proxy') && /\/api\/(visit|generate|stats)/.test(url)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.continue();
  });
}

async function installOnce(page, calls, opts) {
  await mockSplashRequests(page);
  await mockHost(page, calls, opts);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', m => { if (m.type() === 'error' && !CORS_NOISE.test(m.text())) errors.push(m.text()); });
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await expect(page.locator('[data-action="update-my-setup"]'), 'nothing saved yet, no card').toHaveCount(0);
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
  await page.locator('[data-express-target="manifest"]').click();
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#manifestModal')).toBeVisible({ timeout: 45000 });
  expect(calls.filter(c => c.method === 'POST')).toHaveLength(1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuildLastSaved')));
  expect(saved.uuid).toBe(UUID);
  // The record is scrubbed like an import link: the key typed above is not in it.
  expect(JSON.stringify(saved)).not.toContain('test-torbox-key');
  await page.reload();
  return errors;
}

test('the first screen offers Update my setup and saves over the same config', async ({ page }) => {
  test.setTimeout(90_000);
  const calls = [];
  const errors = await installOnce(page, calls);
  const card = page.locator('[data-action="update-my-setup"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Your Stremio link keeps working');
  await card.click();
  const modal = page.locator('#updateSetupModal');
  await expect(modal).toBeVisible();
  // Same choices, same release: nothing differs from what was saved.
  await expect(modal).toContainText('No changes');
  await modal.locator('#updSetupGo').click();
  await expect(modal.locator('#updSetupResult')).toContainText('Nothing to reinstall');
  const patches = calls.filter(c => c.method === 'PATCH');
  expect(patches).toHaveLength(1);
  expect(patches[0].url).toContain(`/api/v1/user/${UUID}`);
  expect(patches[0].body.password).toBeTruthy();
  expect(patches[0].body.config.services.some(s => s.id === 'torbox')).toBe(true);
  expect(calls.filter(c => c.method === 'POST'), 'an update never creates a second config').toHaveLength(1);
  expect(errors).toEqual([]);
});

test('a changed choice shows up before saving', async ({ page }) => {
  test.setTimeout(90_000);
  const calls = [];
  await installOnce(page, calls);
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('coreBuild'));
    st.resolution = '1080p';
    localStorage.setItem('coreBuild', JSON.stringify(st));
  });
  await page.reload();
  await page.locator('[data-action="update-my-setup"]').click();
  const modal = page.locator('#updateSetupModal');
  await expect(modal.locator('.upd-sec').first()).toBeVisible();
  await expect(modal.locator('#updSetupGo')).toHaveText('Save to my AIOStreams');
});

test('a refused update leaves the config alone and offers the paste method', async ({ page }) => {
  test.setTimeout(90_000);
  const calls = [];
  await installOnce(page, calls, { patchStatus: 401 });
  await page.locator('[data-action="update-my-setup"]').click();
  const modal = page.locator('#updateSetupModal');
  await modal.locator('#updSetupGo').click();
  await expect(modal.locator('#updSetupResult')).toContainText('Not saved.');
  await expect(modal.locator('#updSetupResult')).toContainText('Invalid password');
  expect(calls.filter(c => c.method === 'POST'), 'no fallback to a new config').toHaveLength(1);
  await modal.locator('[data-upd-paste]').click();
  await expect(page.locator('#updateTplModal')).toBeVisible();
});
