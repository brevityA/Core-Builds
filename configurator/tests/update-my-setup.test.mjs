import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const fn = name => {
  const m = app.match(new RegExp(`\\nfunction ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(m, `${name} not found`);
  return m[0];
};

test('Update my setup only ever PATCHes the saved UUID', () => {
  const body = fn('updateMySetup');
  assert.match(body, /writeHostFetch\(rec\.host, `\/api\/v1\/user\/\$\{rec\.uuid\}`, \{ method: 'PATCH'/);
  assert.doesNotMatch(body, /method: ?'POST'/, 'a failed update must not create a second config');
  assert.doesNotMatch(body, /'\/api\/v1\/user'[,)]/);
  assert.match(body, /Your existing config is unchanged\./);
  assert.match(body, /data-upd-paste/, 'falls back to the paste flow');
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
  assert.match(body, /timedOut\s*\n?\s*\? `<div class="upd-err"><b>No answer\.<\/b> The host did not reply in time, so the update may or may not have been saved\./);
  assert.match(body, /bindModalEsc\(overlay, close\)/);
  assert.match(fn('recordSavedConfig'), /String\(host \|\| ''\)\.trim\(\)\.replace\(\/\\\/\+\$\/, ''\)/);
});
