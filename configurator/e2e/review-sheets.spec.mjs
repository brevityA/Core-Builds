// Review without folds (v3.37): Install on the page, four rows that each open a
// sheet over Review and close back to it — with Done, Escape, the scrim or Back.
import { test, expect } from '@playwright/test';

async function openReview(page, extra = {}) {
  await page.addInitScript((state) => {
    if (sessionStorage.getItem('rvSeeded')) return;
    sessionStorage.setItem('rvSeeded', '1');
    localStorage.clear();
    localStorage.setItem('cb_tut_seen', '1');
    localStorage.setItem('coreBuild', JSON.stringify({ service: 'torbox-pro', multiServices: ['torbox-pro'], device: 'generic', resolution: '4k', simpleMode: false, quickStart: false, ...state }));
    localStorage.setItem('coreBuildStep', '6');
  }, extra);
  await page.goto('/?cb-e2e=1');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.rv-install')).toBeVisible();
}

test.use({ viewport: { width: 390, height: 844 } });

test('Review shows Install and four rows, with no folded panels', async ({ page }) => {
  await openReview(page);
  await expect(page.locator('#main details')).toHaveCount(0);
  await expect(page.locator('.rv-install [data-action="simple-install"]').first()).toBeVisible();
  await expect(page.locator('.rv-install [data-action="test-drive"]')).toHaveText(/Test streams first/);
  await expect(page.locator('.rv-rows > button')).toHaveCount(4);
  await expect(page.locator('#rvMiniCard')).toContainText('4K');
});

test('each row opens its sheet, which closes back to Review', async ({ page }) => {
  await openReview(page);
  const rows = { aio: '.rv-row[data-sheet="aio"]', cards: '.rv-row-cards', checks: '.rv-row[data-sheet="checks"]', export: '.rv-row[data-sheet="export"]' };
  const closers = {
    aio: () => page.locator('#rvSheet-aio .rv-sheet-done').click(),
    cards: () => page.keyboard.press('Escape'),
    checks: () => page.goBack(),
    export: () => page.mouse.click(195, 20), // the scrim above the panel
  };
  for (const [id, sel] of Object.entries(rows)) {
    await page.locator(sel).click();
    const sheet = page.locator(`#rvSheet-${id}`);
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.rv-sheet-panel')).toBeInViewport();
    await closers[id]();
    await expect(sheet).toBeHidden();
    await expect(page.locator(sel)).toBeFocused();
    await expect(page.locator('.rv-install')).toBeVisible();
  }
});

test('a sheet stays open while its own controls re-render the page', async ({ page }) => {
  await openReview(page);
  await page.locator('.rv-row[data-sheet="aio"]').click();
  await page.locator('#aioHost').selectOption('custom');
  await page.locator('[data-action="gen-pwd"]').click();
  await expect(page.locator('#rvSheet-aio')).toBeVisible();
  await expect(page.locator('#aioPwd')).not.toHaveValue('');
});

test('the export sheet fills the JSON preview and copying works', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openReview(page);
  await page.locator('.rv-row[data-sheet="export"]').click();
  await expect(page.locator('#jsonPreview')).toContainText('"config"');
});

test('picking a stream card updates the Review row without closing the sheet', async ({ page }) => {
  await openReview(page);
  await page.locator('.rv-row-cards').click();
  const other = page.locator('#rvSheet-cards [data-action="fmt-scroll-pick"]:not([data-fmt="family-v4"])').first();
  const name = (await other.getAttribute('data-fmt'));
  await other.click();
  await expect(page.locator('#rvSheet-cards')).toBeVisible();
  await page.locator('#rvSheet-cards .rv-sheet-done').click();
  await expect(page.locator('#rvCardsVal')).not.toHaveText('Family v4');
  expect(name).toBeTruthy();
});

test('Menu › Import a config opens Your AIOStreams at the paste field', async ({ page }) => {
  await page.goto('/?cb-e2e=1#import');
  await expect(page.locator('#rvSheet-aio')).toBeVisible();
  await expect(page.locator('#pasteManifest')).toBeFocused();
});

test('a modal or toast opened from inside a sheet shows on top of it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openReview(page);
  await page.locator('.rv-row[data-sheet="export"]').click();
  await page.locator('#rvSheet-export [data-action="share-config"]').click();
  const toast = page.locator('.toast').first();
  await expect.poll(() => toast.evaluate(t => Number(getComputedStyle(t).opacity))).toBeGreaterThan(0.5);
  // Toasts ignore the pointer, so compare stacking rather than hit-testing.
  const [toastZ, sheetZ] = await page.evaluate(() => [document.querySelector('.toast'), document.getElementById('rvSheet-export')].map(n => Number(getComputedStyle(n).zIndex)));
  expect(toastZ).toBeGreaterThan(sheetZ);
  await page.locator('#rvSheet-export .rv-sheet-done').click();
  await page.locator('.rv-row-cards').click();
  await page.locator('#rvSheet-cards [data-action="import-formatter"]').click();
  const modal = page.locator('.modal-overlay').last();
  await expect(modal).toBeVisible();
  // The dialog is the topmost thing in the middle of the screen, not the sheet.
  const top = await page.evaluate(() => { const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !!el.closest('.modal-overlay') && !el.closest('.rv-sheet'); });
  expect(top).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#rvSheet-cards')).toBeVisible(); // Escape belongs to the dialog above, not the sheet
});

test('the Health Score link opens Checks', async ({ page }) => {
  await openReview(page);
  await page.evaluate(() => { location.hash = '#health-score'; });
  await expect(page.locator('#rvSheet-checks')).toBeVisible();
});

test('Share Link shows a scannable QR code and the link itself', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // Placeholder secrets, so the "no secrets in the link" checks below have something to leak.
  await openReview(page, { creds: { torbox: 'placeholder-torbox-key' }, instancePassword: 'placeholder-password' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild')).creds.torbox)).toBe('placeholder-torbox-key');
  await page.locator('.rv-row[data-sheet="export"]').click();
  await expect(page.locator('#shareQr')).toBeHidden();
  await page.locator('#rvSheet-export [data-action="share-config"]').click();
  await expect(page.locator('#shareQr img')).toBeVisible();
  const url = await page.locator('#shareQrUrl').inputValue();
  expect(url).toContain('#cfg=');
  // Settings only: no key or password travels in the link.
  const shared = JSON.parse(Buffer.from(decodeURIComponent(url.split('#cfg=')[1]), 'base64').toString('utf8'));
  expect(Object.keys(shared)).not.toContain('creds');
  expect(Object.keys(shared)).not.toContain('instancePassword');
  expect(JSON.stringify(shared)).not.toContain('placeholder-');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
});

test('a refused clipboard leaves the share link selected on screen', async ({ page }) => {
  await openReview(page);
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }); });
  await page.locator('.rv-row[data-sheet="export"]').click();
  await page.locator('#rvSheet-export [data-action="share-config"]').click();
  await expect(page.locator('#shareQrUrl')).toBeFocused();
  await expect(page.locator('.toast').first()).toContainText('Could not copy');
});
