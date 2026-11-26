import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as cp from '../src/core/cinemeta-patch.js';

// Full-stack install: pushToStremio logs in, then AIOMetadata, the Cinemeta patch
// and the reorder run on the same account. pushToStremio used to return a bare
// string while its caller read `.status` and `.authKey`, so every full-stack step
// ran with authKey undefined and "Already installed" never showed.

const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const fn = name => {
  const m = app.match(new RegExp(`\\n(async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(m, `${name} not found`);
  return m[0];
};
const load = (names, deps) => new Function(...Object.keys(deps), `${names.map(fn).join('\n')}; return { ${names.join(', ')} };`)(...Object.values(deps));
const errText = (e, fallback) => (e && e.message) || fallback;

test('pushToStremio hands the caller its status and the session', async () => {
  const calls = [];
  const stremioFetch = async (url, body) => {
    calls.push(body.type);
    if (body.type === 'Login') return { result: { authKey: 'k-1' } };
    if (body.type === 'AddonCollectionGet') return { result: { addons: [{ transportUrl: 'https://x/manifest.json' }] } };
    return { result: { success: true } };
  };
  const S = { cleanInstall: false };
  const { pushToStremio } = load(['pushToStremio'], { stremioFetch, stremioErrText: errText, S, HOST_BASE_URLS: {} });
  assert.deepEqual(await pushToStremio('https://h/stremio/u/p/manifest.json', 'e', 'p'), { status: 'installed', authKey: 'k-1' });
  assert.deepEqual(await pushToStremio('https://x/manifest.json', 'e', 'p'), { status: 'already', authKey: 'k-1' });
  S.cleanInstall = true;
  assert.equal((await pushToStremio('https://h/stremio/u/p/manifest.json', 'e', 'p')).status, 'replaced');
  assert.match(app, /const installResult = await pushToStremio\([^)]*\);\s*const installed = installResult\.status;/);
  assert.match(app, /fullStackAfterPush\(\s*installResult\.authKey,/);
  assert.match(app, /reorder: true, password: pwd, cinemetaPatches: sanitizeCinemetaPatches\(S\.cinemetaPatches\), metaKeys: S\.metaKeys \}/);
});

const cinemeta = () => ({
  transportUrl: 'https://v3-cinemeta.strem.io/manifest.json', flags: { official: true, protected: true },
  manifest: { id: 'com.linvo.cinemeta', name: 'Cinemeta', resources: ['catalog', 'meta', 'addon_catalog'], catalogs: [
    { type: 'movie', id: 'top', extra: [{ name: 'genre' }, { name: 'search' }, { name: 'skip' }], extraSupported: ['search', 'genre', 'skip'] },
    { type: 'movie', id: 'year', extra: [{ name: 'genre', isRequired: true }], extraRequired: ['genre'] },
    { type: 'movie', id: 'imdbRating', extra: [{ name: 'genre' }] },
    { type: 'series', id: 'last-videos', extra: [{ name: 'lastVideosIds', isRequired: true }] },
  ] },
});

// A fake Stremio account: the collection lives in memory, as on api.strem.io.
function account(addons, { failGet = false } = {}) {
  const state = { addons, sets: [] };
  const stremioFetch = async (url, body) => {
    if (body.type === 'AddonCollectionGet') return failGet ? { error: { message: 'session expired' } } : { result: { addons: structuredClone(state.addons) } };
    if (body.type === 'AddonCollectionSet') { state.addons = structuredClone(body.addons); state.sets.push(body.addons); return { result: { success: true } }; }
    return {};
  };
  return { state, stremioFetch };
}
const verifyAddonInstall = ({ actual, expectedUrls }) => {
  const missing = expectedUrls.filter(u => !actual.some(a => a.transportUrl === u));
  return { ok: missing.length === 0, missing, expectedCount: expectedUrls.length };
};
const loadStack = (stremioFetch, saves = []) => load(['createAioMetadataConfig', 'reorderAddons', 'fullStackAfterPush'], {
  stremioFetch, stremioErrText: errText, verifyAddonInstall, ...cp,
  fetchWithTimeout: async (url, opts) => {
    saves.push({ url, body: JSON.parse(opts.body) });
    return { ok: true, status: 200, json: async () => ({ success: true, userUUID: 'u-1', installUrl: 'https://aiometadata.elfhosted.com/stremio/u-1/manifest.json' }) };
  },
});

test('full stack configures AIOMetadata, swaps out the empty one and patches Cinemeta', async () => {
  const aios = 'https://h/stremio/x/y/manifest.json';
  const { state, stremioFetch } = account([cinemeta(), { transportUrl: 'https://aiometadata.elfhosted.com/manifest.json' }, { transportUrl: aios }]);
  const saves = [];
  const { fullStackAfterPush } = loadStack(stremioFetch, saves);
  const r = await fullStackAfterPush('k', aios, { password: 'pw-1' });
  assert.equal(r.ok, true, r.errors.join(' '));
  assert.equal(saves.length, 1);
  assert.equal(saves[0].url, 'https://aiometadata.elfhosted.com/api/config/save');
  assert.equal(saves[0].body.password, 'pw-1');
  assert.equal(saves[0].body.userUUID, undefined, 'a save that names a UUID is refused');
  assert.equal(saves[0].body.config.catalogs, undefined, 'no catalogs: the addon serves its defaults');
  const urls = state.addons.map(a => a.transportUrl);
  assert.deepEqual(urls, ['https://v3-cinemeta.strem.io/manifest.json', 'https://aiometadata.elfhosted.com/stremio/u-1/manifest.json', aios]);
  const ids = state.addons[0].manifest.catalogs.map(c => c.id);
  assert.deepEqual(ids, ['last-videos'], 'board rows and search gone, notifications kept');
  assert.ok(state.addons[0].manifest.resources.includes('meta'), 'Cinemeta still answers metadata');
});

test('Cinemeta is left alone when AIOMetadata could not be set up', async () => {
  const aios = 'https://h/stremio/x/y/manifest.json';
  const { state, stremioFetch } = account([cinemeta(), { transportUrl: aios }]);
  const { fullStackAfterPush } = load(['reorderAddons', 'fullStackAfterPush'], {
    stremioFetch, stremioErrText: errText, verifyAddonInstall, ...cp,
    createAioMetadataConfig: async () => { throw new Error('AIOMetadata returned 503'); },
  });
  const r = await fullStackAfterPush('k', aios, { password: 'pw' });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /AIOMetadata: AIOMetadata returned 503/);
  assert.equal(state.addons[0].manifest.catalogs.length, 4, 'catalogs untouched');
  assert.match(r.steps.join(' '), /Cinemeta left as it is/);
});

test('an AIOMetadata the user already configured is kept, not replaced', async () => {
  const aios = 'https://h/stremio/x/y/manifest.json';
  const mine = { transportUrl: 'https://aiometadata.elfhosted.com/stremio/mine/manifest.json', manifest: { id: 'com.aio.metadata', name: 'AIO Metadata' } };
  const { state, stremioFetch } = account([cinemeta(), { transportUrl: aios }, mine]);
  const saves = [];
  const { fullStackAfterPush } = loadStack(stremioFetch, saves);
  const r = await fullStackAfterPush('k', aios, { password: 'pw' });
  assert.equal(r.ok, true, r.errors.join(' '));
  assert.equal(saves.length, 0, 'no second config created');
  assert.equal(state.addons[1].transportUrl, mine.transportUrl);
});

test('a failed addon read never overwrites the collection with AIOMetadata alone', async () => {
  const sets = [];
  const stremioFetch = async (url, body) => {
    if (body.type === 'AddonCollectionSet') { sets.push(body.addons); return { result: { success: true } }; }
    if (body.type === 'AddonCollectionGet') return { error: { message: 'session expired' } };
    return {};
  };
  const { fullStackAfterPush } = load(['fullStackAfterPush'], {
    stremioFetch, stremioErrText: errText, ...cp,
    createAioMetadataConfig: async () => 'https://meta/stremio/u/manifest.json', reorderAddons: async () => ({ ok: true, message: 'x' }),
    verifyAddonInstall: () => ({ ok: false, missing: ['a'] }),
  });
  const r = await fullStackAfterPush('k-1', 'https://h/manifest.json', { patchCinemeta: false, reorder: false, password: 'pw' });
  assert.deepEqual(sets, [], 'nothing is written after a failed read');
  assert.match(r.errors.join(' '), /AIOMetadata: session expired/);
  assert.equal(r.ok, false);
});

test('the Cinemeta patch also runs for an AIOMetadata the user set up, with the AIOMetadata step off', async () => {
  const aios = 'https://h/stremio/x/y/manifest.json';
  const mine = { transportUrl: 'https://aiometadata.elfhosted.com/stremio/mine/manifest.json', manifest: { id: 'com.aio.metadata' } };
  const { state, stremioFetch } = account([cinemeta(), { transportUrl: aios }, mine]);
  const saves = [];
  const { fullStackAfterPush } = loadStack(stremioFetch, saves);
  const r = await fullStackAfterPush('k', aios, { installAIOMetadata: false, password: 'pw' });
  assert.equal(r.ok, true, r.errors.join(' '));
  assert.equal(saves.length, 0);
  assert.deepEqual(state.addons[0].manifest.catalogs.map(c => c.id), ['last-videos']);
});

test('the chosen Cinemeta patches and AIOMetadata keys reach the account and the config', async () => {
  const aios = 'https://h/stremio/x/y/manifest.json';
  const { state, stremioFetch } = account([cinemeta(), { transportUrl: aios }]);
  const saves = [];
  const { fullStackAfterPush } = loadStack(stremioFetch, saves);
  const r = await fullStackAfterPush('k', aios, { password: 'pw', cinemetaPatches: ['removeMeta'], metaKeys: { mdblist: 'm-1', rpdb: 'r-1' } });
  assert.equal(r.ok, true, r.errors.join(' '));
  assert.equal(saves[0].body.config.apiKeys.mdblist, 'm-1');
  assert.equal(saves[0].body.config.apiKeys.rpdb, 'r-1');
  assert.equal(saves[0].body.config.posterRatingProvider, 'rpdb');
  const m = state.addons[0].manifest;
  assert.equal(m.catalogs.length, 4, 'rows and search kept');
  assert.ok(!m.resources.includes('meta'), 'details hidden');
  assert.match(r.steps.join(' '), /details pages hidden/);
});

test('a configured AIOMetadata added while the config was saving is used, never doubled', async () => {
  const aios = 'https://h/stremio/x/y/manifest.json';
  const other = { transportUrl: 'https://aiometadata.elfhosted.com/stremio/other/manifest.json', manifest: { id: 'com.aio.metadata' } };
  const { state, stremioFetch } = account([cinemeta(), { transportUrl: aios }]);
  const saves = [];
  const { fullStackAfterPush } = load(['reorderAddons', 'fullStackAfterPush'], {
    stremioFetch, stremioErrText: errText, verifyAddonInstall, ...cp,
    createAioMetadataConfig: async () => { state.addons.push(structuredClone(other)); return 'https://aiometadata.elfhosted.com/stremio/new/manifest.json'; },
  });
  const r = await fullStackAfterPush('k', aios, { password: 'pw' });
  assert.equal(r.ok, true, r.errors.join(' '));
  const metas = state.addons.filter(cp.isConfiguredAioMetadata);
  assert.deepEqual(metas.map(a => a.transportUrl), [other.transportUrl]);
  assert.match(r.steps.join(' '), /existing config appeared on your account and was kept/);
  assert.doesNotMatch(r.steps.join(' '), /same as AIOStreams/);
});

test('AIOMetadata keys and Cinemeta choices stay local: never in share links', () => {
  const keys = app.match(/const SHARE_KEYS = \[([^\]]*)\]/)[1];
  assert.doesNotMatch(keys, /metaKeys|cinemetaPatches/);
});
