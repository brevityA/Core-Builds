import { test, expect } from '@playwright/test';

// These specs drive long multi-hop chains (push → full stack → stremio) behind stubbed routes;
// on a loaded box the modal chain can lag past a single test budget. Retry locally too — a flake
// here must not own go/no-go signals (#682). Still bounded: real regressions fail on all retries.
test.describe.configure({ retries: 2 });

// Express Install lane — one-click two-step install (Duck Streams pattern):
// pick a debrid service + key, connect Stremio or grab the manifest, go.
// The lane reuses the shared install pipeline, so the mocked surface is the
// same as stability.spec.mjs plus the Stremio API + Cinebye patch calls.

const UUID = '11111111-2222-4333-8444-555555555555';
const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_FAILED$|favicon|404 \(Not Found\)|Failed to load resource: the server responded with a status of 404/;

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
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.32.1' } }) });
    }
    if (url.includes('/api/v1/user') && request.method() === 'POST') {
      posted.push(JSON.parse(request.postData() || '{}'));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: UUID, encryptedPassword: 'encrypted-password' } }) });
    }
    if (url.includes('core-builds-cors-proxy') && (url.includes('/api/visit') || url.includes('/api/generate') || url.includes('/api/stats'))) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    // Stremio API (login / addon collection)
    if (url.includes('api.strem.io/api/login')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { authKey: 'auth-key-123' } }) });
    }
    if (url.includes('api.strem.io/api/addonCollectionGet')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { addons: [] } }) });
    }
    if (url.includes('api.strem.io/api/addonCollectionSet')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: {} }) });
    }
    if (url.includes('api.strem.io/api/register')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { authKey: 'auth-key-123', user: { email: 'x@y.z' } } }) });
    }
    // Cinebye patch (Full-Stack step)
    if (url.includes('cinebye')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'Cinemeta patched' }) });
    }
    return route.continue();
  });
}

test('Express door is the first splash route and opens the one-click lane', async ({ page }) => {
  const errors = await fresh(page);
  const door = page.locator('[data-action="open-express-lane"]');
  await expect(door).toBeVisible();
  await door.click();
  await expect(page.locator('#expressLaneModal')).toBeVisible();
  await expect(page.locator('#expressLaneModal')).toContainText('Install in ~30 seconds');
  // Defaults: TorBox selected, Stremio target active with account fields
  await expect(page.locator('[data-express-service="torbox-pro"]')).toHaveClass(/active/);
  await expect(page.locator('#stremioEmailInline')).toBeVisible();
  await expect(page.locator('[data-action="create-stremio-account"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Express free/P2P hides credentials; manifest target hides Stremio fields', async ({ page }) => {
  await fresh(page);
  await page.locator('[data-action="open-express-lane"]').click();
  // Switch to free / P2P
  await page.locator('[data-express-service="p2p"]').click();
  await expect(page.locator('#expressCreds')).toContainText('No key needed');
  await expect(page.locator('[data-express-cred]')).toHaveCount(0);
  // Switch back to TorBox → credential appears
  await page.locator('[data-express-service="torbox-pro"]').click();
  await expect(page.locator('[data-express-cred="torbox"]')).toBeVisible();
  // Manifest target hides the Stremio block
  await page.locator('[data-express-target="manifest"]').click();
  await expect(page.locator('#expressStremio')).toBeHidden();
});

test('Express Install creates a v2.32-clean config and pushes to Stremio (Full Stack)', async ({ page }) => {
  // Full Stack chain = several staged writes; under full-suite load the 45s default flakes (#682)
  test.setTimeout(90_000);
  const posted = [];
  await mockBackend(page, posted);
  const errors = await fresh(page);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
  await page.locator('#stremioEmailInline').fill('test@stremio.com');
  await page.locator('#stremioPasswordInline').fill('test-password');
  await page.locator('#expressGo').click();
  // AIOStreams config password prompt (auto-generate is default)
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#aioResult')).toContainText('Full Stack Installed!', { timeout: 45000 });
  expect(posted).toHaveLength(1);
  const config = posted[0].config;
  // v2.32-clean: no removed torbox-search preset, TorBox service configured
  expect(JSON.stringify(config)).not.toContain('torbox-search');
  expect(config.services.some(s => s.id === 'torbox')).toBe(true);
  expect(config.presets.some(p => p.type === 'library')).toBe(true);
  expect(config.presets.length).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test('Express Install manifest target skips Stremio and shows the manifest modal', async ({ page }) => {
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
  expect(JSON.stringify(posted[0].config)).not.toContain('torbox-search');
});

test('Express "Additional services & scrapers" popout adds Debridio + folds its key into the config', async ({ page }) => {
  test.setTimeout(90_000);
  const posted = [];
  await mockBackend(page, posted);
  const errors = await fresh(page);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
  // Open the extras popout, pick Debridio, apply
  await page.locator('#expressExtrasBtn').click();
  await expect(page.locator('#additionalServicesModal')).toBeVisible();
  await page.locator('[data-extra-service="debridio"]').click();
  await page.locator('#extraApply').click();
  // Debridio credential field should now be in the express modal
  await expect(page.locator('[data-express-cred="debridio"]')).toBeVisible();
  await page.locator('[data-express-cred="debridio"]').fill('test-debridio-key');
  await page.locator('#stremioEmailInline').fill('test@stremio.com');
  await page.locator('#stremioPasswordInline').fill('test-password');
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#aioResult')).toContainText('Full Stack Installed!', { timeout: 45000 });
  expect(posted).toHaveLength(1);
  const config = posted[0].config;
  const debridio = config.presets.find(p => p.type === 'debridio');
  expect(debridio, 'Debridio preset should be emitted (key entered)').toBeTruthy();
  expect(debridio.options.apiKey).toBe('test-debridio-key');
  expect(JSON.stringify(config)).not.toContain('torbox-search');
  expect(errors).toEqual([]);
});

test('Express without a Debridio key omits the preset (no config reject)', async ({ page }) => {
  const posted = [];
  await mockBackend(page, posted);
  await fresh(page);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
  await page.locator('#expressExtrasBtn').click();
  await page.locator('[data-extra-service="debridio"]').click();
  await page.locator('#extraApply').click();
  // keyless — install with only the torbox key
  await page.locator('#stremioEmailInline').fill('test@stremio.com');
  await page.locator('#stremioPasswordInline').fill('test-password');
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#aioResult')).toContainText('Full Stack Installed!', { timeout: 45000 });
  const config = posted[0].config;
  expect(config.presets.some(p => p.type === 'debridio')).toBe(false);
  expect(JSON.stringify(config)).not.toContain('debridioApiKey');
});
