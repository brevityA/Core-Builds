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
  await page.locator('[data-action="custom-start"]').click();
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
