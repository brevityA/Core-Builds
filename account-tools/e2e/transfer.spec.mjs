import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = 'file://' + path.resolve(__dirname, '..', 'index.html');
const clone = v => JSON.parse(JSON.stringify(v));

const CINEMETA = { manifest: { id: 'com.linvo.cinemeta', name: 'Cinemeta' }, transportUrl: 'https://v3-cinemeta.strem.io/manifest.json', flags: { official: true, protected: true } };
const MINE = [CINEMETA, { manifest: { id: 'torrentio', name: 'Torrentio' }, transportUrl: 'https://torrentio.example.com/manifest.json', flags: {} }];
const OTHER = [CINEMETA, { manifest: { id: 'comet', name: 'Comet' }, transportUrl: 'https://comet.example.com/manifest.json', flags: {} }];

const manifestFor = id => ({ id, name: id, version: '1.0.0', resources: ['stream'], types: ['movie'] });

async function setup(page) {
  // Addon hosts: each serves its manifest with CORS, as Stremio requires.
  await page.route(/^https:\/\/(new|kids|nuvio-default|comet|broken)\.example\.com\/.*manifest\.json$/, route => {
    const host = new URL(route.request().url()).hostname.split('.')[0];
    if (host === 'broken') return route.fulfill({ status: 500, body: 'down' });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(manifestFor(host)) });
  });
  const state = { mine: clone(MINE), other: clone(OTHER), stremioSets: [], nuvio: { 1: [{ url: 'https://nuvio-default.example.com/manifest.json', name: 'Default', enabled: true, sort_order: 0 }], 2: [] }, nuvioPushes: [], nuvioAuth: [] };
  await page.route('https://api.strem.io/api/**', async route => {
    const url = route.request().url();
    const body = route.request().postDataJSON();
    const ok = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.includes('/login')) return ok({ result: { authKey: body.email === 'other@example.com' ? 'OTHER_KEY' : 'MY_KEY' } });
    if (url.includes('addonCollectionGet')) return ok({ result: { addons: clone(body.authKey === 'OTHER_KEY' ? state.other : state.mine) } });
    if (url.includes('addonCollectionSet')) {
      if (body.authKey !== 'MY_KEY') return ok({ error: 'the source account must never be written' });
      state.stremioSets.push(clone(body.addons)); state.mine = clone(body.addons); return ok({ result: true });
    }
    return route.fulfill({ status: 404, body: 'nope' });
  });
  await page.route('https://api.nuvio.tv/**', async route => {
    const req = route.request();
    const url = req.url();
    const headers = req.headers();
    const json = (status, data) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: data === undefined ? '' : JSON.stringify(data) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'apikey,authorization,content-type', 'access-control-allow-methods': 'GET,POST' } });
    if (!headers.apikey?.startsWith('sb_publishable_')) return json(401, { msg: 'no apikey' });
    if (url.includes('/auth/v1/token')) {
      const b = req.postDataJSON();
      state.nuvioAuth.push(b.email);
      return b.password === 'nuvio-pass' ? json(200, { access_token: 'NUVIO_TOKEN' }) : json(400, { msg: 'Invalid login credentials' });
    }
    if (headers.authorization !== 'Bearer NUVIO_TOKEN') return json(401, { msg: 'JWT expired' });
    if (url.includes('/rpc/sync_pull_profiles')) return json(200, [{ profile_index: 1, name: 'Main', uses_primary_addons: false }, { profile_index: 2, name: 'Kids', uses_primary_addons: false }, { profile_index: 3, name: 'Guest', uses_primary_addons: true }]);
    if (url.includes('/rest/v1/addons')) {
      const pid = Number(new URL(url).searchParams.get('profile_id').replace('eq.', ''));
      return json(200, clone(state.nuvio[pid] || []).map(r => ({ ...r, profile_id: pid })));
    }
    if (url.includes('/rpc/sync_push_addons')) {
      const b = req.postDataJSON();
      state.nuvioPushes.push(clone(b)); state.nuvio[b.p_profile_id] = clone(b.p_addons);
      return json(204);
    }
    return json(404, { msg: 'not found' });
  });
  return state;
}

async function signInStremio(page) {
  await page.fill('#email', 'me@example.com');
  await page.fill('#password', 'pw');
  await page.click('#loginEmail');
  await expect(page.locator('#addon-list .addon')).toHaveCount(2);
}
async function signInNuvio(page) {
  await page.fill('#nuvioEmail', 'me@nuvio.example');
  await page.fill('#nuvioPassword', 'nuvio-pass');
  await page.click('#nuvioLogin');
  await expect(page.locator('#nuvio-session')).toBeVisible();
  await expect(page.locator('#nuvioPassword')).toHaveValue('');
}

test('install a manifest link on Stremio, then undo', async ({ page }) => {
  const state = await setup(page);
  page.on('dialog', d => d.accept());
  await page.goto(PAGE_PATH);
  await expect(page.locator('#install-card')).toBeHidden();
  await signInStremio(page);
  await page.fill('#installUrl', 'http://insecure.example.com/manifest.json');
  await page.click('#installStremio');
  await expect(page.locator('#status')).toContainText('not an https manifest link');
  await page.fill('#installUrl', 'stremio://new.example.com/abc/manifest.json');
  await page.click('#installStremio');
  await expect(page.locator('#status')).toContainText('new added to your Stremio account');
  const added = state.mine.find(a => a.transportUrl === 'https://new.example.com/abc/manifest.json');
  expect(added.manifest).toEqual(manifestFor('new'));
  // An addon whose manifest cannot be read is refused, not stored half-made.
  await page.fill('#installUrl', 'https://broken.example.com/manifest.json');
  await page.click('#installStremio');
  await expect(page.locator('#status')).toContainText('Install failed: the addon answered 500');
  expect(state.mine.some(a => a.transportUrl.includes('broken'))).toBe(false);
  await page.click('#undoBtn');
  await expect(page.locator('#status')).toContainText(/undo complete/i);
  expect(state.mine.map(a => a.transportUrl)).not.toContain('https://new.example.com/abc/manifest.json');
});

test('Nuvio: sign in, install to a profile, copy both ways, undo', async ({ page }) => {
  const state = await setup(page);
  page.on('dialog', d => d.accept());
  await page.goto(PAGE_PATH);
  await expect(page.locator('#copyToNuvio')).toBeDisabled();
  await signInStremio(page);
  await signInNuvio(page);
  await expect(page.locator('#nuvioProfile option')).toHaveCount(3);
  await expect(page.locator('#nuvio-list .addon')).toHaveCount(1);

  // Install into the Kids profile.
  await page.selectOption('#nuvioProfile', '2');
  await page.fill('#installUrl', 'https://kids.example.com/manifest.json');
  await page.click('#installNuvio');
  await expect(page.locator('#status')).toContainText('Addon added to your Nuvio profile');
  expect(state.nuvio[2]).toEqual([{ url: 'https://kids.example.com/manifest.json', name: '', enabled: true, sort_order: 0 }]);

  // Guest shares profile 1: copying Stremio → Nuvio writes profile 1, adding what is missing.
  await page.selectOption('#nuvioProfile', '3');
  await expect(page.locator('#nuvio-summary')).toContainText("shares profile 1's addons");
  await page.click('#copyToNuvio');
  await expect(page.locator('#status')).toContainText('Copied to Nuvio');
  const last = state.nuvioPushes.at(-1);
  expect(last.p_profile_id).toBe(1);
  expect(last.p_addons.map(a => a.url)).toEqual(['https://nuvio-default.example.com/manifest.json', CINEMETA.transportUrl, 'https://torrentio.example.com/manifest.json']);

  // Nuvio undo puts profile 1 back.
  await page.click('#nuvioUndo');
  await expect(page.locator('#status')).toContainText('Nuvio change undone');
  expect(state.nuvio[1].map(a => a.url)).toEqual(['https://nuvio-default.example.com/manifest.json']);

  // Nuvio → Stremio adds the Nuvio-only addon.
  await page.click('#copyToStremio');
  await expect(page.locator('#status')).toContainText('Copied to Stremio');
  expect(state.mine.at(-1)).toEqual({ transportUrl: 'https://nuvio-default.example.com/manifest.json', transportName: 'http', flags: {}, manifest: manifestFor('nuvio-default') });
});

test('copy from another Stremio account: only reads it, replace keeps Cinemeta', async ({ page }) => {
  const state = await setup(page);
  page.on('dialog', d => d.accept());
  await page.goto(PAGE_PATH);
  await signInStremio(page);
  await page.selectOption('#copyMode', 'replace');
  await page.fill('#srcEmail', 'other@example.com');
  await page.fill('#srcPassword', 'pw2');
  await page.click('#copyFromStremio');
  await expect(page.locator('#status')).toContainText('Copied to Stremio');
  expect(state.mine.map(a => a.transportUrl)).toEqual([CINEMETA.transportUrl, 'https://comet.example.com/manifest.json']);
  expect(state.other).toEqual(OTHER);
  await expect(page.locator('#srcPassword')).toHaveValue('');
});

test('a wrong Nuvio password says so and changes nothing', async ({ page }) => {
  const state = await setup(page);
  await page.goto(PAGE_PATH);
  await page.fill('#nuvioEmail', 'me@nuvio.example');
  await page.fill('#nuvioPassword', 'bad');
  await page.click('#nuvioLogin');
  await expect(page.locator('#status')).toContainText('Nuvio: Invalid login credentials');
  await expect(page.locator('#nuvio-session')).toBeHidden();
  expect(state.nuvioPushes).toEqual([]);
});

test('a Nuvio-only session can install into Nuvio; Stremio install stays off', async ({ page }) => {
  const state = await setup(page);
  page.on('dialog', d => d.accept());
  await page.goto(PAGE_PATH);
  await expect(page.locator('#install-card')).toBeHidden();
  await signInNuvio(page);
  await expect(page.locator('#install-card')).toBeVisible();
  await expect(page.locator('#installStremio')).toBeDisabled();
  await page.fill('#installUrl', 'https://kids.example.com/manifest.json');
  await page.click('#installNuvio');
  await expect(page.locator('#status')).toContainText('Addon added to your Nuvio profile');
  expect(state.nuvio[1].map(a => a.url)).toEqual(['https://nuvio-default.example.com/manifest.json', 'https://kids.example.com/manifest.json']);
});

test('Nuvio add keeps an addon added elsewhere after the page loaded', async ({ page }) => {
  const state = await setup(page);
  page.on('dialog', d => d.accept());
  await page.goto(PAGE_PATH);
  await signInNuvio(page);
  // Another device adds an addon after this page read the profile.
  state.nuvio[1].push({ url: 'https://elsewhere.example.com/manifest.json', name: 'Elsewhere', enabled: true, sort_order: 1 });
  await page.fill('#installUrl', 'https://kids.example.com/manifest.json');
  await page.click('#installNuvio');
  await expect(page.locator('#status')).toContainText('Addon added to your Nuvio profile');
  expect(state.nuvio[1].map(a => a.url)).toEqual(['https://nuvio-default.example.com/manifest.json', 'https://elsewhere.example.com/manifest.json', 'https://kids.example.com/manifest.json']);
});

test('cancelling the install confirmation changes nothing', async ({ page }) => {
  const state = await setup(page);
  page.on('dialog', d => d.dismiss());
  await page.goto(PAGE_PATH);
  await signInStremio(page);
  await page.fill('#installUrl', 'https://new.example.com/manifest.json');
  await page.click('#installStremio');
  await expect(page.locator('#status')).toContainText('Nothing was changed');
  expect(state.stremioSets).toEqual([]);
  await expect(page.locator('#undo-card')).toBeHidden();
});
