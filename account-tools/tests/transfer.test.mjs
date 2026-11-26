import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The install/copy helpers live inline in index.html (the page is a classic script
// so it works from file://). Pull the marked block out and test it directly.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const block = html.match(/\/\* transfer-helpers:start[\s\S]*?\/\* transfer-helpers:end \*\//)[0];
const h = new Function(`${block}; return { normalizeManifestUrl, isCopyable, planStremioCopy, stremioToNuvio, nuvioToStremio, planNuvioCopy, nuvioAddonProfile };`)();

const S = (url, extra = {}) => ({ transportUrl: url, transportName: 'http', flags: {}, ...extra });
const cinemeta = S('https://v3-cinemeta.strem.io/manifest.json', { flags: { official: true, protected: true }, manifest: { name: 'Cinemeta' } });
const local = S('http://127.0.0.1:11470/local-addon/manifest.json', { flags: { official: true, protected: true } });

test('manifest links: https or stremio://, ending in manifest.json', () => {
  assert.equal(h.normalizeManifestUrl(' https://a.example/x/manifest.json '), 'https://a.example/x/manifest.json');
  assert.equal(h.normalizeManifestUrl('stremio://a.example/x/manifest.json'), 'https://a.example/x/manifest.json');
  assert.equal(h.normalizeManifestUrl('http://a.example/manifest.json'), null);
  assert.equal(h.normalizeManifestUrl('https://a.example/configure'), null);
  assert.equal(h.normalizeManifestUrl('javascript:alert(1)'), null);
});

test('Stremio add-missing keeps the target and appends new https addons once', () => {
  const target = [cinemeta, S('https://a/manifest.json')];
  const plan = h.planStremioCopy(target, [S('https://a/manifest.json'), S('https://b/manifest.json'), S('https://b/manifest.json'), local], 'add');
  assert.deepEqual(plan.addons.map(a => a.transportUrl), ['https://v3-cinemeta.strem.io/manifest.json', 'https://a/manifest.json', 'https://b/manifest.json']);
  assert.equal(plan.added, 1);
  assert.equal(plan.removed, 0);
});

test('Stremio replace keeps protected addons (Cinemeta, Local Files) first', () => {
  const target = [cinemeta, local, S('https://old/manifest.json')];
  const plan = h.planStremioCopy(target, [S('https://new/manifest.json')], 'replace');
  assert.deepEqual(plan.addons.map(a => a.transportUrl), [cinemeta.transportUrl, local.transportUrl, 'https://new/manifest.json']);
  assert.equal(plan.added, 1);
  assert.equal(plan.removed, 1);
});

test('Stremio ↔ Nuvio shapes and the Nuvio plan', () => {
  const rows = h.stremioToNuvio([cinemeta, local, S('https://c/manifest.json', { manifest: { name: 'C' } })]);
  assert.deepEqual(rows, [{ url: cinemeta.transportUrl, name: 'Cinemeta', enabled: true }, { url: 'https://c/manifest.json', name: 'C', enabled: true }]);
  assert.deepEqual(h.nuvioToStremio([{ url: 'https://n/manifest.json' }, { url: 'ftp://x' }]), [{ transportUrl: 'https://n/manifest.json', transportName: 'http', flags: {} }]);
  const existing = [{ url: 'https://c/manifest.json', name: 'C', enabled: false }];
  const add = h.planNuvioCopy(existing, rows, 'add');
  assert.deepEqual(add.addons, [
    { url: 'https://c/manifest.json', name: 'C', enabled: false, sort_order: 0 },
    { url: cinemeta.transportUrl, name: 'Cinemeta', enabled: true, sort_order: 1 },
  ]);
  assert.equal(add.added, 1);
  const rep = h.planNuvioCopy([{ url: 'https://gone/manifest.json' }], rows, 'replace');
  assert.equal(rep.removed, 1);
  assert.deepEqual(rep.addons.map(a => a.sort_order), [0, 1]);
});

test('a Nuvio profile sharing profile 1 writes to profile 1', () => {
  assert.equal(h.nuvioAddonProfile({ profile_index: 3, uses_primary_addons: true }), 1);
  assert.equal(h.nuvioAddonProfile({ profile_index: 3, uses_primary_addons: false }), 3);
  assert.equal(h.nuvioAddonProfile(null), 1);
});

test('the page only talks to the Stremio and Nuvio APIs', () => {
  assert.match(html, /connect-src https:\/\/api\.strem\.io https:\/\/api\.nuvio\.tv;/);
});

test('addon links display with a single slash after the host', () => {
  const fn = html.match(/function redactUrl\(url\)\{[\s\S]*?\n\}/)[0];
  const redactUrl = new Function(`${fn}; return redactUrl;`)();
  assert.equal(redactUrl('https://a.example/manifest.json'), 'https://a.example/manifest.json');
  assert.equal(redactUrl('https://a.example/stremio/abcdefghijklmnopqrstu/manifest.json'), 'https://a.example/stremio/[REDACTED]/manifest.json');
});
