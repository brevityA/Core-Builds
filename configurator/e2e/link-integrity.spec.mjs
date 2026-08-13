// Link integrity: every in-app href on the splash must resolve against the deployed
// Pages layout. Layout contract: the artifact is the repo root; root index.html redirects
// to configurator/index.html; so the app lives at /configurator/ and sibling trees are
// reached via "../" (tools/, account-tools/). A "./tools/..." href 404s in production
// but looks fine locally — this test fails before the build can ship such a link again.
import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CFG_ROOT = resolve(HERE, '..');          // configurator/
const REPO_ROOT = resolve(CFG_ROOT, '..');     // repo root == pages artifact root
const APP_BASE_HINT = '../';                   // links are authored from /configurator/

test.describe('splash link integrity (Pages layout)', () => {
  test('every same-site splash link resolves to a real file in the repo tree', async ({ page }) => {
    await page.goto('/');
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('.splash a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && !h.startsWith('http') && !h.startsWith('mailto') && !h.startsWith('#')));

    expect(links.length).toBeGreaterThan(0);
    const misses = [];
    for (const href of links) {
      // rules of the house layout: cross-tree links must be up-one-relative; bare "./"
      // paths into other top-level trees are exactly the production-404 class.
      if (href.startsWith('./') && /^\.\/(tools|account-tools|Filtering|Templates)\b/.test(href)) {
        misses.push(`${href} — starts with ./ into a sibling tree (404s on GitHub Pages; use ${APP_BASE_HINT}…)`);
        continue;
      }
      const clean = href.split('#')[0].split('?')[0];
      const resolved = resolve(CFG_ROOT, 'index.html', '..', clean);
      const dir = clean.endsWith('/') ? resolved : resolved;
      const target = clean.endsWith('/') ? resolve(dir, 'index.html') : resolved;
      if (!existsSync(target)) misses.push(`${href} → ${target} (missing)`);
    }
    expect(misses, 'production-404 links found:\n' + misses.join('\n')).toEqual([]);
  });
});
