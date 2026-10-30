/**
 * Quick install shows two promises. Each is pinned to the code that makes it true,
 * so neither the sentence nor the behaviour can drift without a test failing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../cloudflare-worker/worker.js', import.meta.url), 'utf8');

test('"Your other addons stay": a Stremio install keeps every addon unless Clean reinstall is on', () => {
  assert.match(app, /Adds Core Builds to your Stremio account\. Your other addons stay; only <b>Clean reinstall<\/b> replaces earlier Core Builds addons\./);
  const push = app.match(/async function pushToStremio\([\s\S]*?\n\}/)?.[0];
  assert.ok(push, 'pushToStremio not found');
  // Without Clean reinstall every existing addon is kept; with it, only addons served
  // from a known AIOStreams host's /stremio/ path are dropped.
  assert.match(push, /const kept = S\.cleanInstall \? existing\.filter\(a => !isKnownAioManifest\(a\)\) : existing\.slice\(\);/);
  assert.match(push, /a\.transportUrl\.includes\('\/stremio\/'\) && knownBases\.some\(base => a\.transportUrl\.startsWith\(base\)\)/);
  assert.match(push, /addons: kept/);
});

test('"Core Builds never keeps a copy": the relay logs a fixed, body-free field list only', () => {
  assert.match(app, /Your keys go only to your AIOStreams host and are remembered in this browser\. Core Builds never keeps a copy\./);
  const logs = worker.match(/console\.(log|info|warn|error|debug)\(/g) || [];
  assert.equal(logs.length, 1, 'the worker has exactly one console sink');
  assert.match(worker, /const allowed = \['cls', 'host', 'status', 'scope', 'store', 'attempts'\];/);
});

test('the key note shows only when Quick install asks for a key', () => {
  assert.match(app, /const keyNote = \/data-express-cred=\/\.test\(prim \+ extraCreds\)/);
});
