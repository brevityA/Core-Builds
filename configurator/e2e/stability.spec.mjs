import { test, expect } from '@playwright/test';

const UUID = '11111111-2222-4333-8444-555555555555';

const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_FAILED$/;

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

test('Quick Install creates a raw manifest without TMDB', async ({ page }) => {
  const posted = [];
  await mockAioStreams(page, posted);
  const errors = await fresh(page);
  await page.locator('[data-action="open-fast-lane"]').click();
  await page.locator('[data-fl-target="manifest"]').click();
  await page.locator('[data-fl-cred="torbox"]').fill('test-torbox-key');
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#btnAutoCreate').click();
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
  await expect(page.locator('.opt-scraper-scroll .opt-scraper-card')).toHaveCount(16); // 6 services + 10 scrapers (incl. NZBHydra2)
  await page.locator('[data-svc-id="p2p"]').click();
  await page.locator('[data-scraper-id="nzbnoob"]').click();
  await expect(page.locator('#extrasCarouselCount')).toHaveText('2 selected');
  await expect(page.locator('[data-svc-id="p2p"]')).toHaveAttribute('aria-checked', 'true');
  await page.locator('[data-svc-id="p2p"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#extrasCarouselCount')).toHaveText('1 selected');

  const guided = await context.newPage();
  await fresh(guided);
  await guided.locator('[data-action="easy-start"]').click();
  await expect(guided.locator('.opt-scraper-scroll')).toHaveCount(0);
  await expect(guided.locator('[data-action="open-additional-services"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});
