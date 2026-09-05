// Security sink e2e — regression harness for the 2026-08-14 peer-audit wave (C1/C2).
// Deliberately simulates hostile payloads coming over first-party channels.
import { test, expect } from '@playwright/test';

test.describe('security sinks', () => {
  test('C2: a hostile /api/stats payload cannot reach splash innerHTML', async ({ page }) => {
    // Measured at authoring time: the route fires (1 hit) and #splashStats renders "—", so this
    // path IS exercised. The request counter and the visibility requirement are here so it
    // cannot silently ROT into a vacuous test — registering a route proves nothing on its own,
    // and `.catch(() => '')` on a renamed container would hand back '' and pass forever.
    let statsRequests = 0;
    await page.route('**/api/stats', route => {
      statsRequests++;
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ visits: '<img src=x onerror="window.__pwn=1">', generates: 0 }),
      });
    });
    await page.goto('/');
    await expect.poll(() => statsRequests, { timeout: 15000 }).toBeGreaterThan(0);
    await expect(page.locator('#splashStats')).toBeVisible();

    expect(await page.evaluate(() => window.__pwn || null)).toBeNull();
    expect(await page.locator('#splashStats img').count()).toBe(0);
    const statsTxt = await page.locator('#splashStats').innerText();
    expect(statsTxt).not.toContain('<img');
    // Positive half: the non-finite value must degrade to the placeholder, not vanish silently.
    expect(statsTxt).toContain('—');
  });

  test('C1: a hostile genie hand-off name reaches the builder as *text*', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('cb-genie-handoff-v1', JSON.stringify({
      v: 1, src: 'cb-genie', route: 'express', app: 'app', service: 'torbox', device: 'firestick',
      content: 'movies', name: '<img src=x onerror="window.__pwn=1">', ts: Date.now(),
    })));
    await page.goto('/');
    await expect(page.locator('#expressLaneModal')).toBeVisible({ timeout: 10000 });
    const pwn = await page.evaluate(() => window.__pwn || null);
    expect(pwn).toBeNull();
    // the sanitizer stripped the markup from state; the name renders nowhere as an element
    expect(await page.locator('#expressLaneModal img[src="x"]').count()).toBe(0);
  });

  test('C3: a remote error object renders a reason message, never markup or [object Object]', async ({ page }) => {
    test.setTimeout(240_000); // worst-case chain of the explicit gates below (~160s); spent only on failure
    // Flake fix (#738, quarantine #682): the old body raced hydration in three places — a fixed
    // 900 ms sleep after reload, a dialog handler attached after navigation, and a fixed 600 ms
    // sleep for the error render. All replaced by explicit gates below. The security assertions
    // and the userPosts proof-of-route are unchanged — do not loosen them.
    let userPosts = 0;
    await page.route('**/*', async route => {
      const url = route.request().url();
      if (url.includes('/api/v1/status')) {
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { version: '2.32.1' } }) });
      }
      if (url.includes('/api/v1/user') && route.request().method() === 'POST') {
        userPosts++;
        // Structured error object, the shape that used to render as "[object Object]",
        // carrying markup that must never reach the DOM as HTML.
        return route.fulfill({ status: 500, contentType: 'application/json',
          body: JSON.stringify({ error: { message: '<b onmouseover="window.__pwn=1">nope</b>' } }) });
      }
      if (url.includes('core-builds-cors-proxy')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
      return route.continue();
    });

    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
    page.on('dialog', dialog => dialog.accept()); // attached before reload: an early native confirm
    // must be answered by the handler, never silently auto-dismissed by the browser default.
    await page.reload();

    // A painted-but-not-yet-hydrated button accepts clicks into the void; gate the open on the
    // lane modal actually rendering (same container C1 uses), retrying until the binding is live.
    await expect(page.locator('[data-action="open-express-lane"]')).toBeVisible({ timeout: 15000 });
    await expect(async () => {
      await page.locator('[data-action="open-express-lane"]').click();
      await expect(page.locator('#expressLaneModal')).toBeVisible({ timeout: 2500 });
    }).toPass({ timeout: 20000 });
    await page.locator('[data-express-cred="torbox"]').fill('test-torbox-key');
    await page.locator('#stremioEmailInline').fill('test@stremio.com');
    await page.locator('#stremioPasswordInline').fill('test-password');
    await page.locator('#expressGo').click();
    // #pwdPrompt appears only after the app's async validation round-trip — gate on it.
    // Conditional on purpose: when this origin already holds a stored token (an
    // earlier spec in this file clicked .pwd-go), the app legitimately skips the
    // prompt and proceeds — accepting that path keeps the check deterministic;
    // a regression that produces NEITHER prompt nor progress still times out red.
    await expect.poll(async () => {
      const prompt = page.locator('#pwdPrompt');
      if (await prompt.isVisible().catch(() => false)) {
        await prompt.locator('.pwd-go').click();
        return true;
      }
      return userPosts > 0;
    }, { timeout: 60000, intervals: [500] }).toBe(true);
    await expect.poll(() => userPosts, { timeout: 45000 }).toBeGreaterThan(0);

    // The sink was actually reached — now it must be inert and legible.
    //
    // Assert on ELEMENT CREATION, not on the substring "onmouseover=": the app ships 27 of
    // its own inline hover handlers, so a substring check matches benign markup and tells
    // us nothing. Injection means the payload became a real element — that is what to test.
    expect(await page.evaluate(() => window.__pwn || null)).toBeNull();
    expect(await page.locator('b[onmouseover]').count()).toBe(0);

    // Inertness alone is not enough: assertions that only say "nothing executed" would also
    // pass if the UI swallowed the remote reason and showed a bare fallback. Require the
    // reason to survive as TEXT — poll until it renders (replaces the fixed 600 ms sleep),
    // so safety and legibility are pinned together.
    await expect
      .poll(async () => page.evaluate(() => document.body.innerText), { timeout: 20000 })
      .toContain('nope');
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toContain('[object Object]');
    expect(text).toContain('nope');
  });

});
