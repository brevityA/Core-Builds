import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Regression guard for the CodeQL js/xss-through-dom (CWE-79) finding on the generic
// update-radio handler: the DOM value must be allowlisted against DEFS before it is
// written into state, so it can never be reflected into the DOM unsanitized.

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('update-radio handler no longer writes e.target.value into state unguarded', () => {
  // The vulnerable generic assignment that CodeQL flagged (DOM text → state → innerHTML).
  assert.ok(
    !/S\[\s*e\.target\.dataset\.key\s*\]\s*=\s*e\.target\.value/.test(app),
    'unguarded S[e.target.dataset.key] = e.target.value reintroduced — DOM XSS taint flow'
  );
});

test('RADIO_ALLOWED allowlist is derived from DEFS (cannot drift from the rendered radios)', () => {
  assert.match(app, /const RADIO_ALLOWED = \(\(\) => \{/, 'RADIO_ALLOWED derivation missing');
  assert.match(app, /m\[d\.key\] = new Set\(d\.opts\.map\(o => o\.v\)\)/, 'allowlist not derived from DEFS opts');
  // The handler must validate against the allowlist before the state write.
  assert.match(app, /const allowed = RADIO_ALLOWED\[k\];\s*\n\s*if \(!allowed \|\| !allowed\.has\(v\)\) return;/,
    'handler is not validating key+value against RADIO_ALLOWED before writing state');
  assert.match(app, /S\[k\] = v;/, 'validated write S[k] = v missing');
});

test('device branch uses the validated value, not the raw DOM value', () => {
  // After the fix the device auto-audio logic must read the allowlisted `v`, never
  // e.target.value, so the taint is not reintroduced through the special-case.
  const handler = app.slice(app.indexOf("e.target.dataset.action === 'update-radio'"));
  const devBlock = handler.slice(0, handler.indexOf("e.target.dataset.action === 'toggle-telemetry'"));
  assert.ok(!/DEV_AUDIO\[\s*e\.target\.value\s*\]/.test(devBlock), 'device branch still reads raw e.target.value for audio lookup');
  assert.ok(!/DEVICE_FORCE_LIMITED_AUDIO\.has\(\s*e\.target\.value\s*\)/.test(devBlock), 'device branch still reads raw e.target.value for lossless check');
  assert.match(devBlock, /DEV_AUDIO\[\s*v\s*\]/, 'device branch should use validated v');
});
