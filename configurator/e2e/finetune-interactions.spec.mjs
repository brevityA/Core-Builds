import { test, expect } from '@playwright/test';

async function fresh(page) {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForTimeout(950);
}

test('Fine-Tune nested clicks survive rerender and persist', async ({ page }) => {
  await fresh(page);
  await page.locator('[data-action="custom-start"]').click();
  await page.locator('label[for="o_torbox-pro"]').click();
  await page.locator('[data-action="open-advanced"]').click();
  await expect(page.locator('#advancedDrawer')).toBeVisible();

  await page.locator('[data-action="set-audio"][data-val="standard"]').click();
  await page.locator('[data-action="set-size-limit"][data-val="10"]').click();
  await page.locator('[data-action="set-simple-pool"][data-val="large"]').click().catch(() => {});

  await page.locator('#advancedDrawer [data-action="close-advanced"]').click();
  await expect(page.locator('#advancedDrawer')).toBeHidden();
  await page.locator('[data-action="open-advanced"]').click();
  await expect(page.locator('[data-action="set-size-limit"][data-val="10"]')).toHaveClass(/size-btn-active/);
  await page.locator('#advancedDrawer [data-action="close-advanced"]').click();
});

test('Fine-Tune close button restores focus to the trigger', async ({ page }) => {
  await fresh(page);
  await page.locator('[data-action="custom-start"]').click();
  await page.locator('label[for="o_torbox-pro"]').click();
  const trigger = page.locator('[data-action="open-advanced"]');
  await trigger.focus();
  await trigger.click();
  await page.locator('#advancedDrawer [data-action="close-advanced"]').click();
  await expect(trigger).toBeFocused();
});
