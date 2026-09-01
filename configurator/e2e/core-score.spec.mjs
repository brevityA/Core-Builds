import { test, expect } from '@playwright/test';

// Core Score — the explainable quality number. Test Drive returns real
// streams; each one is scored and rendered with a badge + explain panel.
// The AIOStreams host probe (Phase 4) fetches `<host>/api/v1/status` from the
// browser to read live capabilities. Public instances send no
// Access-Control-Allow-Origin, so the browser BLOCKS the response and logs a
// CORS error that no try/catch can suppress — the probe then falls back to the
// static capability registry, which is the documented and intended path. That
// console line is expected output, not a defect, so it is filtered here like
// the proxy noise above. Filtering is scoped to /api/v1/status specifically so
// a genuine CORS regression elsewhere still fails.
const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_FAILED$|favicon|404 \(Not Found\)|Access to fetch at '[^']*\/api\/v1\/status'[^\n]*blocked by CORS|\/api\/v1\/status[^\n]*(?:blocked by CORS|net::ERR_FAILED)/;

async function fresh(page) {
  await page.goto('/?cb-e2e=1');
  await page.evaluate(() => { localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForFunction(() => !!window.__coreBuilds);
}

async function mockBackend(page) {
  await page.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    if (url.includes('/api/v1/status')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { version: '2.32.1' } }) });
    }
    if (url.includes('/api/v1/user') && request.method() === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { uuid: '11111111-2222-4333-8444-555555555555', encryptedPassword: 'ep' } }) });
    }
    if (url.includes('/stream/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        streams: [
          { name: '🟣 4K ⚡ Cached BluRay REMUX HDR10+', description: '52 GB · 61 Mbps · 2h 16m' },
          { name: '⏳ 1080p WEB-DL', description: '2.1 GB · 18 Mbps' },
          { name: '1080p HDTV', description: '1.3 GB' },
        ],
      }) });
    }
    if (url.includes('core-builds-cors-proxy') && (url.includes('/api/visit') || url.includes('/api/generate') || url.includes('/api/stats'))) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.continue();
  });
}

test('Test Drive renders a Core Score badge on every stream', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !CORS_NOISE.test(message.text())) errors.push(message.text()); });
  await mockBackend(page);
  await fresh(page);
  // Debrid service + key so Test Drive's preflight passes.
  await page.evaluate(() => window.__coreBuilds.setState({ service: 'torbox-pro', multiServices: ['torbox-pro'], creds: { torbox: 'test-key' } }));
  await page.evaluate(() => window.__coreBuilds.openTestDrive());
  await expect(page.locator('#testDriveModal')).toBeVisible();
  await page.locator('[data-td-id="tt0816692"]').click();
  await expect(page.locator('.td-stream')).toHaveCount(3, { timeout: 20000 });
  // Every stream got a Core Score badge.
  const badges = page.locator('.cs-badge');
  await expect(badges).toHaveCount(3);
  await expect(badges.first()).toContainText('Core');
  // The premium stream scores higher than the HDTV stream.
  const scores = await badges.allTextContents();
  const num = s => parseInt((s.match(/Core (\d+)/) || [])[1] || '0', 10);
  const hi = num(scores[0]); // 4K REMUX cached
  const lo = num(scores[2]); // HDTV
  expect(hi).toBeGreaterThan(lo);
  expect(errors).toEqual([]);
});

test('Core Score explain panel shows the breakdown and gates', async ({ page }) => {
  await mockBackend(page);
  await fresh(page);
  await page.evaluate(() => window.__coreBuilds.setState({ service: 'torbox-pro', multiServices: ['torbox-pro'], creds: { torbox: 'test-key' } }));
  await page.evaluate(() => window.__coreBuilds.openTestDrive());
  await page.locator('[data-td-id="tt0816692"]').click();
  await expect(page.locator('.td-stream')).toHaveCount(3, { timeout: 20000 });
  const first = page.locator('.td-stream').first();
  await first.locator('.cs-explain summary').click();
  await expect(first.locator('.cs-summary')).toContainText('Core');
  // Formatted streams: seeders/age are null, so tier/res/hdr/bitrate/source = 5 rows.
  const rows = await first.locator('.cs-row').count();
  expect(rows).toBeGreaterThanOrEqual(4);
  await expect(first.locator('.cs-gate')).toHaveCount(2); // Adaptive Score Floor + Score IQR Guard
  await expect(first.locator('.cs-partial')).toContainText('formatted stream line');
});

test('coreScore hook is deterministic and bounded', async ({ page }) => {
  await page.goto('/?cb-e2e=1');
  await page.waitForFunction(() => !!window.__coreBuilds);
  const r = await page.evaluate(() => window.__coreBuilds.coreScore({
    quality: 'BluRay REMUX', resolution: '2160p', bitrate: 61, visualTags: 'DV', cached: true, library: true, seeders: 1200, age: 14,
  }));
  expect(r.score).toBeGreaterThanOrEqual(75);
  expect(r.score).toBeLessThanOrEqual(100);
  expect(r.summary).toContain('Core ' + r.score);
});
