import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('beaconPost exists: onLine guard, sendBeacon first, keepalive-fetch fallback, never throws', () => {
  assert.match(app, /function beaconPost\(url, payload\) \{/);
  const m = app.match(/function beaconPost\(url, payload\) \{([\s\S]*?)\n\}/);
  assert.ok(m, 'beaconPost body extractable');
  const body = m[1];
  assert.match(body, /navigator\.onLine/, 'skips beaconing while offline');
  assert.match(body, /navigator\.sendBeacon/, 'tries sendBeacon first');
  assert.match(body, /keepalive: true/, 'falls back to a keepalive fetch');
  assert.match(body, /\.catch\(/, 'fallback fetch failure is swallowed');
  assert.match(body, /return false/, 'returns false when nothing worked');
});

test('no bare navigator.sendBeacon call sites remain (all routed through beaconPost)', () => {
  // Exactly two occurrences allowed — both are the ternary inside beaconPost
  // (navigator.sendBeacon(url) / navigator.sendBeacon(url, body)).
  const bare = (app.match(/navigator\.sendBeacon\(/g) || []).length;
  assert.equal(bare, 2, 'every sendBeacon call must go through beaconPost');
});

test('visit + generate counters use the resilient beacon', () => {
  assert.match(app, /beaconPost\(COUNTER_URL \+ '\/api\/visit'\)/, 'visit beacon on page load');
  assert.match(app, /beaconPost\(COUNTER_URL \+ '\/api\/generate'/, 'generate beacon on download');
  assert.match(app, /S\.telemetryOk\) \{[\s\S]{0,120}beaconPost\(USAGE_BEACON_URL/, 'opt-in usage beacon stays gated on telemetryOk');
});
