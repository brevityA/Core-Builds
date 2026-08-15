import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDisplayName } from '../src/core/input-sanitize.js';

// Regression: audit C1 (2026-08-14) — the genie hand-off bridge used to accept a name
// carrying markup; typed-input + share-import stripped it. One rule now serves all paths.

test('sanitizeDisplayName strips the HTML/attribute breaker set', () => {
  assert.equal(sanitizeDisplayName('<img src=x onerror=alert(1)>'), 'img src=x onerror=alert(1)');
  assert.equal(sanitizeDisplayName('My "Cool" <Setup> & More'), 'My Cool Setup  More');
  assert.equal(sanitizeDisplayName("Evil`'Name"), 'EvilName');
});

test('sanitizeDisplayName trims and caps at 60', () => {
  assert.equal(sanitizeDisplayName('  Den of Zen  '), 'Den of Zen');
  assert.equal(sanitizeDisplayName('x'.repeat(200)).length, 60);
});

test('handoff path composes: sanitize then cap at 24 (parity with app.js)', () => {
  const incoming = '<script>alert(1)</script>' + 'a'.repeat(40);
  const v = sanitizeDisplayName(incoming).slice(0, 24);
  assert.ok(!v.includes('<'), 'no markup survives');
  assert.ok(v.length <= 24);
});

test('blank/garbage returns empty string (callers use defaults)', () => {
  assert.equal(sanitizeDisplayName(null), '');
  assert.equal(sanitizeDisplayName(undefined), '');
  assert.equal(sanitizeDisplayName(0), '');
});
