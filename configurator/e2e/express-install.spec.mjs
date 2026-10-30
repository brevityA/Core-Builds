import { test, expect } from '@playwright/test';
import { mockSplashRequests } from './lib/mock-splash-requests.mjs';
import { validateConfigOptions } from './lib/aiostreams-contract.mjs';

// These specs drive long multi-hop chains (push → full stack → stremio) behind stubbed routes;
// on a loaded box the modal chain can lag past a single test budget. Retry locally too — a flake
// here must not own go/no-go signals (#682). Still bounded: real regressions fail on all retries.
test.describe.configure({ retries: 2 });

// Express Install lane — one-click two-step install (Duck Streams pattern):
// pick a debrid service + key, connect Stremio or grab the manifest, go.
// The lane reuses the shared install pipeline, so the mocked surface is the
// same as stability.spec.mjs plus the Stremio API + Cinebye patch calls.

const UUID = '11111111-2222-4333-8444-555555555555';
// The AIOStreams host probe (Phase 4) fetches `<host>/api/v1/status` from the
// browser to read live capabilities. Public instances send no
// Access-Control-Allow-Origin, so the browser BLOCKS the response and logs a
// CORS error that no try/catch can suppress — the probe then falls back to the
// static capability registry, which is the documented and intended path. That
// console line is expected output, not a defect, so it is filtered here like
// the proxy noise above. Filtering is scoped to /api/v1/status specifically so
// a genuine CORS regression elsewhere still fails.
const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_FAILED$|favicon|404 \(Not Found\)|Failed to load resource: the server responded with a status of 404|Access to fetch at '[^']*\/api\/v1\/status'[^\n]*blocked by CORS|\/api\/v1\/status[^\n]*(?:blocked by CORS|net::ERR_FAILED)/;

async function fresh(page) {
  await mockSplashRequests(page);
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
  let addonCollection = [];
  await page.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    if (url.includes('/api/v1/status')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.32.1' } }) });
    }
    if (url.includes('/api/v1/user') && request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}');
      posted.push(body);
      // Enforce AIOStreams' preset option contract instead of accepting anything. Without
      // this, the mock validated our own shape against itself: two specs here asserted the
      // wrong Debridio option name and passed for weeks while the live path was broken.
      const verdict = validateConfigOptions(body.config);
      if (!verdict.ok) {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: verdict.error }) });
      }
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
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { addons: addonCollection } }) });
    }
    if (url.includes('api.strem.io/api/addonCollectionSet')) {
      const body = JSON.parse(request.postData() || '{}');
      addonCollection = structuredClone(body.addons || []);
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
  await page.route('**/api/v1/status**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.34.1' } }) }));
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
  await expect(page.locator('#expressCreds .fastlane-trust'), 'no key, no key promise').toHaveCount(0);
  // Switch back to TorBox → credential appears, with where the key goes
  await page.locator('[data-express-service="torbox-pro"]').click();
  await expect(page.locator('[data-express-cred="torbox"]')).toBeVisible();
  await expect(page.locator('#expressCreds .fastlane-trust')).toContainText('Your keys go only to your AIOStreams host');
  await expect(page.locator('#expressStremio .fastlane-trust')).toContainText('Your other addons stay');
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
  await expect(page.locator('#aioResult')).toContainText('Full Stack Installed and verified!', { timeout: 45000 });
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
  // toBeVisible ignores overlap. The result opened under the Express panel for
  // months: assert it is the layer actually on top, and that Express closed.
  const top = await page.evaluate(() => {
    const box = document.querySelector('#manifestModal .modal-box').getBoundingClientRect();
    return !!document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest('#manifestModal');
  });
  expect(top).toBe(true);
  await expect(page.locator('#expressLaneModal')).toHaveCount(0);
  expect(posted).toHaveLength(1);
  expect(JSON.stringify(posted[0].config)).not.toContain('torbox-search');
});

test('Express profile is a main step, and Fast builds 1080p instant-play-only', async ({ page }) => {
  const posted = [];
  await mockBackend(page, posted);
  await fresh(page);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-action="open-express-lane"]').click();
  // On the page itself, not tucked under "Optional".
  const fast = page.locator('#expressLaneModal [data-express-profile="fast"]');
  await expect(fast).toBeVisible();
  await expect(page.locator('#expressLaneModal details.fastlane-optional [data-express-profile]')).toHaveCount(0);
  await expect(page.locator('#expressLaneModal [data-express-profile="balanced"]')).toContainText('Recommended');
  await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
  await fast.click();
  await expect(page.locator('[data-express-cache="cached"]')).toHaveClass(/active/);
  await expect(page.locator('[data-express-res="1080p"]')).toHaveClass(/active/);
  await page.locator('[data-express-target="manifest"]').click();
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#manifestModal')).toBeVisible({ timeout: 45000 });
  expect(posted).toHaveLength(1);
  const config = posted[0].config;
  // Fast promised 1080p: before 3.26 Quick install's own 4K default overrode it.
  expect(config.excludedResolutions || []).toContain('2160p');
  expect(config.excludeUncached, 'Fast shows only streams ready to play').toBe(true);
});

test('Express lane offers a Chillio (ChillLink) install target', async ({ page }) => {
  await fresh(page);
  await page.locator('[data-action="open-express-lane"]').click();
  const tile = page.locator('[data-express-target="chillio"]');
  await expect(tile).toBeVisible();
  await expect(tile).toContainText('Chillio');
});

test('Chillio target blocks a P2P build before anything is posted (ChillLink drops torrents)', async ({ page }) => {
  const posted = [];
  await mockBackend(page, posted);
  await fresh(page);
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('[data-express-service="p2p"]').click();
  await page.locator('[data-express-target="chillio"]').click();
  await page.locator('#expressGo').click();
  // The gate fires before the password prompt and the /api/v1/user POST.
  await expect(page.locator('#aioResult')).toContainText("Chillio can't use this setup", { timeout: 15000 });
  await expect(page.locator('#aioResult')).toContainText('P2P');
  await expect(page.locator('#pwdPrompt')).toHaveCount(0);
  expect(posted).toEqual([]);
});

test('Chillio target posts the config and opens the modal on a /chilllink/ URL', async ({ page }) => {
  const posted = [];
  await mockBackend(page, posted);
  await fresh(page);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
  await page.locator('[data-express-target="chillio"]').click();
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#manifestModal')).toBeVisible({ timeout: 45000 });
  // The modal opens directly on the Chillio tab, whose URL uses the
  // authenticated /chilllink/<uuid>/<encryptedPassword> route.
  await expect(page.locator('#mUrlVal')).toContainText('/chilllink/11111111-2222-4333-8444-555555555555/encrypted-password');
  const chillioTab = page.locator('#mFmtTabs .fmt-tab', { hasText: 'Chillio' });
  await expect(chillioTab).toHaveClass(/active/);
  // Companion links to the official ChillLink tools ship in the help box.
  await expect(page.locator('#mAppHelpBody a[href*="link.chillio.app/manifest-merger"]')).toBeVisible();
  expect(posted).toHaveLength(1);
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
  await expect(page.locator('#aioResult')).toContainText('Full Stack Installed and verified!', { timeout: 45000 });
  expect(posted).toHaveLength(1);
  const config = posted[0].config;
  const debridio = config.presets.find(p => p.type === 'debridio');
  expect(debridio, 'Debridio preset should be emitted (key entered)').toBeTruthy();
  // See multi-debridio.spec.mjs: AIOStreams requires `debridioApiKey`, not `apiKey`.
  expect(debridio.options.debridioApiKey).toBe('test-debridio-key');
  expect(debridio.options.apiKey).toBeUndefined();
  expect(JSON.stringify(config)).not.toContain('torbox-search');
  expect(errors).toEqual([]);
});

test('Express TorBox + EasyNews add-ons brings the EasyNews service, asks for its login and ships the presets', async ({ page }) => {
  test.setTimeout(90_000);
  const posted = [];
  await mockBackend(page, posted);
  const errors = await fresh(page);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
  await page.locator('#expressExtrasBtn').click();
  await expect(page.locator('[data-extra-scraper="easynews"]')).toContainText('adds the EasyNews service');
  await page.locator('[data-extra-scraper="easynews"]').click();
  await page.locator('[data-extra-scraper="easynewsPlus"]').click();
  await page.locator('#extraApply').click();
  // The add-ons read the EasyNews login, so Quick install now asks for it — once.
  await expect(page.locator('[data-express-cred="easynews"]')).toHaveCount(1);
  await expect(page.locator('[data-express-cred="easynewsPass"]')).toHaveCount(1);
  await page.locator('[data-express-cred="easynews"]').fill('en-user');
  await page.locator('[data-express-cred="easynewsPass"]').fill('en-pass');
  await page.locator('#stremioEmailInline').fill('test@stremio.com');
  await page.locator('#stremioPasswordInline').fill('test-password');
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#aioResult')).toContainText('Full Stack Installed and verified!', { timeout: 45000 });
  expect(posted).toHaveLength(1);
  const config = posted[0].config;
  const easynews = config.services.find(s => s.id === 'easynews');
  expect(easynews?.enabled, 'EasyNews service is enabled').toBe(true);
  expect(easynews.credentials).toEqual({ username: 'en-user', password: 'en-pass' });
  expect(config.services.find(s => s.id === 'torbox')?.enabled, 'TorBox stays the main service').toBe(true);
  const types = config.presets.map(p => p.type);
  for (const type of ['stremthruTorz', 'easynewsPlusPlus', 'easynews-search', 'easynews', 'easynewsPlus']) {
    expect(types, `${type} preset is in the config`).toContain(type);
  }
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

  // Adding Debridio without a key means its preset is dropped from the config.
  // That used to happen silently; the preflight gate now says so before install
  // (CFG-P0-02). Assert the warning is actually surfaced, then continue.
  const preflight = page.locator('#preflightModal');
  await expect(preflight).toBeVisible({ timeout: 15000 });
  await expect(preflight).toContainText(/debridio/i);
  await preflight.locator('#preflightGo').click();
  await expect(preflight).toBeHidden();

  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#aioResult')).toContainText('Full Stack Installed and verified!', { timeout: 45000 });
  const config = posted[0].config;
  expect(config.presets.some(p => p.type === 'debridio')).toBe(false);
  expect(JSON.stringify(config)).not.toContain('debridioApiKey');
});
