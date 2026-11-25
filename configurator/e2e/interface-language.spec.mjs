// Interface language (src/js/i18n.js): the default follows the browser, the
// floating picker switches it and the choice survives a reload, and the screens
// that render after the switch (Quick install) come up translated.
import { test, expect } from '@playwright/test';
import { mockSplashRequests } from './lib/mock-splash-requests.mjs';

test.describe('German browser', () => {
  test.use({ locale: 'de-DE' });

  test('opens in German and switches to English, which sticks', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await mockSplashRequests(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByText('Core Builds unterstützen').first()).toBeVisible();
    await expect(page.locator('.cb-lang-code')).toHaveText('DE');

    await page.locator('.cb-lang-btn').click();
    await page.locator('.cb-lang-menu [data-lang="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Support Core Builds').first()).toBeVisible();
    await expect(page.getByText('Core Builds unterstützen')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.cb-lang-code')).toHaveText('EN');
    expect(errors).toEqual([]);
  });
});

test.describe('English browser', () => {
  test.use({ locale: 'en-US' });

  test('stays English until a language is picked; Quick install renders in it', async ({ page }) => {
    await mockSplashRequests(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Support Core Builds').first()).toBeVisible();

    await page.locator('.cb-lang-btn').click();
    await expect(page.locator('.cb-lang-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cb-lang-menu')).toBeHidden();

    await page.locator('.cb-lang-btn').click();
    await page.locator('.cb-lang-menu [data-lang="es"]').click();
    await page.locator('[data-action="open-express-lane"]').first().click();
    await expect(page.getByText('Instalar en ~30 segundos').first()).toBeVisible();
    // Brand and app names stay as they are.
    await expect(page.getByText('WuPlay').first()).toBeVisible();
  });

  test('?lang= picks the language for a shared link', async ({ page }) => {
    await mockSplashRequests(page);
    await page.goto('/?lang=fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByText('Soutenir Core Builds').first()).toBeVisible();
  });
});
