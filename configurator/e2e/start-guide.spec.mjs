// Start Here (tools/start/), the guided beginner page. The configurator's web server
// only serves dist/web, so this spec serves the repository's own files at a fake
// origin: the page imports the configurator's translation table by relative path,
// exactly as it does on GitHub Pages.
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ORIGIN = 'http://start-guide.test';
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css' };

async function serve(page) {
  await page.route(`${ORIGIN}/**`, async route => {
    let path = new URL(route.request().url()).pathname;
    if (path.endsWith('/')) path += 'index.html';
    try {
      const body = await readFile(ROOT + path.replace(/^\//, ''));
      await route.fulfill({ body, contentType: TYPES[extname(path)] || 'application/octet-stream' });
    } catch { await route.fulfill({ status: 404, body: 'not found' }); }
  });
}

async function open(page, query = '') {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await serve(page);
  await page.goto(`${ORIGIN}/tools/start/${query}`);
  await expect(page.locator('[data-set="device"]').first()).toBeVisible();
  return errors;
}

test.describe('English', () => {
  test.use({ locale: 'en-US' });

  test('three answers unlock the steps, ticks fill the progress bar, and a fix opens', async ({ page }) => {
    const errors = await open(page);
    await expect(page.locator('#sec-locked')).toBeVisible();
    await expect(page.locator('#sec-app')).toHaveClass(/locked/);

    await page.locator('[data-set="device"][data-val="atv"]').click();
    await expect(page.locator('#sec-app')).not.toHaveClass(/locked/);
    await expect(page.locator('[data-set="app"][data-val="stremio"] .reco')).toBeVisible();
    await page.locator('[data-set="app"][data-val="stremio"]').click();
    await page.locator('[data-set="service"][data-val="torbox"]').click();

    // A Stremio TV is set up from a phone and signs in on the TV; the TorBox tile is lit.
    await expect(page.locator('#sec-build')).toContainText('On your phone or computer');
    await expect(page.locator('#sec-build .mini .t.lit').first()).toHaveText('Stremio');
    await expect(page.locator('#sec-add')).toContainText('the same account');

    const boxes = page.locator('[data-tick]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    await page.locator('[data-played="1"]').click();
    await expect(page.locator('#progTxt')).toHaveText('All done 🎉');

    // Choices survive a reload.
    await page.reload();
    await expect(page.locator('#progTxt')).toHaveText('All done 🎉');

    await page.locator('[data-played="0"]').click();
    await page.locator('[data-fix="play"]').click();
    await expect(page.locator('[data-fix="play"]')).toContainText('Device');
    expect(errors).toEqual([]);
  });

  test('changing an answer clears the ticks it no longer describes', async ({ page }) => {
    await open(page);
    await page.locator('[data-set="device"][data-val="pc"]').click();
    await page.locator('[data-set="app"][data-val="nuvio"]').click();
    await page.locator('[data-set="service"][data-val="free"]').click();
    await expect(page.locator('[data-tick="b.key"]')).toHaveCount(0); // no key for Free / P2P
    await page.locator('[data-tick="b.open"]').check();
    await page.locator('[data-set="service"][data-val="rd"]').click();
    await expect(page.locator('[data-tick="b.open"]')).not.toBeChecked();
    await expect(page.locator('[data-tick="b.key"]')).toBeVisible();
  });
});

test.describe('Spanish browser', () => {
  test.use({ locale: 'es-ES' });

  test('opens in Spanish, names buttons as the Spanish configurator does, and switches back', async ({ page }) => {
    const errors = await open(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('#sec-device')).toContainText('¿Dónde vas a ver?');
    await page.locator('[data-set="device"][data-val="android"]').click();
    await page.locator('[data-set="app"][data-val="other"]').click();
    await page.locator('[data-set="service"][data-val="free"]').click();
    // The configurator shows "Quick install" as "Instalación rápida" in Spanish.
    await expect(page.locator('#sec-build .ui').first()).toHaveText('Instalación rápida');
    await expect(page.locator('#sec-build .mini .t.lit').first()).toHaveText('Otra app');

    await page.locator('#langBtn').click();
    await page.locator('#langMenu [data-lang="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#sec-build .ui').first()).toHaveText('Quick install');
    // The choice is shared with the configurator (same origin, same key).
    expect(await page.evaluate(() => localStorage.getItem('coreBuildUiLang'))).toBe('en');
    expect(errors).toEqual([]);
  });
});

test('?lang=de opens in German', async ({ page }) => {
  await open(page, '?lang=de');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('#sec-device')).toContainText('Wo schaust du?');
});
