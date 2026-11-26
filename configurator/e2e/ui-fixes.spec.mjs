import { test, expect } from '@playwright/test';

// Regression guards for two layering bugs reported by the Core Crew:
//   1. "Import Custom Formatter" opened from inside the Fine-Tune drawer rendered
//      BEHIND the drawer (modal-overlay z-index was below the drawer's).
//   2. Fine-Tune help tooltips (?) were clipped by the drawer's scroll container.
// Both are fixed structurally (modal above the drawer; tooltip portaled to <body>),
// so these tests assert the structure, not pixels.

async function fresh(page) {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForTimeout(700);
}

async function openDrawer(page) {
  await page.evaluate(() => { location.hash = ''; location.hash = '#advanced'; }); // deep link (the main page has no menu)
  await page.locator('[data-action="open-advanced"]').click();
  await expect(page.locator('#advancedDrawer')).toBeVisible();
}

test('Import Custom Formatter modal layers above the Fine-Tune drawer', async ({ page }) => {
  await fresh(page);
  await openDrawer(page);
  await page.locator('#advancedDrawer [data-action="import-formatter"]').first().click();
  const modal = page.locator('#fmtImportModal');
  await expect(modal).toBeVisible();

  const layering = await page.evaluate(() => {
    const m = document.getElementById('fmtImportModal');
    const d = document.getElementById('advancedDrawer');
    const box = m.querySelector('.modal-box').getBoundingClientRect();
    const topEl = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return {
      modalZ: +getComputedStyle(m).zIndex,
      drawerZ: +getComputedStyle(d).zIndex,
      modalOnTop: !!(topEl && m.contains(topEl)),
    };
  });
  expect(layering.modalZ).toBeGreaterThan(layering.drawerZ);
  expect(layering.modalOnTop).toBe(true);
});

test('Fine-Tune help tooltips portal to <body> and stay within the viewport', async ({ page }) => {
  await fresh(page);
  await openDrawer(page);
  const icon = page.locator('#advancedDrawer .ft-info[data-fttip]').first();
  await expect(icon).toBeVisible();
  await icon.scrollIntoViewIfNeeded();
  await icon.click();

  const tip = await page.evaluate(() => {
    const pop = document.querySelector('.ft-popup.active');
    if (!pop) return null;
    const r = pop.getBoundingClientRect();
    const cs = getComputedStyle(pop);
    return {
      parentIsBody: pop.parentElement === document.body,
      position: cs.position,
      // A portaled fixed popup is laid out against the viewport, so it cannot be clipped by
      // the drawer's scroll container — assert it sits within the viewport bounds (small
      // epsilon for sub-pixel rounding) and exposes its text.
      inViewport: r.top >= -1 && r.left >= -1 &&
        r.bottom <= window.innerHeight + 1 && r.right <= window.innerWidth + 1,
      hasText: pop.textContent.trim().length > 0,
    };
  });
  expect(tip, 'tooltip did not open').toBeTruthy();
  expect(tip.parentIsBody, 'tooltip must be portaled to <body> to escape the drawer overflow clip').toBe(true);
  expect(tip.position, 'tooltip must use fixed positioning').toBe('fixed');
  expect(tip.hasText, 'tooltip must render its help text').toBe(true);
  expect(tip.inViewport, 'tooltip must be fully visible within the viewport').toBe(true);
});

test('feedback / contact widget mounts and opens (v2.83 wiring restored)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  const btn = page.locator('#cbContactBtn');
  await expect(btn).toBeVisible();                 // proves initContactWidget() ran (module is wired)
  await btn.click();
  await expect(page.locator('#cbContactPanel, .cb-contact-panel').first()).toBeVisible();
  await expect(page.locator('#cbContactForm')).toBeVisible();
});

// v3.46: with the step sidebar showing, the page was wider than the window (128 px at
// 1000 px, 256 px at wider sizes) because .wrap took 100% width plus the sidebar margin.
for (const width of [1000, 1280, 1920]) {
  test(`no sideways scroll beside the step sidebar at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear(); localStorage.setItem('cb_tut_seen', '1');
      localStorage.setItem('coreBuild', JSON.stringify({ _schema: 6, multiServices: ['torbox-pro'], device: 'generic', resolution: '4k' }));
      localStorage.setItem('coreBuildStep', '3');
    });
    await page.reload();
    await page.locator('[data-action="continue-session"]').click({ timeout: 3000 }).catch(() => {});
    await expect(page.locator('.cb-sidebar:not(.sb-hidden)')).toBeVisible();
    const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(extra).toBe(0);
  });
}

test('More styles: Enter opens it without moving the wizard, and a pick made in Compare opens it', async ({ page }) => {
  await page.goto('/?cb-e2e=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.evaluate(() => { location.hash = '#cards'; });
  const drawer = page.locator('#advancedDrawer');
  await expect(drawer.locator('#ft-layout')).toBeVisible();
  const more = drawer.locator('details.fmt-more').first();
  await expect(more).toHaveJSProperty('open', false);

  const before = await page.evaluate(() => localStorage.getItem('coreBuildStep'));
  await more.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(more).toHaveJSProperty('open', true);
  expect(await page.evaluate(() => localStorage.getItem('coreBuildStep'))).toBe(before);
  await page.keyboard.press('Enter');
  await expect(more).toHaveJSProperty('open', false);

  // Pick a More-styles formatter through Compare side by side: the fold must open to show it.
  const hidden = await more.locator('.fmt-row').first().getAttribute('data-fmt');
  await drawer.locator('.fmt-compare-open').click();
  await drawer.locator('#fmtCmpPick2').selectOption(hidden);
  await drawer.locator('.fmt-cmp-col').nth(2).locator('.fmt-cmp-use').click();
  await expect(more).toHaveJSProperty('open', true);
  await expect(more.locator(`.fmt-row[data-fmt="${hidden}"]`)).toHaveAttribute('data-active', 'true');
});
