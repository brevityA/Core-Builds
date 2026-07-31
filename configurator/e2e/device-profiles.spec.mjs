import { test, expect } from '@playwright/test';

async function fresh(page) {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForTimeout(950);
}

async function openDeviceStep(page) {
  await fresh(page);
  await page.locator('[data-action="custom-start"]').click();
  await page.locator('label[for="o_torbox-pro"]').click();
  await page.locator('#btnNext').click();
  await expect(page.getByText('Your Device', { exact: true })).toBeVisible();
}

test('new Android and TV profiles appear in the device picker', async ({ page }) => {
  await openDeviceStep(page);
  for (const id of ['android-mobile', 'android-tv', 'samsung-tizen', 'lg-webos', 'sony-google-tv', 'generic-4k-hdr-tv']) {
    const card = page.locator(`.device-card[data-val="${id}"]`);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
  }
});

test('device profile icons render as SVG inside cards', async ({ page }) => {
  await openDeviceStep(page);
  for (const id of ['android-mobile', 'android-tv', 'samsung-tizen', 'lg-webos', 'sony-google-tv', 'generic-4k-hdr-tv']) {
    const card = page.locator(`.device-card[data-val="${id}"]`);
    await card.scrollIntoViewIfNeeded();
    const svg = card.locator('.device-card-icon svg');
    await expect(svg).toBeVisible();
    const box = await svg.boundingBox();
    const cardBox = await card.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(cardBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
  }
});

test('Android Mobile selection reaches Video Quality step', async ({ page }) => {
  await openDeviceStep(page);
  const card = page.locator('.device-card[data-val="android-mobile"]');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(card).toHaveAttribute('data-active', 'true');
  await page.locator('#btnNext').click();
  await expect(page.locator('#main').getByText('Video Quality')).toBeVisible();
});

test('Samsung Tizen profile can be selected on mobile-sized viewport', async ({ page }) => {
  await openDeviceStep(page);
  const card = page.locator('.device-card[data-val="samsung-tizen"]');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(card).toHaveAttribute('data-active', 'true');
});

test('device cards are keyboard selectable', async ({ page }) => {
  await openDeviceStep(page);
  const card = page.locator('.device-card[data-val="android-mobile"]');
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('aria-checked', 'true');
});

test('device help text opens for new profiles', async ({ page }) => {
  await openDeviceStep(page);
  const card = page.locator('.device-card[data-val="android-mobile"]');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(card).toHaveAttribute('data-active', 'true');
  const banner = page.locator('.device-help-banner');
  await expect(banner).toBeVisible();
  await expect(banner.locator('.device-help-banner-title')).toContainText('Android Phone');
});
