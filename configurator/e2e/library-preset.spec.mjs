import { test, expect } from '@playwright/test';
import { validateConfigOptions } from './lib/aiostreams-contract.mjs';

// The Library-preset contract as the HOST enforces it (LibraryPreset.
// supportedServices, packages/core/src/presets/library.ts @ v2.34.0): an
// enabled Library with no usable debrid/usenet-engine service is a hard 400 on
// save — "The library requires at least one usable service to be configured".
// EasyNews is not a usable service. These specs drive the real flows against a
// mock that enforces the same rule (validateConfigOptions now checks it for
// every spec, not just this file), so reintroducing the keyless-library
// emission fails red anywhere it matters.
//
// The keeps-library half of the contract (easynews + a debrid service) is
// pinned by the golden matrix fixtures: easynews-1080p omits the preset,
// easynews-torbox-multi-1080p keeps it.

test.describe.configure({ retries: 2 });

const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_FAILED$|favicon|404 \(Not Found\)|Failed to load resource: the server responded with a status of 404|Access to fetch at '[^']*\/api\/v1\/status'[^\n]*blocked by CORS|\/api\/v1\/status[^\n]*(?:blocked by CORS|net::ERR_FAILED)/;

const UUID = '11111111-2222-4333-8444-555555555555';

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
      const body = JSON.parse(request.postData() || '{}');
      posted.push(body);
      const verdict = validateConfigOptions(body.config);
      if (!verdict.ok) {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: verdict.error }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: UUID, encryptedPassword: 'encrypted-password' } }) });
    }
    if (url.includes('core-builds-cors-proxy') && (url.includes('/api/visit') || url.includes('/api/generate') || url.includes('/api/stats'))) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (url.includes('api.strem.io/')) {
      const isLogin = url.includes('/api/login') || url.includes('/api/register');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isLogin ? { result: { authKey: 'auth-key-123', user: { email: 'x@y.z' } } } : { result: url.includes('addonCollectionGet') ? { addons: [] } : {} }) });
    }
    if (url.includes('cinebye')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'Cinemeta patched' }) });
    }
    return route.continue();
  });
}

test('EasyNews-only express install validates and posts with NO library preset', async ({ page }) => {
  test.setTimeout(90_000);
  const posted = [];
  await mockBackend(page, posted);
  const errors = await fresh(page);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('[data-express-service="easynews"]').click();
  await expect(page.locator('[data-express-cred="easynews"]')).toBeVisible();
  await page.locator('[data-express-cred="easynews"]').fill('an-easynews-user');
  await page.locator('[data-express-cred="easynewsPass"]').fill('an-easynews-pass');
  await page.locator('[data-express-target="manifest"]').click();
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#manifestModal, #mUrlVal, #aioResult')).not.toBeEmpty({ timeout: 45000 });
  expect(posted, 'the install must POST exactly once').toHaveLength(1);
  const config = posted[0].config;
  expect(
    (config.presets || []).some(p => p.type === 'library'),
    'Easynews-only must omit the Library preset — the host 400s the save otherwise'
  ).toBe(false);
  const easynews = (config.services || []).find(s => s.id === 'easynews');
  expect(easynews?.enabled).toBe(true);
  expect(easynews?.credentials?.username).toBe('an-easynews-user');
  expect(easynews?.credentials?.password).toBe('an-easynews-pass');
  expect(errors).toEqual([]);
});

test('the export of an EasyNews-only template also omits the library preset', async ({ page }) => {
  await fresh(page);
  await page.goto('/?cb-e2e=1');
  await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 10000 });
  for (const state of [
    { service: 'easynews', multiServices: ['easynews'], expectLibrary: false, label: 'easynews-only' },
    { service: 'multi', multiServices: ['easynews', 'torbox-pro'], expectLibrary: true, label: 'easynews+torbox' },
  ]) {
    const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), {
      ...{ device: 'generic', resolution: '1080p', audio: 'limited', content: 'all', creds: {} },
      ...state,
    });
    const hasLibrary = (tpl.config.presets || []).some(p => p.type === 'library');
    expect(hasLibrary, `${state.label}: library presence must match the host contract`).toBe(state.expectLibrary);
  }
});
