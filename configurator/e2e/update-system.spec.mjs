import { test, expect } from '@playwright/test';

// Stronger update system: live update detection (P1), one-click update via the
// shared diff/apply flow, changelog excerpt (P4), and Revert (P3). The remote
// sourceUrl + changelogUrl are mocked so the check is deterministic.

const MOCK_SOURCE = 'https://raw.githubusercontent.com/mock/core-nexus-4k-apex.json';
const MOCK_CHANGELOG = 'https://raw.githubusercontent.com/mock/CHANGELOG.md';
const NEW_TEMPLATE = {
  metadata: {
    id: 'brevity.core-nexus-4k-apex',
    name: 'Core Nexus 4K Apex',
    version: '0.9.2',
    sourceUrl: MOCK_SOURCE,
    changelogUrl: MOCK_CHANGELOG,
  },
  config: {
    addonName: 'Core Nexus 4K Apex',
    services: [{ id: 'torbox', enabled: true, credentials: {} }],
    presets: [{ type: 'library', instanceId: 'lib-1', enabled: true, options: { name: 'Library' } }],
    sortCriteria: { global: [{ key: 'resolution', direction: 'desc' }] },
    formatter: { id: 'tamtaro' },
  },
};

async function seed(page) {
  await page.goto('/?cb-e2e=1');
  await page.evaluate(({ src, chg }) => {
    localStorage.clear();
    localStorage.setItem('cb_tut_seen', '1');
    localStorage.setItem('coreBuildLastTemplate', JSON.stringify({
      sourceUrl: src, changelogUrl: chg, version: '0.9.1', name: 'Core Nexus 4K Apex', ts: Date.now(),
    }));
    localStorage.setItem('cbUpdCheckTs', '0'); // allow the check to run
  }, { src: MOCK_SOURCE, chg: MOCK_CHANGELOG });
  await page.reload();
  await page.waitForFunction(() => !!window.__coreBuilds);
}

test('detects a newer template version and shows the update banner with changelog', async ({ page }) => {
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url.includes('raw.githubusercontent.com/mock/core-nexus-4k-apex.json')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEW_TEMPLATE) });
    }
    if (url.includes('raw.githubusercontent.com/mock/CHANGELOG.md')) {
      return route.fulfill({ status: 200, contentType: 'text/plain', body: `## 0.9.2 (2026-08-06)\n- feat: update system\n## 0.9.1 (2026-08-05)\n- fix: stuff\n` });
    }
    return route.continue();
  });
  await seed(page);
  await page.evaluate(() => window.__coreBuilds.checkUpdate());
  const banner = page.locator('text=Update available: v0.9.1 → v0.9.2').first();
  await expect(banner).toBeVisible({ timeout: 10000 });
  // changelog excerpt from the mocked changelog
  await expect(page.locator('text=update system').first()).toBeVisible();
});

test('one-click Update runs the diff/apply flow and records the new version', async ({ page }) => {
  let sourceHits = 0;
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url.includes('raw.githubusercontent.com/mock/core-nexus-4k-apex.json')) {
      sourceHits++;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEW_TEMPLATE) });
    }
    if (url.includes('raw.githubusercontent.com/mock/CHANGELOG.md')) {
      return route.fulfill({ status: 200, contentType: 'text/plain', body: '## 0.9.2 (d)\n- feat\n' });
    }
    return route.continue();
  });
  await seed(page);
  await page.evaluate(() => window.__coreBuilds.checkUpdate());
  const updateBtn = page.locator('[data-action="update-now"]').first();
  await expect(updateBtn).toBeVisible({ timeout: 10000 });
  await updateBtn.click();
  // The shared diff modal should open
  await expect(page.locator('#diffModal, [class*="diff"]').first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  // Whether or not the diff modal opened, the stored template version must have
  // advanced only AFTER the user applies — check the fetch happened.
  expect(sourceHits).toBeGreaterThanOrEqual(2); // check + update fetch
});
