import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = 'file://' + path.resolve(__dirname, '..', 'index.html');

const FIXTURE = [
  { manifest: { id: 'torrentio', name: 'Torrentio', version: '1.0', types: ['movie'], resources: ['stream'] }, transportUrl: 'https://torrentio.example.com/manifest.json', flags: {} },
  { manifest: { id: 'comet', name: 'Comet', version: '1.0', types: ['movie'], resources: ['stream'] }, transportUrl: 'https://comet.example.com/manifest.json', flags: {} },
  { manifest: { id: 'cinemeta', name: 'Cinemeta', version: '1.0', types: ['movie'], resources: ['meta'] }, transportUrl: 'https://cinemeta.example.com/manifest.json', flags: {} },
];

async function setupRoutes(page, options = {}) {
  const setCalls = [];
  let serverAddons = JSON.parse(JSON.stringify(options.addons || FIXTURE));
  const shouldFailSet = options.failSet || false;

  await page.route('https://api.strem.io/api/**', async (route) => {
    const url = route.request().url();
    const body = route.request().postDataJSON();

    if (url.includes('login')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { authKey: 'TEST_AUTH_KEY' } }),
      });
    }

    if (url.includes('addonCollectionGet')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { addons: JSON.parse(JSON.stringify(serverAddons)) } }),
      });
    }

    if (url.includes('addonCollectionSet')) {
      if (shouldFailSet) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server write failed' }),
        });
      }
      setCalls.push(JSON.parse(JSON.stringify(body.addons)));
      serverAddons = JSON.parse(JSON.stringify(body.addons));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: true }),
      });
    }

    return route.fulfill({ status: 404, body: 'Not found' });
  });

  return {
    setCalls,
    getServerAddons: () => serverAddons,
    setServerAddons: (a) => { serverAddons = JSON.parse(JSON.stringify(a)); },
  };
}

async function loginViaAuthKey(page) {
  await page.click('.tab[data-tab="authkey-tab"]');
  await page.fill('#authkey', 'TEST_AUTH_KEY');
  await page.click('#loginKey');
  await expect(page.locator('#addon-list .addon')).toHaveCount(3);
}

test.describe('mutations', () => {

  test('reorder success — move first addon down', async ({ page }) => {
    const { setCalls } = await setupRoutes(page);
    await page.goto(PAGE_PATH);
    await loginViaAuthKey(page);

    page.on('dialog', async (d) => d.accept());

    const moveDownBtn = page.locator('[data-move="down"][data-idx="0"]');
    await moveDownBtn.click();

    await expect(page.locator('#status')).toContainText(/moved|Undo/i, { timeout: 5000 });
    expect(setCalls.length).toBeGreaterThanOrEqual(1);
    expect(setCalls[0][0].manifest.id).toBe('comet');
    expect(setCalls[0][1].manifest.id).toBe('torrentio');
    expect(setCalls[0][2].manifest.id).toBe('cinemeta');
  });

  test('undo reorder restores original order', async ({ page }) => {
    const { setCalls } = await setupRoutes(page);
    await page.goto(PAGE_PATH);
    await loginViaAuthKey(page);

    page.on('dialog', async (d) => d.accept());

    await page.locator('[data-move="down"][data-idx="0"]').click();
    await expect(page.locator('#undo-card')).toBeVisible({ timeout: 5000 });

    await page.click('#undoBtn');
    await expect(page.locator('#status')).toContainText(/undo complete|restored/i, { timeout: 5000 });

    expect(setCalls.length).toBeGreaterThanOrEqual(2);
    const undoCall = setCalls[setCalls.length - 1];
    expect(undoCall[0].manifest.id).toBe('torrentio');
    expect(undoCall[1].manifest.id).toBe('comet');
    expect(undoCall[2].manifest.id).toBe('cinemeta');
  });

  test('remove addon — confirm removal', async ({ page }) => {
    const { setCalls } = await setupRoutes(page);
    await page.goto(PAGE_PATH);
    await loginViaAuthKey(page);

    page.on('dialog', async (d) => d.accept());

    const removeBtn = page.locator('[data-remove="1"]');
    await removeBtn.click();

    await expect(page.locator('#status')).toContainText(/removed|Undo/i, { timeout: 5000 });
    expect(setCalls.length).toBeGreaterThanOrEqual(1);
    const setCall = setCalls[0];
    expect(setCall.length).toBe(2);
    expect(setCall[0].manifest.id).toBe('torrentio');
    expect(setCall[1].manifest.id).toBe('cinemeta');
  });

  test('cancel remove — dismiss confirm, no mutation', async ({ page }) => {
    const { setCalls } = await setupRoutes(page);
    await page.goto(PAGE_PATH);
    await loginViaAuthKey(page);

    page.on('dialog', async (d) => d.dismiss());

    const removeBtn = page.locator('[data-remove="1"]');
    await removeBtn.click();

    // Give a moment for any potential call
    await page.waitForTimeout(500);
    expect(setCalls.length).toBe(0);
  });

  test('restore backup — upload and confirm', async ({ page }) => {
    const { setCalls } = await setupRoutes(page);
    await page.goto(PAGE_PATH);
    await loginViaAuthKey(page);

    page.on('dialog', async (d) => d.accept());

    const backup = {
      version: 1,
      addons: [
        { manifest: { id: 'newaddon', name: 'NewAddon', version: '1.0', types: ['movie'], resources: ['stream'] }, transportUrl: 'https://newaddon.example.com/manifest.json', flags: {} },
      ],
    };

    const tmpFile = path.join(os.tmpdir(), 'test-backup-' + Date.now() + '.json');
    fs.writeFileSync(tmpFile, JSON.stringify(backup));

    try {
      const fileInput = page.locator('#restoreFile');
      await fileInput.setInputFiles(tmpFile);

      await expect(page.locator('#status')).toContainText(/restored|Undo/i, { timeout: 5000 });
      expect(setCalls.length).toBeGreaterThanOrEqual(1);
      expect(setCalls[0].length).toBe(1);
      expect(setCalls[0][0].manifest.id).toBe('newaddon');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('cancel restore — dismiss confirm, no mutation', async ({ page }) => {
    const { setCalls } = await setupRoutes(page);
    await page.goto(PAGE_PATH);
    await loginViaAuthKey(page);

    page.on('dialog', async (d) => d.dismiss());

    const backup = {
      version: 1,
      addons: [
        { manifest: { id: 'newaddon', name: 'NewAddon', version: '1.0', types: ['movie'], resources: ['stream'] }, transportUrl: 'https://newaddon.example.com/manifest.json', flags: {} },
      ],
    };

    const tmpFile = path.join(os.tmpdir(), 'test-backup-cancel-' + Date.now() + '.json');
    fs.writeFileSync(tmpFile, JSON.stringify(backup));

    try {
      const fileInput = page.locator('#restoreFile');
      await fileInput.setInputFiles(tmpFile);

      await page.waitForTimeout(500);
      expect(setCalls.length).toBe(0);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('write failure — move shows error', async ({ page }) => {
    await setupRoutes(page, { failSet: true });
    await page.goto(PAGE_PATH);
    await loginViaAuthKey(page);

    page.on('dialog', async (d) => d.accept());

    await page.locator('[data-move="down"][data-idx="0"]').click();

    await expect(page.locator('#status')).toContainText(/failed|error/i, { timeout: 5000 });
  });

  test('reload verification — undo available after successful write', async ({ page }) => {
    const ctx = await setupRoutes(page);
    await page.goto(PAGE_PATH);
    await loginViaAuthKey(page);

    page.on('dialog', async (d) => d.accept());

    await page.locator('[data-move="down"][data-idx="0"]').click();

    await expect(page.locator('#status')).toContainText(/moved|Undo/i, { timeout: 5000 });
    await expect(page.locator('#undo-card')).toBeVisible();
  });

  test('stale-state protection — refuses move when server changed', async ({ page }) => {
    const ctx = await setupRoutes(page);
    await page.goto(PAGE_PATH);
    await loginViaAuthKey(page);

    // After login, change server addons so they differ from the UI's currentSnapshot
    const alteredAddons = [
      { manifest: { id: 'changed', name: 'Changed', version: '1.0', types: ['movie'], resources: ['stream'] }, transportUrl: 'https://changed.example.com/manifest.json', flags: {} },
    ];
    ctx.setServerAddons(alteredAddons);

    page.on('dialog', async (d) => d.accept());

    await page.locator('[data-move="down"][data-idx="0"]').click();

    await expect(page.locator('#status')).toContainText(/changed on server|reloading/i, { timeout: 5000 });
    // setCalls should be empty — move was refused
    expect(ctx.setCalls.length).toBe(0);
  });

});
