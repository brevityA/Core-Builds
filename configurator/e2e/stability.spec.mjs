import { test, expect } from '@playwright/test';

const UUID = '11111111-2222-4333-8444-555555555555';

// The AIOStreams host probe (Phase 4) fetches `<host>/api/v1/status` from the
// browser to read live capabilities. Public instances send no
// Access-Control-Allow-Origin, so the browser BLOCKS the response and logs a
// CORS error that no try/catch can suppress — the probe then falls back to the
// static capability registry, which is the documented and intended path. That
// console line is expected output, not a defect, so it is filtered here like
// the proxy noise above. Filtering is scoped to /api/v1/status specifically so
// a genuine CORS regression elsewhere still fails.
const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_FAILED$|Access to fetch at '[^']*\/api\/v1\/status'[^\n]*blocked by CORS|\/api\/v1\/status[^\n]*(?:blocked by CORS|net::ERR_FAILED)/;

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

async function mockAioStreams(page, capture) {
  await page.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    if (url.includes('/api/v1/status')) {
      // Must satisfy MIN_AIOSTREAMS_VERSION (2.32.0) — the host-probe floor.
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.32.1' } }) });
    }
    if (url.includes('/api/v1/user') && request.method() === 'POST') {
      capture.push(JSON.parse(request.postData() || '{}'));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: UUID, encryptedPassword: 'encrypted-password' } }) });
    }
    if (url.includes('core-builds-cors-proxy') && (url.includes('/api/visit') || url.includes('/api/generate') || url.includes('/api/stats'))) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.continue();
  });
}

test('Express Install creates a raw manifest without TMDB', async ({ page }) => {
  const posted = [];
  await mockAioStreams(page, posted);
  const errors = await fresh(page);
  await page.locator('[data-action="open-express-lane"]').click();
  await page.locator('[data-express-target="manifest"]').click();
  await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#manifestModal')).toBeVisible();
  expect(posted).toHaveLength(1);
  const config = posted[0].config;
  expect(config.titleMatching.enabled).toBe(false);
  expect(config.yearMatching.enabled).toBe(false);
  expect(config.digitalReleaseFilter.enabled).toBe(false);
  expect(config.bitrate?.useMetadataRuntime ?? false).toBe(false);
  expect(config.includedStreamExpressions.some(item => String(item.expression).includes('digitalRelease Bypass'))).toBe(false);
  await expect(page.locator('#mUrlVal')).toContainText(`/stremio/${UUID}/encrypted-password/manifest.json`);
  await expect(page.locator('#mFmtTabs')).toContainText('Manifest URL');
  expect(errors).toEqual([]);
});

test('Fine-Tune drawer preserves the wizard and Next button', async ({ page }) => {
  const errors = await fresh(page);
  await page.locator('[data-action="custom-start"]').click();
  await page.locator('label[for="o_torbox-pro"]').click();
  await expect(page.locator('#btnNext')).toBeEnabled();
  await page.locator('[data-action="open-advanced"]').click();
  await expect(page.locator('#advancedDrawer')).toBeVisible();
  await page.locator('[data-action="set-size-limit"][data-val="20"]').click();
  await expect(page.locator('#advancedDrawer')).toBeVisible();
  await page.locator('#advancedDrawer [data-action="close-advanced"]').click();
  await expect(page.locator('#advancedDrawer')).toBeHidden();
  await expect(page.locator('#btnNext')).toBeEnabled();
  await page.locator('#btnNext').click();
  await expect(page.getByText('Your Device', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Advanced extras carousel is multi-select while short routes stay compact', async ({ page, context }) => {
  const errors = await fresh(page);
  await page.locator('[data-action="custom-start"]').click();
  await page.locator('label[for="o_torbox-pro"]').click();
  await expect(page.locator('.opt-scraper-scroll .opt-scraper-card')).toHaveCount(16);
  // Was p2p. The wizard defaults to the ElfHosted community host, which serves
  // neither P2P nor HTTP, so those two cards are now gated inert by the
  // host-capability layer — see e2e/host-capability.spec.mjs. debridio is a
  // source that host does serve, so it exercises the same multi-select path.
  await page.locator('[data-svc-id="debridio"]').click();
  await page.locator('[data-scraper-id="nzbnoob"]').click();
  await expect(page.locator('#extrasCarouselCount')).toHaveText('2 selected');
  await expect(page.locator('[data-svc-id="debridio"]')).toHaveAttribute('aria-checked', 'true');
  await page.locator('[data-svc-id="debridio"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#extrasCarouselCount')).toHaveText('1 selected');
  // The gated cards stay in the carousel — visible, counted, and unselectable.
  await expect(page.locator('[data-svc-id="p2p"]')).toHaveAttribute('aria-disabled', 'true');

  const guided = await context.newPage();
  await fresh(guided);
  await guided.locator('[data-action="easy-start"]').click();
  await expect(guided.locator('.opt-scraper-scroll')).toHaveCount(0);
  await expect(guided.locator('[data-action="open-additional-services"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});
