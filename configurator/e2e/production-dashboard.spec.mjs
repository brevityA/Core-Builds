import { test, expect } from '@playwright/test';

async function boot(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.36.0' } }) });
  });
  await page.goto('/?cb-e2e=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.locator('#splashStart [data-action="open-express-lane"]').click();
  return errors;
}

test('four-section dashboard has a Stable default, verified targets and working delivery modes', async ({ page }) => {
  const errors = await boot(page);
  await expect(page.locator('#expressLaneModal section.ux-section')).toHaveCount(4);
  await expect(page.locator('#expressOutputProfile')).toHaveValue('stable');
  await expect(page.locator('[data-express-mode="direct"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-express-target]')).toHaveCount(2);
  await expect(page.locator('[data-express-target="nuvio"], [data-express-target="chillio"], [data-express-target="jellyfin"]')).toHaveCount(0);
  await page.locator('[data-express-mode="manifest"]').click();
  await expect(page.locator('#expressStremio')).toBeHidden();
  await page.locator('[data-express-mode="direct"]').click();
  await page.locator('[data-express-target="wuplay"]').click();
  await expect(page.locator('#expressStremio')).toBeHidden();
  await page.locator('[data-express-target="app"]').click();
  await expect(page.locator('#stremioPasswordInline')).toBeVisible();
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport);
  expect(errors).toEqual([]);
});

test('provider keys remain persisted, Stremio password is not, and visibility toggle works', async ({ page }) => {
  const errors = await boot(page);
  const key = page.locator('[data-express-cred="torbox"]');
  await key.fill('SYNTHETIC-LOCAL-KEY');
  await page.locator('[data-action="toggle-cred-vis"][data-target="expressCred_torbox"]').click();
  await expect(key).toHaveAttribute('type', 'text');
  await page.locator('[data-action="toggle-cred-vis"][data-target="expressCred_torbox"]').click();
  await expect(key).toHaveAttribute('type', 'password');
  await page.locator('#stremioPasswordInline').fill('SYNTHETIC-MEMORY-ONLY-PASSWORD');
  await page.locator('[data-express-customize="ft-layout"]').click();
  const raw = await page.evaluate(() => localStorage.getItem('coreBuild'));
  expect(JSON.parse(raw).creds.torbox).toBe('SYNTHETIC-LOCAL-KEY');
  expect(JSON.parse(raw)).not.toHaveProperty('stremioPassword');
  expect(raw).not.toContain('SYNTHETIC-MEMORY-ONLY-PASSWORD');
  expect(errors).toEqual([]);
});

test('diagnostics wait for the real relay response and then expose the manifest result', async ({ page }) => {
  const errors = await boot(page);
  let release;
  const responseGate = new Promise(resolve => { release = resolve; });
  let posted;
  await page.route('**/api/v1/user**', async route => {
    if (route.request().method() !== 'POST') return route.abort();
    posted = JSON.parse(route.request().postData());
    await responseGate;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: '11111111-2222-4333-8444-555555555555', encryptedPassword: 'demo-password' } }) });
  });
  await page.locator('[data-express-cred="torbox"]').fill('SYNTHETIC-LOCAL-KEY');
  await page.locator('[data-express-mode="manifest"]').click();
  await page.locator('#expressGo').click();
  await page.locator('#pwdPrompt .pwd-go').click();
  await expect(page.locator('#deploymentProgress')).toBeVisible();
  await expect(page.locator('#deploymentBar')).toHaveAttribute('value', '3');
  await expect(page.locator('#deploymentSteps li').nth(3)).toHaveAttribute('data-state', 'running');
  await expect(page.locator('#manifestModal')).toHaveCount(0);
  expect(posted.config.groups.enabled).toBe(false);
  expect(posted.config.dynamicAddonFetching.enabled).toBe(false);
  release();
  await expect(page.locator('#manifestModal')).toBeVisible();
  await expect(page.locator('#deploymentProgress')).toHaveCount(0);
  await expect(page.locator('#mUrlVal')).toContainText('11111111-2222-4333-8444-555555555555');
  await expect(page.locator('#mFmtTabs .fmt-tab.active')).toHaveText('Manifest URL');
  await expect(page.locator('#mFmtTabs')).not.toContainText('Nuvio');
  await expect(page.locator('#mFmtTabs')).not.toContainText('Chillio');
  expect(errors).toEqual([]);
});

test('raw JSON reuses local generation without requiring a Stremio login', async ({ page }) => {
  const errors = await boot(page);
  let writes = 0;
  await page.route('**/api/v1/user**', route => { if (route.request().method() === 'POST') writes++; return route.abort(); });
  await page.locator('[data-express-cred="torbox"]').fill('SYNTHETIC-LOCAL-KEY');
  await page.locator('[data-express-mode="json"]').click();
  await expect(page.locator('#expressStremio')).toBeHidden();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#expressGo').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  expect(writes).toBe(0);
  expect(errors).toEqual([]);
});
