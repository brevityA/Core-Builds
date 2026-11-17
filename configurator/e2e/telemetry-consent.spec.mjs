/**
 * Behavioural E2E suite for opt-in usage telemetry consent (Full Review + Quick Start).
 *
 * Covers:
 * - Full Review: default unchecked & visible placement above Export (outside
 *   collapsed Customize), check/uncheck persistence across reload, clean-preflight
 *   Export payload & zero key leaks, explicit blocker-modal Export path, unrelated
 *   Review actions silent, Web Vitals negative & positive (deterministic
 *   ?cb-e2e=1 hook), and paste upload working with consent off.
 * - Quick Start (`simpleMode`): default unchecked, visible placement immediately
 *   before install/export actions (outside collapsed Fine-tune), keyboard check
 *   and uncheck persistence across reload, clean-preflight Export with consent
 *   sending exactly one /api/generate with unchanged payload, and Export without
 *   consent sending zero counter requests.
 */

import { test, expect } from '@playwright/test';

const COUNTER_HOST = 'core-builds-cors-proxy.tlorenzato26.workers.dev';
const PASTE_URL = `https://${COUNTER_HOST}/t/telemetry-paste-ok`;

const CONSENT_WORDING =
  'Share basic usage statistics with the project: page visits and downloads, '
  + 'including service, device and resolution. No API keys, account names, or '
  + 'full configuration are sent.';

const CLEAN_STATE = {
  _schema: 6,
  multiServices: ['torbox-pro'],
  device: 'generic',
  resolution: '4k',
  audio: 'limited',
  content: 'all',
  cacheMode: 'mixed',
  outputProfile: 'stable',
  aiostreamsVersion: '2.31.1',
  creds: { torbox: 'dummy-tb-test-key-000' },
};

const BLOCKED_STATE = {
  _schema: 6,
  multiServices: ['torbox-pro'],
  device: 'generic',
  resolution: '1080p',
  audio: 'limited',
  content: 'all',
  cacheMode: 'mixed',
  outputProfile: 'stable',
  aiostreamsVersion: '2.31.1',
  creds: {},
};

const QUICK_START_CLEAN_STATE = {
  ...CLEAN_STATE,
  simpleMode: true,
  quickStart: true,
  installMode: 'manifest',
};

const QUICK_START_STATE = {
  ...QUICK_START_CLEAN_STATE,
};

async function attachCounterSpy(page) {
  const rec = {
    stats: [],
    visit: [],
    generate: [],
    rootPost: [],
    allCounter: [],
  };
  await page.route(`https://${COUNTER_HOST}/**`, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const method = req.method();
    if (u.pathname === '/paste' || u.pathname.startsWith('/t/')) {
      return route.fallback();
    }
    const entry = {
      url: req.url(),
      path: u.pathname,
      method,
      body: req.postData() || null,
    };
    if (u.pathname === '/api/stats') {
      rec.stats.push(entry);
      rec.allCounter.push(entry);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ visits: 4211, generates: 987 }),
      });
    }
    if (u.pathname === '/api/visit') {
      rec.visit.push(entry);
      rec.allCounter.push(entry);
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    if (u.pathname === '/api/generate') {
      rec.generate.push(entry);
      rec.allCounter.push(entry);
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    if (u.pathname === '/' && method === 'POST') {
      rec.rootPost.push(entry);
      rec.allCounter.push(entry);
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    rec.allCounter.push(entry);
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  return rec;
}

async function reloadAndSettle(page, rec, { expectVisit = false } = {}) {
  const prevStats = rec.stats.length;
  const prevVisit = rec.visit.length;
  const statsReqPromise = page.waitForRequest(
    req => new URL(req.url()).hostname === COUNTER_HOST && new URL(req.url()).pathname === '/api/stats',
  );
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__coreBuilds));
  await statsReqPromise;
  await expect.poll(() => rec.stats.length).toBeGreaterThan(prevStats);
  if (expectVisit) {
    await expect.poll(() => rec.visit.length).toBeGreaterThan(prevVisit);
  }
}

async function fresh(page, rec, state, { query = '?cb-e2e=1', savedStep = '6', expectVisit = false, cbFlags = '' } = {}) {
  await page.goto(`/${query}`);
  await page.evaluate(([s, step, flags]) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cb_tut_seen', '1');
    if (flags) localStorage.setItem('cb-flags', flags);
    if (s) localStorage.setItem('coreBuild', JSON.stringify(s));
    if (step !== null && step !== undefined) localStorage.setItem('coreBuildStep', String(step));
  }, [state, savedStep, cbFlags]);
  await reloadAndSettle(page, rec, { expectVisit });
}

async function goReview(page) {
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.btn-dl')).toBeVisible();
}

async function goQuickStartReview(page) {
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('#btnAio')).toBeVisible();
}

function visibleConsentControl(page) {
  const cb = page.locator('input[type="checkbox"][data-action="toggle-telemetry"]');
  const label = page.locator('label:has(input[data-action="toggle-telemetry"])');
  return { cb, label };
}

async function assertConsentLayout(page, targetSelector) {
  const { cb, label } = visibleConsentControl(page);
  await expect(cb).toHaveCount(1);
  await expect(cb).toBeVisible();
  await expect(label).toBeVisible();
  await expect(label).toContainText(CONSENT_WORDING);

  const insideDetails = await label.evaluate(el => Boolean(el.closest('details')));
  expect(insideDetails).toBe(false);

  const boxInfo = await label.evaluate((lbl, targetSel) => {
    const target = document.querySelector(targetSel);
    if (!target) return null;
    const lRect = lbl.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const vw = window.innerWidth;
    return {
      labelBottom: lRect.bottom,
      targetTop: tRect.top,
      labelLeft: lRect.left,
      labelRight: lRect.right,
      vw,
      labelHeight: lRect.height,
      labelWidth: lRect.width,
    };
  }, targetSelector);
  expect(boxInfo).not.toBeNull();
  expect(boxInfo.labelWidth).toBeGreaterThan(100);
  expect(boxInfo.labelHeight).toBeGreaterThan(15);
  expect(boxInfo.labelLeft).toBeGreaterThanOrEqual(0);
  expect(boxInfo.labelRight).toBeLessThanOrEqual(boxInfo.vw + 1);
  expect(boxInfo.labelBottom).toBeLessThanOrEqual(boxInfo.targetTop + 1);
}

// ── Full Review Tests (9) ──────────────────────────────────────────────────

test('default state is unchecked, visible above Export outside collapsed Customize, approved wording, ZERO outbound counter requests', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, CLEAN_STATE);
  await goReview(page);

  const { cb } = visibleConsentControl(page);
  await expect(cb).not.toBeChecked();
  await assertConsentLayout(page, '.btn-dl');

  const customizeDetails = page.locator('details.rv-section:has(summary:has-text("Customize"))');
  await expect(customizeDetails).toBeVisible();
  expect(await customizeDetails.getAttribute('open')).toBeNull();
  await expect(customizeDetails.locator('input[data-action="toggle-telemetry"]')).toHaveCount(0);

  expect(rec.visit).toEqual([]);
  expect(rec.generate).toEqual([]);
  expect(rec.rootPost).toEqual([]);
});

test('checking consent persists across reload and sends /api/visit on opted-in reload', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, CLEAN_STATE);
  await goReview(page);

  const { cb } = visibleConsentControl(page);
  await expect(cb).not.toBeChecked();
  await cb.check();
  await expect(cb).toBeChecked();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild') || '{}'));
  expect(stored.telemetryOk).toBe(true);

  await reloadAndSettle(page, rec, { expectVisit: true });
  expect(rec.visit).toHaveLength(1);

  await goReview(page);
  await expect(visibleConsentControl(page).cb).toBeChecked();
});

test('unchecking persisted consent persists across reload and stops outbound counter requests', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, { ...CLEAN_STATE, telemetryOk: true }, { expectVisit: true });
  expect(rec.visit).toHaveLength(1);
  await goReview(page);

  const { cb } = visibleConsentControl(page);
  await expect(cb).toBeChecked();
  await cb.uncheck();
  await expect(cb).not.toBeChecked();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild') || '{}'));
  expect(stored.telemetryOk).toBe(false);

  const visitsBefore = rec.visit.length;
  await reloadAndSettle(page, rec, { expectVisit: false });
  expect(rec.visit).toHaveLength(visitsBefore);
  await goReview(page);
  await expect(visibleConsentControl(page).cb).not.toBeChecked();
});

test('clean-preflight Export with consent sends exactly one /api/generate with unchanged payload and no key leak', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, CLEAN_STATE);
  await goReview(page);

  const { cb } = visibleConsentControl(page);
  await cb.check();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.btn-dl').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  await expect(page.locator('#preflightModal')).toHaveCount(0);

  await expect.poll(() => rec.generate.length).toBe(1);
  const rawBody = rec.generate[0].body;
  const payload = JSON.parse(rawBody);
  expect(Object.keys(payload).sort()).toEqual(['device', 'resolution', 'service', 'v']);
  expect(payload).toMatchObject({
    service: 'torbox-pro',
    device: 'generic',
    resolution: '4k',
  });
  expect(typeof payload.v).toBe('string');
  expect(rawBody).not.toContain('dummy-tb-test-key-000');
});

test('blocked-preflight Export modal path still gates /api/generate on consent', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, BLOCKED_STATE);
  await goReview(page);

  await expect(visibleConsentControl(page).cb).not.toBeChecked();
  await page.locator('.btn-dl').click();
  await expect(page.locator('#preflightGo')).toBeVisible();
  const [download1] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#preflightGo').click(),
  ]);
  expect(download1.suggestedFilename()).toMatch(/\.json$/);
  expect(rec.generate).toEqual([]);

  await visibleConsentControl(page).cb.check();
  await page.locator('.btn-dl').click();
  await expect(page.locator('#preflightGo')).toBeVisible();
  const [download2] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#preflightGo').click(),
  ]);
  expect(download2.suggestedFilename()).toMatch(/\.json$/);
  await expect.poll(() => rec.generate.length).toBe(1);
});

test('unrelated Review actions send zero counter requests when consent is off', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, CLEAN_STATE);
  await goReview(page);

  const customizeDetails = page.locator('details.rv-section:has(summary:has-text("Customize"))');
  await customizeDetails.locator('summary.rv-section-hdr').click();
  await expect(customizeDetails).toHaveAttribute('open', '');

  await page.locator('.size-btn', { hasText: '20GB' }).click();
  expect(rec.visit).toEqual([]);
  expect(rec.generate).toEqual([]);
  expect(rec.rootPost).toEqual([]);
});

test('Web Vitals negative: armed webVitals=1 flag with consent off sends zero beacons', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, CLEAN_STATE, { cbFlags: 'webVitals=1' });
  await goReview(page);

  await expect.poll(() => page.evaluate(() => window.__coreBuilds.webVitalsReady())).toBe(true);
  const fired = await page.evaluate(() => window.__coreBuilds.webVitalsSend('LCP', 1234));
  expect(fired).toBe(true);
  expect(rec.rootPost).toEqual([]);
  expect(rec.visit).toEqual([]);
  expect(rec.generate).toEqual([]);
});

test('Web Vitals positive: checking consent + deterministic webVitalsSend hook sends exact web-vital payload to COUNTER_URL root', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, CLEAN_STATE, { cbFlags: 'webVitals=1' });
  await goReview(page);

  await expect.poll(() => page.evaluate(() => window.__coreBuilds.webVitalsReady())).toBe(true);
  await visibleConsentControl(page).cb.check();

  const fired = await page.evaluate(() => window.__coreBuilds.webVitalsSend('LCP', 1420));
  expect(fired).toBe(true);

  await expect.poll(() => rec.rootPost.length).toBe(1);
  const body = JSON.parse(rec.rootPost[0].body);
  expect(Object.keys(body).sort()).toEqual(['name', 't', 'ts', 'v', 'value']);
  expect(body.t).toBe('web-vital');
  expect(body.name).toBe('LCP');
  expect(body.value).toBe(1420);
  expect(typeof body.v).toBe('string');
  expect(typeof body.ts).toBe('number');
});

test('paste upload still works with consent off without sending any counter request', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  let pastePosts = 0;
  await page.route(`https://${COUNTER_HOST}/paste`, async (route) => {
    pastePosts++;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: PASTE_URL }),
    });
  });
  await page.route(PASTE_URL, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });

  await fresh(page, rec, CLEAN_STATE);
  await goReview(page);
  await expect(visibleConsentControl(page).cb).not.toBeChecked();

  await page.locator('#btnImport').click();
  await expect.poll(() => pastePosts).toBe(1);
  await expect(page.locator('#importUrlResult')).toContainText(PASTE_URL);

  expect(rec.visit).toEqual([]);
  expect(rec.generate).toEqual([]);
  expect(rec.rootPost).toEqual([]);
});

// ── Quick Start Tests (5) ──────────────────────────────────────────────────

test('Quick Start: default unchecked, accessible label, no collapsed section, ZERO counter requests', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, QUICK_START_STATE);
  await goQuickStartReview(page);

  const { cb } = visibleConsentControl(page);
  await expect(cb).not.toBeChecked();
  await assertConsentLayout(page, '#btnAio');

  expect(rec.visit).toEqual([]);
  expect(rec.generate).toEqual([]);
  expect(rec.rootPost).toEqual([]);
});

test('Quick Start: checking by keyboard persists across reload', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, QUICK_START_STATE);
  await goQuickStartReview(page);

  const { cb } = visibleConsentControl(page);
  await expect(cb).not.toBeChecked();
  await cb.focus();
  await page.keyboard.press('Space');
  await expect(cb).toBeChecked();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild') || '{}'));
  expect(stored.telemetryOk).toBe(true);

  await reloadAndSettle(page, rec, { expectVisit: true });
  expect(rec.visit).toHaveLength(1);
  await goQuickStartReview(page);
  await expect(visibleConsentControl(page).cb).toBeChecked();
});

test('Quick Start: unchecking by keyboard persists across reload', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, { ...QUICK_START_STATE, telemetryOk: true }, { expectVisit: true });
  expect(rec.visit).toHaveLength(1);
  await goQuickStartReview(page);

  const { cb } = visibleConsentControl(page);
  await expect(cb).toBeChecked();
  await cb.focus();
  await page.keyboard.press('Space');
  await expect(cb).not.toBeChecked();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('coreBuild') || '{}'));
  expect(stored.telemetryOk).toBe(false);

  const visitsBefore = rec.visit.length;
  await reloadAndSettle(page, rec, { expectVisit: false });
  expect(rec.visit).toHaveLength(visitsBefore);
  await goQuickStartReview(page);
  await expect(visibleConsentControl(page).cb).not.toBeChecked();
});

test('Quick Start: export with consent sends exactly one /api/generate with the unchanged payload', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, QUICK_START_CLEAN_STATE);
  await goQuickStartReview(page);

  await visibleConsentControl(page).cb.check();
  const exportBtn = page.locator('button[data-action="generate-dl"]');
  await expect(exportBtn).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportBtn.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  await expect(page.locator('#preflightModal')).toHaveCount(0);

  await expect.poll(() => rec.generate.length).toBe(1);
  const rawBody = rec.generate[0].body;
  const payload = JSON.parse(rawBody);
  expect(Object.keys(payload).sort()).toEqual(['device', 'resolution', 'service', 'v']);
  expect(payload).toMatchObject({
    service: 'torbox-pro',
    device: 'generic',
    resolution: '4k',
  });
  expect(typeof payload.v).toBe('string');
  expect(rawBody).not.toContain('dummy-tb-test-key-000');
});

test('Quick Start: export without consent sends NO counter request', async ({ page }) => {
  const rec = await attachCounterSpy(page);
  await fresh(page, rec, QUICK_START_CLEAN_STATE);
  await goQuickStartReview(page);

  const { cb } = visibleConsentControl(page);
  await expect(cb).not.toBeChecked();
  const exportBtn = page.locator('button[data-action="generate-dl"]');
  await expect(exportBtn).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportBtn.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  expect(rec.visit).toEqual([]);
  expect(rec.generate).toEqual([]);
  expect(rec.rootPost).toEqual([]);
});
