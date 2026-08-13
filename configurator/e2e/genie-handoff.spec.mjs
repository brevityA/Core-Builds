// Genie → builder hand-off: the Setup Genie / Nuvio Stack Genie drop picks into
// sessionStorage (key cb-genie-handoff-v1); the configurator consumes them and opens
// the right lane with everything pre-set. Guards the wiring added in the genie polish.
import { test, expect } from '@playwright/test';

const HANDOFF = (over = {}) => JSON.stringify({
  v: 1, src: 'cb-genie', route: 'express', app: 'app',
  service: 'torbox', device: 'firestick', content: 'movies',
  name: 'Den of Zen', ts: Date.now(), ...over,
});

test.describe('genie hand-off', () => {
  test('express route: picks pre-set, toast shown, payload consumed', async ({ page }) => {
    await page.addInitScript(h => sessionStorage.setItem('cb-genie-handoff-v1', h), HANDOFF());
    await page.goto('/');
    await expect(page.locator('#expressLaneModal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#expressLaneModal [data-express-target].active')).toHaveAttribute('data-express-target', 'app');
    const toast = await page.locator('.toast, #toast, [class*="toast"]').allTextContents();
    expect(toast.join(' ')).toContain('Genie hand-off');
    // one-shot: the key must be gone after consumption
    const left = await page.evaluate(() => sessionStorage.getItem('cb-genie-handoff-v1'));
    expect(left).toBeNull();
  });

  test('nuvio target seeds the express target picker', async ({ page }) => {
    await page.addInitScript(h => sessionStorage.setItem('cb-genie-handoff-v1', h),
      HANDOFF({ src: 'nuvio-genie', app: 'nuvio' }));
    await page.goto('/');
    await expect(page.locator('#expressLaneModal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#expressLaneModal [data-express-target].active')).toHaveAttribute('data-express-target', 'nuvio');
  });

  test('debridlink routes to the advanced builder (express has no Debrid-Link card)', async ({ page }) => {
    await page.addInitScript(h => sessionStorage.setItem('cb-genie-handoff-v1', h),
      HANDOFF({ service: 'debridlink', route: 'advanced' }));
    await page.goto('/');
    await expect(page.locator('#expressLaneModal')).toHaveCount(0);
    // advanced route = step flow entered past splash (structure, not visibility — the
    // first-run tutorial overlay legitimately covers the canvas for fresh users)
    await expect(page.locator('#stepStrip .step-strip')).toHaveCount(1, { timeout: 10000 });
  });

  test("genie 'none' free pick preselects the Free/P2P card — no silent swap to TorBox", async ({ page }) => {
    await page.addInitScript(h => sessionStorage.setItem('cb-genie-handoff-v1', h),
      HANDOFF({ service: 'none' }));
    await page.goto('/');
    await expect(page.locator('#expressLaneModal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#expressLaneModal [data-express-service].active')).toHaveAttribute('data-express-service', 'p2p');
  });

  test('handoff landing suppresses the first-run tutorial (review P1)', async ({ page }) => {
    await page.addInitScript(h => sessionStorage.setItem('cb-genie-handoff-v1', h), HANDOFF());
    await page.goto('/');
    await page.waitForTimeout(1600); // tutorial would fire at ~1000ms
    // #tutOverlay is a static skeleton — the live state is the 'active' class on it
    await expect(page.locator('#tutOverlay.active')).toHaveCount(0);
    await expect(page.locator('#expressLaneModal')).toBeVisible();
  });

  test('stale handoffs are dropped silently (10-minute freshness window)', async ({ page }) => {
    await page.addInitScript(h => sessionStorage.setItem('cb-genie-handoff-v1', h),
      HANDOFF({ ts: Date.now() - 11 * 60 * 1000 }));
    await page.goto('/');
    await page.waitForTimeout(800);
    await expect(page.locator('#expressLaneModal')).toHaveCount(0);
    const left = await page.evaluate(() => sessionStorage.getItem('cb-genie-handoff-v1'));
    expect(left).toBeNull();
  });
});
