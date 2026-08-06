import { test, expect } from '@playwright/test';

test('Reliable Configurator V3 builds a local-only stable template', async ({ page }) => {
  const pageErrors = [];
  const externalRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    const url = request.url();
    if (!url.startsWith('http://127.0.0.1:4173/')) externalRequests.push(url);
  });

  await page.goto('/rebuild/');
  await expect(page.getByRole('heading', { name:'A configuration you can explain.' })).toBeVisible();
  await expect(page.getByText('LOCAL ONLY · NO REMOTE SEL')).toBeVisible();
  await expect(page.getByText('No synced expression URL', { exact:true })).toBeVisible();
  await expect(page.getByText('Groups and Dynamic fetching are disabled', { exact:true })).toBeVisible();

  await page.locator('[data-action="service"][data-value="realdebrid"]').click();
  await page.locator('#credential').fill('test-credential-must-not-preview');
  await page.locator('#includeCredential').check();
  await page.locator('[data-action="preview"]').click();
  const preview = page.locator('#preview');
  await expect(preview).toBeVisible();
  await expect(preview).not.toContainText('test-credential-must-not-preview');

  const versionStatus = page.locator('.target-row .version-status');
  await page.locator('#version').selectOption('2.32.0');
  await expect(versionStatus).toHaveText('Download only — v2.32 changed Newznab configuration and removed the legacy torbox-search preset');
  await page.locator('#version').selectOption('unknown');
  await expect(versionStatus).toHaveText('Download only — run compatibility test first');
  expect(await page.evaluate(() => Object.values(localStorage).join(' '))).not.toContain('test-credential-must-not-preview');
  expect(pageErrors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('credential is included only in an explicit local download', async ({ page }) => {
  await page.goto('/rebuild/');
  await page.locator('#credential').fill('download-only-test-value');
  await page.locator('#includeCredential').check();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="download"]').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk.toString();
  expect(content).toContain('download-only-test-value');
  expect(content).toContain('coreBuildsExpressionPolicy');
  expect(content).toContain('local-only');
});
