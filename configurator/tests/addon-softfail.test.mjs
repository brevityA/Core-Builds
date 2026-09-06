import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regression guard for the AIOStreams "Failed to fetch manifest for {addon}: {reason}"
// soft-fail. Pure helpers are extracted from app.js and exercised directly; the wiring
// (dispatch + build-time preset filter + retry action) is asserted at source level.

const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const start = app.indexOf('function parseAddonFetchError');
const end = app.search(/^function buildFinal\(/m);
assert.ok(start > 0 && end > start, 'soft-fail helpers missing from app.js');
const shim = 'const ICO={warn:()=>""};let _cachedBuildResult=null,_lastAddonKey="",_lastInstall={target:"app",pwd:""},_disabledAddons=new Set();';
eval(shim + app.slice(start, end) + ';globalThis.__p=parseAddonFetchError;globalThis.__n=normAddonName;globalThis.__m=presetMatchesAddon;');
const { __p: parse, __n: norm, __m: match } = globalThis;

test('parseAddonFetchError extracts addon name + reason (incl. store suffix)', () => {
  assert.deepEqual(parse('Failed to fetch manifest for StremThru Torz TB: fetch failed'), { name: 'StremThru Torz TB', reason: 'fetch failed' });
  assert.deepEqual(parse('Failed to fetch manifest for STore TB: 521'), { name: 'STore TB', reason: '521' });
  assert.deepEqual(parse('Failed to fetch manifest for Torrentio AD: 403 Forbidden'), { name: 'Torrentio AD', reason: '403 Forbidden' });
  assert.equal(parse('Some other error'), null);
  assert.equal(parse(''), null);
});

test('normAddonName strips only the standalone store-suffix token (not the word "Torz")', () => {
  assert.equal(norm('StremThru Torz TB'), 'stremthru torz'); // "TB" suffix stripped; "Torz" kept
  assert.equal(norm('STore TB'), 'store');
  assert.equal(norm('Torrentio AD'), 'torrentio');
  assert.equal(norm('Comet P2P'), 'comet p2p');           // P2P is not a store suffix
});

test('presetMatchesAddon maps the display name to the preset via name / type / instanceId', () => {
  assert.ok(match({ type: 'stremthruTorz', options: { name: 'StremThru Torz' } }, 'StremThru Torz TB'));
  assert.ok(match({ type: 'stremthruStore', options: { name: 'StremThru Store' } }, 'STore TB'));
  assert.ok(match({ type: 'comet', instanceId: 'c1', options: { name: 'Comet' } }, 'Comet P2P'));
  assert.ok(!match({ type: 'comet', options: { name: 'Comet' } }, 'StremThru Torz TB'));
});

test('renderAddonFetchFallback escapes addon name and install target to prevent XSS', () => {
  assert.match(app, /const k = escH\(_lastAddonKey \|\| name \|\| 'the addon'\)/);
  assert.match(app, /const safeName = escH\(name\)/);
  assert.match(app, /const safeTarget = escH\(_lastInstall\.target \|\| ''\)/);
  assert.match(app, /\$\{safeName\}<\/strong>/);
  assert.match(app, /Save without \$\{k\}/);
  assert.match(app, /data-target="\$\{safeTarget\}"/);
  assert.doesNotMatch(app, /\$\{name\}<\/strong>/);
});

test('wiring present: dispatch wraps the reject path(s), build filters disabled presets, retry action exists', () => {
  assert.match(app, /function renderConfigRejectedDispatch\(safeMsg, apiDetail\)/);
  // definition + one call per "Config rejected" render path (>=2 calls)
  assert.ok((app.match(/renderConfigRejectedDispatch\(safeMsg, apiDetail\)/g) || []).length >= 3);
  assert.match(app, /assembleTemplate\(tpl,/);
  assert.match(app, /action === 'save-without-addon'/);
  assert.match(app, /_lastInstall = \{ target, pwd \}/);
  assert.match(app, /_simulateAddonFail/, 'self-test hook (?simulateAddonFail=) missing');
});
