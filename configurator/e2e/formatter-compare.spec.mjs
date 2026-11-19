// Side-by-side compare in Fine-Tune's Stream cards (v3.35).
import { test, expect } from '@playwright/test';

test('compare shows the same sample in each formatter and can pick one', async ({ page }) => {
  await page.goto('/?cb-e2e=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.evaluate(() => { location.hash = '#cards'; });
  const drawer = page.locator('#advancedDrawer');
  await expect(drawer.locator('#ft-layout')).toBeVisible();
  await drawer.locator('.fmt-compare-open').click();
  const cols = drawer.locator('.fmt-cmp-col');
  await expect(cols).toHaveCount(3);
  await expect(cols.nth(0).locator('.fmt-cmp-pick')).toHaveValue('family-v4');
  await expect(cols.nth(1).locator('.fmt-cmp-pick')).toHaveValue('core-compact');
  await expect(cols.nth(1).locator('.fmt-cmp-n')).toContainText('4K');

  await drawer.locator('[data-action="fmt-compare-sample"][data-val="uncached"]').click();
  await expect(drawer.locator('[data-action="fmt-compare-sample"][data-val="uncached"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(cols.nth(1).locator('.fmt-cmp-n')).toContainText('⏳');

  await drawer.locator('[data-action="fmt-compare-device"][data-val="tv"]').click();
  await expect(drawer.locator('.fmt-cmp-cols')).toHaveAttribute('data-device', 'tv');

  await drawer.locator('#fmtCmpPick2').selectOption('core-detailed');
  await expect(cols.nth(2).locator('.fmt-cmp-use')).toHaveText('Use this');
  await cols.nth(2).locator('.fmt-cmp-use').click();
  await expect(cols.nth(2).locator('.fmt-cmp-use')).toHaveText('In use');
  const formatter = await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild') || '{}').formatter);
  expect(formatter).toBe('core-detailed');
});
