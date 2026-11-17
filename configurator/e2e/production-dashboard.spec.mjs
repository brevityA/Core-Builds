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
  await page.locator('#expressAdvanced > summary').click();
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

test('touch-first pills expose keyboard selection and responsive tap targets', async ({ page }, testInfo) => {
  const errors = await boot(page);
  const advanced = page.locator('#expressAdvanced');
  await expect(advanced).not.toHaveAttribute('open');
  await expect(page.locator('#expressHostPills')).toBeHidden();
  const profiles = page.getByRole('radiogroup', { name: 'Template profile', exact: true });
  const stable = profiles.locator('[data-pill-value="stable"]');
  await stable.focus();
  await stable.press('ArrowRight');
  await expect(page.locator('#expressOutputProfile')).toHaveValue('balanced');
  await expect(profiles.locator('[aria-checked="true"]')).toHaveCount(1);
  await expect(profiles.locator('[tabindex="0"]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('#expressOutputProfile')).toHaveValue('stable');
  const device = page.getByRole('radiogroup', { name: 'Device', exact: true });
  await device.locator('[data-express-device="shield"]').click();
  await expect(device.locator('[data-express-device="shield"]')).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(device.locator('[data-express-device="firestick-hd"]')).toHaveAttribute('aria-checked', 'true');
  const geometry = await device.evaluate(el => ({
    columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
    targets: [...el.children].map(b => ({ width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height }))
  }));
  expect(geometry.columns).toBe(testInfo.project.name === 'mobile' ? 2 : 4);
  for (const box of geometry.targets) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(48); }
  const stack = page.locator('#expressFullStack');
  const checked = await stack.isChecked();
  await page.locator('.ux-toggle-row').filter({ has: stack }).locator('.ux-toggle-copy').click();
  await expect(stack).toBeChecked({ checked: !checked });
  await page.locator('[data-express-bandwidth="100"]').click();
  await expect(page.locator('#expressBandwidth')).toHaveValue('100');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild')).bandwidthMbps)).toBe(100);
  await page.locator('[data-express-bandwidth="custom"]').click();
  await expect(advanced).toHaveAttribute('open', '');
  await expect(page.locator('#expressBandwidth')).toBeFocused();
  await page.locator('#expressBandwidth').fill('123');
  await expect(page.locator('[data-express-bandwidth="custom"]')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#expressBandwidth').fill('20000');
  await page.locator('#expressBandwidth').press('Tab');
  await expect(page.locator('#expressBandwidth')).toHaveValue('10000');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild')).bandwidthMbps)).toBe(10000);
  await page.locator('[data-express-bandwidth="0"]').click();
  await expect(page.locator('[data-express-bandwidth="0"]')).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild')).bandwidthMbps)).toBe(0);
  await page.locator('#expressHostPills [data-pill-value="auto"]').click();
  await expect(page.locator('#expressHost')).toHaveValue('auto');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `dist/touch-dashboard-${testInfo.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});
