import { test, expect } from '@playwright/test';

// Express as a full-screen page on phones (v3.21). On a phone the lane fills the
// screen with a Back button and a pinned Install button, and the system Back
// button closes it instead of leaving the site. On desktop it stays a centred
// panel. Other dialogs share .fastlane-panel and must stay unchanged.
async function fresh(page) {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route => route.abort());
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await expect(page.locator('#splashStart [data-action="open-express-lane"]')).toBeVisible();
}

test('Back closes the Express lane and stays on the landing', async ({ page }) => {
  await fresh(page);
  const url = page.url();
  await page.locator('#splashStart [data-action="open-express-lane"]').click();
  await expect(page.locator('#expressLaneModal')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#expressLaneModal')).toHaveCount(0);
  expect(page.url()).toBe(url);
  await expect(page.locator('#splashStart')).toBeVisible();
});

test('closing with the lane’s own button leaves no extra history entry', async ({ page }, testInfo) => {
  await fresh(page);
  await page.locator('#splashStart [data-action="open-express-lane"]').click();
  const close = testInfo.project.name === 'mobile' ? '[data-express-back]' : '#expressClose';
  await page.locator(`#expressLaneModal ${close}`).click();
  await expect(page.locator('#expressLaneModal')).toHaveCount(0);
  // Reopening then pressing Back once must close the lane, not land on a stale entry.
  await page.locator('#splashStart [data-action="open-express-lane"]').click();
  await page.goBack();
  await expect(page.locator('#expressLaneModal')).toHaveCount(0);
  await expect(page.locator('#splashStart')).toBeVisible();
});

test('on a phone the lane fills the screen with Back and a pinned Install button', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone layout');
  await fresh(page);
  await page.locator('#splashStart [data-action="open-express-lane"]').click();
  const box = await page.locator('#expressLaneModal .fastlane-panel').boundingBox();
  const vp = page.viewportSize();
  expect(Math.round(box.x)).toBe(0);
  expect(Math.round(box.y)).toBe(0);
  expect(Math.round(box.width)).toBe(vp.width);
  expect(Math.round(box.height)).toBe(vp.height);
  await expect(page.locator('#expressLaneModal [data-express-back]')).toBeVisible();
  await expect(page.locator('#expressClose')).toBeHidden();
  const go = await page.locator('#expressGo').boundingBox();
  expect(go.y + go.height).toBeLessThanOrEqual(vp.height);
  const row = await page.locator('[data-express-service="torbox-pro"]').boundingBox();
  expect(row.height).toBeGreaterThanOrEqual(60);
  expect(row.width).toBeGreaterThan(vp.width - 40);
});

test('on desktop the lane stays a centred panel with its close button', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop layout');
  await fresh(page);
  await page.locator('#splashStart [data-action="open-express-lane"]').click();
  await expect(page.locator('#expressClose')).toBeVisible();
  await expect(page.locator('#expressLaneModal [data-express-back]')).toBeHidden();
  const box = await page.locator('#expressLaneModal .fastlane-panel').boundingBox();
  expect(box.width).toBeLessThan(page.viewportSize().width - 100);
});

test('other dialogs keep their own close button on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone layout');
  await fresh(page);
  await page.locator('#splashStart [data-action="open-express-lane"]').click();
  await page.locator('#expressExtrasBtn').click();
  const extras = page.locator('#additionalServicesModal');
  await expect(extras).toBeVisible();
  const box = await extras.locator('.fastlane-panel').boundingBox();
  expect(box.y).toBeGreaterThan(0); // still a bottom sheet, not full screen
});

// Quick → Custom hand-off (v3.22): a "Defaults we'll use" row carries what Quick
// install collected into the builder, opens Fine-Tune at that section, and lands
// on Review so the install happens there.
test('a Defaults row opens Custom build with the Quick picks kept', async ({ page }) => {
  await fresh(page);
  await page.locator('#splashStart [data-action="open-express-lane"]').click();
  await page.locator('[data-express-service="realdebrid"]').click();
  await page.locator('[data-express-cred="realdebrid"]').fill('rd-test-key');
  await page.locator('[data-express-customize="ft-layout"]').click();

  await expect(page.locator('#expressLaneModal')).toHaveCount(0);
  await expect(page.locator('#advancedDrawer')).toBeVisible();
  await expect(page.locator('#advancedDrawer #ft-layout')).toBeInViewport();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild') || '{}'));
  expect(saved.service).toBe('realdebrid');
  expect(saved.multiServices).toContain('realdebrid');
  expect(saved.simpleMode).toBe(false);
  expect(saved.creds?.realdebrid).toBe('rd-test-key');

  await page.locator('#advancedDrawer [data-action="close-advanced"]').click();
  await expect(page.locator('#advancedDrawer')).toHaveCount(0);
  await expect(page.locator('#btnNext, [data-action="auto-create"], #btnAutoCreate').first()).toBeAttached();
  await page.goBack();
  await expect(page.locator('#splashStart')).toBeVisible();
});

test('Customize every setting opens Fine-Tune at the top', async ({ page }) => {
  await fresh(page);
  await page.locator('#splashStart [data-action="open-express-lane"]').click();
  await page.locator('#expressLaneModal .fastlane-customize').click();
  await expect(page.locator('#advancedDrawer')).toBeVisible();
  await expect(page.locator('#advancedDrawer [data-action="close-advanced"]')).toBeInViewport();
});
