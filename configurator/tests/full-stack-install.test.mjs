import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
});

test('a failed addon read never overwrites the collection with AIOMetadata alone', async () => {
  const sets = [];
  const stremioFetch = async (url, body) => {
    if (body.type === 'AddonCollectionSet') { sets.push(body.addons); return { result: { success: true } }; }
    if (body.type === 'AddonCollectionGet') return { error: { message: 'session expired' } };
    return {};
  };
  const { fullStackAfterPush } = load(['fullStackAfterPush'], {
    stremioFetch, stremioErrText: errText, AIOMETADATA_MANIFEST: 'https://meta/manifest.json',
    patchCinemeta: async () => ({ ok: true, message: 'x' }), reorderAddons: async () => ({ ok: true, message: 'x' }),
    verifyAddonInstall: () => ({ ok: false, missing: ['a'] }),
  });
  const r = await fullStackAfterPush('k-1', 'https://h/manifest.json', { patchCinemeta: false, reorder: false });
  assert.deepEqual(sets, [], 'nothing is written after a failed read');
  assert.match(r.errors.join(' '), /AIOMetadata: session expired/);
  assert.equal(r.ok, false);
});
