import { test, expect } from '@playwright/test';

// Landing information architecture, end to end:
//   1. Express Install is the ONE primary door and renders first.
//   2. Advanced Builder and Update Existing Setup are small tertiary buttons
//      on the same door row — discoverable, not competing with Install.
//   3. The Setup Genie has no door on the landing anymore (its route still
//      works; it is simply not a first-class entry point).
//   4. Deep links land where they promise: #express → Express lane modal,
//      #advanced → wizard step 1, #update → Update Existing Setup modal.
// The page badge/stamps are covered by tests/version-consistency.test.mjs.

test.describe.configure({ retries: 2 });

const CORS_NOISE = /core-builds-cors-proxy.*\/api\/stats|Access-Control-Allow-Origin.*core-builds-cors-proxy|net::ERR_FAILED.*core-builds-cors-proxy|^Failed to load resource: net::ERR_(?:FAILED|CONNECTION_CLOSED|ERR_BLOCKED_BY_CLIENT)$|^Failed to load resource: net::ERR_|favicon|404 \(Not Found\)|Failed to load resource: the server responded with a status of 404|Access to fetch at '[^']*\/api\/v1\/status'[^\n]*blocked by CORS|\/api\/v1\/status[^\n]*(?:blocked by CORS|net::ERR_FAILED)/;

async function fresh(page, path = '/') {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !CORS_NOISE.test(message.text())) errors.push(message.text()); });
  await page.goto(path);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForTimeout(950);
  return errors;
}

test('Express is the primary, first door with a version callout; Advanced and Update are tertiary', async ({ page }) => {
  const errors = await fresh(page);
  const doors = page.locator('#splashDoors');

  // Express is the only door-style action in the workflow row…
  await expect(doors.locator('.splash-door')).toHaveCount(1);
  const express = doors.locator('[data-action="open-express-lane"]');
  await expect(express).toBeVisible();
  await expect(express).toContainText('Express Install');
  // …rendered before the tertiary beat.
  const expressBox = await express.boundingBox();
  const tertiary = doors.locator('.splash-tertiary');
  const tertiaryBox = await tertiary.boundingBox();
  expect(expressBox.y, 'Express door must render above the tertiary row').toBeLessThan(tertiaryBox.y);

  // Advanced + Update are subdued tertiary buttons on the same row.
  const tertiaryButtons = tertiary.locator('.splash-tertiary-btn');
  await expect(tertiaryButtons).toHaveCount(2);
  await expect(tertiary.nth(0).locator('[data-action="custom-start"]')).toContainText('Advanced');
  await expect(tertiary.nth(0).locator('[data-action="update-template"]')).toContainText('Update');

  // The Setup Genie is no longer a landing door (route still exists).
  await expect(page.locator('a.splash-door[href="../tools/genies/"]')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('the three landing doors all open their flow', async ({ page }) => {
  const errors = await fresh(page);

  await page.locator('#splashDoors [data-action="open-express-lane"]').click();
  await expect(page.locator('#expressLaneModal')).toBeVisible();
  // The Express flow calls out which AIOStreams version it targets: every host
  // option label carries its (vX.Y.Z), so the choice is never a blind "Auto".
  const hostOptions = page.locator('#expressHost option');
  expect(await hostOptions.count(), 'express host picker must have options').toBeGreaterThan(1);
  for (let i = 0; i < await hostOptions.count(); i++) {
    const label = await hostOptions.nth(i).textContent();
    // "Auto" picks the winner at probe time; "Custom / self-hosted" runs a URL
    // you supply — both are versioned only when probed. Registry hosts below.
    if (/^Auto |^Custom \/ self-hosted/.test(label)) continue;
    expect(label, `host option "${label}" must name its AIOStreams version`).toMatch(/v2\.\d+\.\d+/);
  }
  await page.locator('#expressClose').click();
  await expect(page.locator('#expressLaneModal')).toHaveCount(0);

  await page.locator('#splashDoors [data-action="custom-start"]').click();
  await expect(page.locator('label[for="o_torbox-pro"]')).toBeVisible();

  await page.reload();
  await page.waitForTimeout(950);
  await page.locator('#splashDoors [data-action="update-template"]').click();
  await expect(page.locator('#updateTplModal')).toBeVisible();

  expect(errors).toEqual([]);
});

test('deep links land in their flows: #express, #advanced, #update', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !CORS_NOISE.test(message.text())) errors.push(message.text()); });

  await page.goto('/?cb-e2e=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  // Deep links resolve at boot (handleDeepLink), so each check needs a real
  // navigation — sequence the links so every URL differs outside the hash.
  await page.goto('/#express');
  await page.waitForTimeout(1200);
  await expect(page.locator('#expressLaneModal')).toBeVisible();
  await page.locator('#expressClose').click();

  await page.goto('about:blank');
  await page.goto('/?cb-e2e=1#advanced');
  await page.waitForTimeout(1200);
  await expect(page.locator('label[for="o_torbox-pro"]')).toBeVisible();

  await page.goto('about:blank');
  await page.goto('/#update');
  await page.waitForTimeout(1200);
  await expect(page.locator('#updateTplModal')).toBeVisible();

  expect(errors).toEqual([]);
});
