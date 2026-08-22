import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools/badges/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cb_tut_seen', '1');
  });
  await page.reload();
});

test('builds and previews an enhanced badge pack without exposing regex controls', async ({ page }) => {
  await expect(page.getByRole('heading', { name:/choose the badges/i })).toBeVisible();
  await expect(page.getByText('Match Pattern', { exact:false })).toHaveCount(0);
  await expect(page.locator('[data-mode="enhanced"]')).toHaveAttribute('aria-checked','true');

  await page.getByRole('button', { name:'Choose badges →' }).click();
  await expect(page.locator('#selectedCount')).toContainText(/5\d badges selected/);

  await page.locator('[data-group-toggle="status"]').click();
  await page.getByLabel('Use Cached / instant').check();
  await expect(page.locator('#selectedHint')).toContainText('optional advanced');

  await page.getByRole('button', { name:'Preview my badges →' }).click();
  await expect(page.locator('#badgePreview img[alt="4K"]')).toBeVisible();
  await expect(page.locator('#badgePreview img[alt="Remux"]')).toBeVisible();
  await expect(page.locator('#badgePreview img[alt="BluRay"]')).toHaveCount(0);
  await expect(page.locator('#buildDetails')).toContainText('AIO Enhanced');
  await expect(page.locator('#buildDetails')).toContainText('Safety limit');
});

test('downloads a backup before returning a verified temporary import URL', async ({ page }) => {
  const importUrl = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev/t/badgetest1';
  await page.route('https://core-builds-cors-proxy.tlorenzato26.workers.dev/**', async (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ url:importUrl }) });
    }
    return route.fulfill({ status:200, contentType:'application/json', body:'{"groups":[],"filters":[]}' });
  });

  await page.getByRole('button', { name:'Choose badges →' }).click();
  await page.getByRole('button', { name:'Preview my badges →' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name:'Create import URL + backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('core-builds-nuvio-badges-enhanced.json');
  await expect(page.locator('#importResult')).toBeVisible();
  await expect(page.locator('#importUrl')).toHaveValue(importUrl);
  await expect(page.locator('#importProvider')).toContainText('Core Builds Worker');
  await expect(page.locator('#importExpiry')).toContainText('Nuvio stores the rules');
});

test('hands the companion formatter to the existing Configurator and consumes it once', async ({ page }) => {
  await page.getByRole('button', { name:'Choose badges →' }).click();
  await page.getByRole('button', { name:'Preview my badges →' }).click();
  await page.getByRole('button', { name:'Open in Core Configurator →' }).click();

  await page.waitForURL(/\/#advanced$/);
  await expect(page.getByText(/Core Badge Companion applied/i)).toBeVisible();
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild') || '{}'));
  expect(persisted.formatter).toBe('custom');
  expect(persisted.customFormatter?.label).toBe('Core Badge Companion');
  expect(persisted.customFormatter?.name.length).toBeGreaterThan(500);
  expect(await page.evaluate(() => sessionStorage.getItem('cb-badge-builder-handoff-v1'))).toBeNull();
});
