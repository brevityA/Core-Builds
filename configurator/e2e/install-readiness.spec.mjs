import { test, expect } from '@playwright/test';
import { validateConfigOptions } from './lib/aiostreams-contract.mjs';

// Direct Install readiness — "never POST a config the host will reject for a
// missing credential". The Deploy controls disable at render time with a
// precise inline message naming the missing key; a runtime backstop in
// simpleInstall covers every other path; typing the key re-enables the
// control LIVE (the page does not re-render on input, so this was the trap).
// Export JSON stays the un-gated credential-free lane.

test.describe.configure({ retries: 2 });

const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_(?:FAILED|CONNECTION_CLOSED)$|favicon|404 \(Not Found\)|Failed to load resource: the server responded with a status of 404|Access to fetch at '[^']*\/api\/v1\/status'[^\n]*blocked by CORS|\/api\/v1\/status[^\n]*(?:blocked by CORS|net::ERR_FAILED)/;

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

// Leaving the Accounts & Keys step without credentials pops #apiReminder
// (the "bake your keys in" nudge). Skip it to continue with empty creds.
async function skipApiReminderIfShown(page) {
  const skip = page.locator('#apiReminder [data-action="reminder-skip"]');
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) await skip.click();
}

async function mockBackend(page, posted) {
  await page.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    let reqHost = '';
    try { reqHost = new URL(url).hostname; } catch { /* leave empty */ }
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
    if (reqHost === 'api.strem.io') {
      const isLogin = url.includes('/api/login') || url.includes('/api/register');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isLogin ? { result: { authKey: 'auth-key-123', user: { email: 'x@y.z' } } } : { result: url.includes('addonCollectionGet') ? { addons: [] } : {} }) });
    }
    if (url.includes('cinebye')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'Cinemeta patched' }) });
    }
    return route.continue();
  });
}

test('review Deploy stays disabled with a precise message while the debrid key is missing', async ({ page }) => {
  const posted = [];
  await mockBackend(page, posted);
  const errors = await fresh(page);
  page.on('dialog', dialog => dialog.accept());

  // Advanced Builder → TorBox Pro with NO key, all the way to Review.
  await page.locator('[data-action="custom-start"]').click();
  await page.locator('label[for="o_torbox-pro"]').click();
  await page.locator('#btnNext').click();
  await page.locator('.device-card[data-val="generic"]').click();
  await page.locator('#btnNext').click();
  await page.locator('label[for="o_1080p"]').click();
  await page.locator('#btnNext').click();
  await page.locator('[data-action="skip-content"]').click(); // -> apis
  await page.locator('#btnNext').click(); // empty creds -> api reminder nudge
  await skipApiReminderIfShown(page);     // -> review

  // Render-time: disabled primary controls + inline message naming the key.
  const gate = page.locator('.install-cred-gate').first();
  await expect(gate).toBeVisible();
  await expect(gate).toContainText('TorBox API Key');
  await expect(gate).toContainText('Export JSON');
  await expect(page.locator('#btnAutoCreate')).toBeDisabled();
  await expect(page.locator('#btnAio')).toBeDisabled();
  expect(posted, 'nothing may be POSTed while the key is missing').toHaveLength(0);

  // Back to Accounts & Keys, fill the key, forward again — now enabled.
  // #apiReminder stays in the DOM (hidden) after dismissal, and renders its
  // own stale jump-step rows — click the VISIBLE stepper's anchor.
  await page.locator('[data-action="jump-step"][data-step="5"]:visible').first().click();
  await expect(page.locator('#cred_torbox')).toBeVisible();
  await page.locator('#cred_torbox').fill('test-torbox-key');
  await page.locator('#btnNext').click();
  await skipApiReminderIfShown(page);
  await expect(page.locator('.install-cred-gate')).toHaveCount(0);
  await expect(page.locator('#btnAutoCreate')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('Guided Setup un-disables Deploy live when the key is typed, then posts', async ({ page }) => {
  test.setTimeout(90_000);
  const posted = [];
  await mockBackend(page, posted);
  const errors = await fresh(page);
  page.on('dialog', dialog => dialog.accept());

  await page.locator('[data-action="easy-start"]').click();
  await page.locator('label[for="o_torbox-pro"]').click();
  await page.locator('#btnNext').click();
  await page.locator('.device-card[data-val="generic"]').click();
  await page.locator('#btnNext').click(); // -> Video Quality (step 3 of the guided flow)
  await page.locator('label[for="o_1080p"]').click();
  await expect(page.locator('#btnNext')).toBeEnabled();
  await page.locator('#btnNext').click(); // -> simple finish
  await skipApiReminderIfShown(page);

  // Blocked at first.
  const deploy = page.locator('#btnAio');
  await expect(deploy).toBeDisabled();
  await expect(page.locator('.install-cred-gate')).toContainText('TorBox API Key');
  expect(posted).toHaveLength(0);

  // Type the key ON THE SAME PAGE — no re-render happens, so the control must
  // un-disable live (refreshInstallGateState on the input event).
  await page.locator('#cred_torbox').fill('test-torbox-key');
  await expect(deploy).toBeEnabled();
  await expect(page.locator('.install-cred-gate')).toHaveCount(0);

  await page.locator('#stremioEmailInline').fill('test@stremio.com');
  await page.locator('#stremioPasswordInline').fill('test-password');
  await deploy.click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#manifestModal, #aioResult')).not.toBeEmpty({ timeout: 45000 });
  expect(posted).toHaveLength(1);
  const config = posted[0].config;
  const torbox = (config.services || []).find(s => s.id === 'torbox');
  expect(torbox?.enabled).toBe(true);
  expect(torbox?.credentials?.apiKey).toBe('test-torbox-key');
  expect(errors).toEqual([]);
});

test('Export JSON stays the un-gated credential-free lane', async ({ page }) => {
  const posted = [];
  await mockBackend(page, posted);
  await fresh(page);
  await page.goto('/?cb-e2e=1');
  await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 10000 });
  // A keyless TorBox template must still generate locally: credentials are
  // stripped by the build, and AIOStreams asks for the key during import.
  const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), {
    service: 'torbox-pro', multiServices: ['torbox-pro'], device: 'generic',
    resolution: '1080p', audio: 'limited', content: 'all', creds: {},
  });
  expect(tpl?.config).toBeTruthy();
  const torbox = (tpl.config.services || []).find(s => s.id === 'torbox');
  expect(torbox?.enabled).toBe(true);
  expect(Object.values(torbox?.credentials || {}).filter(Boolean)).toEqual([]);
  expect(posted).toHaveLength(0);
});

test('the free P2P lane is exempt from the key gate', async ({ page }) => {
  const posted = [];
  await mockBackend(page, posted);
  await fresh(page);
  // The Advanced Builder gates P2P/HTTP away on the default ElfHosted host —
  // the free lane enters through the Free chip's quick-start door instead,
  // which configures P2P and lands directly on the finish page.
  await page.locator('.splash-chip[data-svc="free"]').click();
  await page.locator('.splash-preset-card[data-action="quick-start"][data-preset="p2p"]').click();
  await expect(page.locator('#btnNext')).toBeEnabled(); // door lands on Accounts & Keys (a formality on the free lane)
  await page.locator('#btnNext').click(); // -> the finish page
  await expect(page.locator('.install-cred-gate')).toHaveCount(0);
  await expect(page.locator('#btnAio')).toBeEnabled();
  expect(posted).toHaveLength(0);
});
