/**
 * "No keyless host POST" contract (Direct Install key gate).
 *
 * Pure part: missingServiceCredentials() must flag exactly the keys an enabled
 * service needs and nothing else.
 *
 * Wiring part: every code path that POSTs the generated config to a host
 * must consult the gate — otherwise the runtime backstop can be removed
 * without a single test noticing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { missingServiceCredentials, REQUIRED_SERVICE_CREDENTIALS } from '../src/core/install-readiness.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('a debrid service selected without its key is missing', () => {
  assert.deepEqual(missingServiceCredentials(['torbox'], {}), [
    { service: 'torbox', credential: 'torbox', label: 'TorBox API Key' },
  ]);
});

test('a filled key clears the gate', () => {
  assert.deepEqual(missingServiceCredentials(['torbox'], { torbox: 'abc123' }), []);
});

test('whitespace-only keys still count as missing', () => {
  assert.deepEqual(missingServiceCredentials(['realdebrid'], { realdebrid: '   ' }), [
    { service: 'realdebrid', credential: 'realdebrid', label: 'Real-Debrid API Key' },
  ]);
});

test('easynews needs BOTH username and password', () => {
  assert.deepEqual(missingServiceCredentials(['easynews'], { easynews: 'user' }).map(m => m.credential), ['easynewsPass']);
  assert.deepEqual(missingServiceCredentials(['easynews'], { easynewsPass: 'pw' }).map(m => m.credential), ['easynews']);
  assert.deepEqual(missingServiceCredentials(['easynews'], { easynews: 'u', easynewsPass: 'p' }), []);
});

test('free lanes and keyless services are exempt', () => {
  assert.deepEqual(missingServiceCredentials([], {}), []);
  assert.deepEqual(missingServiceCredentials(['aiostreams', 'stremio_nntp'], {}), []);
  assert.deepEqual(missingServiceCredentials(['nzbdav', 'altmount', 'stremthru_newz'], {}), []);
  // Debridio is intentionally NOT gated: the preset is omitted when keyless.
  assert.deepEqual(missingServiceCredentials(['debridio'], {}), []);
});

test('multi-service selection reports each missing key in service order', () => {
  assert.deepEqual(
    missingServiceCredentials(['realdebrid', 'pikpak', 'seedr'], { seedr: 's' }).map(m => m.credential),
    ['realdebrid', 'pikpak']
  );
});

test('every gated service id has a credential mapping (no silent un-gated debrid)', () => {
  const EXPECTED_GATED = ['realdebrid','alldebrid','premiumize','debridlink','torbox','offcloud','easydebrid','pikpak','seedr','debrider','easynews'].sort();
  assert.deepEqual(Object.keys(REQUIRED_SERVICE_CREDENTIALS).sort(), EXPECTED_GATED);
});

// ── Wiring: the runtime backstop and the render-time disabled state must
// stay connected. These string checks fail if the guard is deleted. ──

function fnBody(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start !== -1, `${signature} must exist`);
  const rest = source.slice(start);
  const next = rest.slice(1).search(/\n(?:async\s+)?function\s+[A-Za-z_$]/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

test('simpleInstall consults the gate before any host POST', () => {
  const body = fnBody(app, 'async function simpleInstall');
  const gate = body.indexOf('installCredentialGate()');
  const post = body.indexOf("writeHostFetch(fastest, '/api/v1/user'");
  assert.ok(gate !== -1, 'simpleInstall must call installCredentialGate()');
  assert.ok(post !== -1, 'simpleInstall must POST to /api/v1/user');
  assert.ok(gate < post, 'the gate must run before the POST');
});

test('openInAIOStreams gates BOTH host-POST paths', () => {
  const body = fnBody(app, 'async function openInAIOStreams');
  assert.ok((body.match(/installCredentialGate\(\)/g) || []).length >= 2,
    'openInAIOStreams must gate the auto and explicit-host POST paths');
});

test('blocking UI names the missing key and offers the credential-free alternative', () => {
  const body = fnBody(app, 'function installCredentialGateHtml');
  assert.match(body, /item\.label/, 'message must name each missing credential label');
  assert.match(body, /Export JSON/, 'message must offer the export/import fallback');
});

test('deploy controls carry a render-time disabled state wired to live un-blocking', () => {
  assert.match(app, /data-install-blocked="1"/, 'gated buttons must be marked');
  assert.match(app, /const _reviewInstallBlocked = installCredentialGate\(\);/, 'full review must compute the gate at render time');
  assert.match(app, /const _simpleInstBlocked = installCredentialGate\(\);/, 'simple review must compute the gate at render time');
  assert.match(app, /refreshInstallGateState\(\);/, 'credential edits must re-evaluate the gate live');
});

test('export paths (generate-dl) are NOT gated by service keys', () => {
  // The unblock path — Export JSON strips credentials by design. The gate may
  // warn but must never block the download buttons.
  const body = fnBody(app, 'function generate()');
  assert.doesNotMatch(body, /installCredentialGate/, 'the download path must not consult the install gate');
});
