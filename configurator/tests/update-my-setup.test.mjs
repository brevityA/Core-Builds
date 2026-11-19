import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const fn = name => {
  const m = app.match(new RegExp(`\\nfunction ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(m, `${name} not found`);
  return m[0];
};

test('Update my setup only ever updates the saved UUID', () => {
  const body = fn('updateMySetup');
  assert.match(body, /aioUserWrite\(rec\.host, \{ uuid: rec\.uuid, password: S\.instancePassword, config: cfg \}/);
  assert.doesNotMatch(body, /method: ?'(POST|PATCH)'/, 'a failed update must not create a second config');
  assert.doesNotMatch(body, /writeHostFetch\(/, 'every write goes through the one helper');
  assert.match(body, /Your existing config is unchanged\./);
  assert.match(body, /data-upd-paste/, 'falls back to the paste flow');
});

// AIOStreams 2.32–2.38 have one update route: PUT /api/v1/user with
// Authorization: Basic base64(uuid:password). PATCH /api/v1/user/<id> does not
// exist and answers 404 "Not Found" — what the "Update my setup" screen showed.
test('config writes follow the AIOStreams contract: PUT + Basic updates, POST creates', async () => {
  const src = ['sentence', 'aioBasicAuth', 'aioUserWrite'].map(fn).join('\n');
  const sent = [];
  const writeHostFetch = async (host, path, opts) => { sent.push({ host, path, ...opts }); return {}; };
  const api = new Function('writeHostFetch', 'TextEncoder', 'btoa', `${src}; return { sentence, aioBasicAuth, aioUserWrite };`)(writeHostFetch, TextEncoder, btoa);
  await api.aioUserWrite('https://h', { uuid: 'u-1', password: 'pä:ss', config: { a: 1 } }, 1);
  await api.aioUserWrite('https://h', { uuid: null, password: 'pw', config: { a: 1 } }, 1);
  assert.equal(sent[0].method, 'PUT');
  assert.equal(sent[0].path, '/api/v1/user');
  assert.equal(Buffer.from(sent[0].headers.Authorization.slice(6), 'base64').toString('utf8'), 'u-1:pä:ss', 'UTF-8 safe, colon in the password kept');
  assert.deepEqual(JSON.parse(sent[0].body), { config: { a: 1 } }, 'the password is not repeated in the body');
  assert.equal(sent[1].method, 'POST');
  assert.equal(sent[1].headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(sent[1].body), { config: { a: 1 }, password: 'pw' });
  assert.doesNotMatch(app, /method: ?(id|uuid) \? 'PATCH'/, 'no caller still sends PATCH');
  assert.doesNotMatch(app, /`\/api\/v1\/user\/\$\{/, 'no caller builds an /api/v1/user/<id> path');
  assert.equal(api.sentence('Not Found'), 'Not Found.');
  assert.equal(api.sentence('Invalid password.'), 'Invalid password.');
});

test('the password only goes to a host the user could have picked', () => {
  const body = fn('lastSavedConfig');
  assert.match(body, /Object\.values\(HOST_BASE_URLS\)\.includes\(rec\.host\)/);
  assert.match(body, /rec\.host === custom/);
  assert.match(body, /rec\.uuid !== \(S\.instanceUuid \|\| ''\)\.trim\(\)/);
  assert.match(body, /!S\.instancePassword/);
});

test('the saved copy is scrubbed like an import link and recorded on every real save', () => {
  assert.match(fn('recordSavedConfig'), /sanitizeTemplateForRemoteImport\(\{ metadata: \{\}, config \}\)\.config/);
  // Express create, auto install and manual install. Test Drive's throwaway config is not recorded.
  assert.equal((app.match(/recordSavedConfig\((fastest|winner\.host|resolvedBase), /g) || []).length, 3);
  assert.doesNotMatch(app.match(/async function runTestDrive[\s\S]*?\n  \}/)[0], /recordSavedConfig/);
});

test('values read back from storage are escaped on the first screen', () => {
  const body = fn('splashUpdateCard');
  assert.match(body, /escHtml\(savedHostLabel\(rec\.host\)\)/);
  assert.match(body, /escHtml\(String\(rec\.ver\)\)/);
  assert.match(body, /escHtml\(when\)/);
});

test('a timeout is not reported as unchanged, and a custom host is stored without a trailing slash', () => {
  const body = fn('updateMySetup');
  assert.match(body, /err\?\.name === 'AbortError'\s*\n?\s*\? `<div class="upd-err"><b>No answer\.<\/b> The host did not reply in time, so the update may or may not have been saved\./);
  assert.match(body, /bindModalEsc\(overlay, close\)/);
  assert.match(fn('recordSavedConfig'), /String\(host \|\| ''\)\.trim\(\)\.replace\(\/\\\/\+\$\/, ''\)/);
});

// CodeRabbit review on #845: an uncertain failure (timeout, network, proxy, 5xx)
// can come after the host applied the update, so it must not read "unchanged" and
// must never fall through to creating a second config.
test('only an AIOStreams refusal counts as "nothing changed"', () => {
  const refused = new Function(`${fn('aioHostRefused')}; return aioHostRefused;`)();
  assert.equal(refused({ status: 400 }, { error: { code: 'USER_INVALID_DETAILS' } }), true);
  assert.equal(refused({ status: 502 }, { error: { code: 'INTERNAL_SERVER_ERROR' } }), false, 'a 5xx is uncertain');
  assert.equal(refused({ status: 403 }, { error: 'host not allowed' }), false, 'a proxy refusal is not the host');
  assert.equal(refused({ status: 404 }, {}), false);
  const body = fn('updateMySetup');
  assert.match(body, /refusal\.refused = aioHostRefused\(res, data\)/);
  assert.match(body, /err\?\.refused\s*\?\s*`<div class="upd-err"><b>Not saved\.<\/b>/);
  assert.match(body, /<b>Not confirmed\.<\/b> \$\{msg\} The update may or may not have been saved\./);
});

test('install never creates a second config after an uncertain update failure', () => {
  assert.match(app, /if \(existingUuid && err\?\.refused && err\.code === 'USER_INVALID_DETAILS'\) winner = await attempt\(null\);\s*else throw err;/);
  assert.doesNotMatch(app, /if \(existingUuid\) winner = await attempt\(null\);/);
});
