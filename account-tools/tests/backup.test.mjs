import test from 'node:test';
import assert from 'node:assert/strict';

import { createBackup, parseBackup, isValidBackup } from '../src/backup.js';

const ADDONS = [
  { manifest: { name: 'Addon1' }, transportUrl: 'https://a.com/m.json' },
  { manifest: { name: 'Addon2' }, transportUrl: 'https://b.com/m.json' },
];

test('createBackup: creates versioned backup', () => {
  const b = createBackup(ADDONS, { email: 'test@test.com', source: 'test' });
  assert.equal(b.version, 1);
  assert.equal(b.addonCount, 2);
  assert.equal(b.email, 'test@test.com');
  assert.equal(b.source, 'test');
  assert.ok(b.exportedAt);
  assert.equal(b.addons.length, 2);
});

test('parseBackup: parses own format', () => {
  const b = createBackup(ADDONS);
  const parsed = parseBackup(b);
  assert.equal(parsed.addonCount, 2);
});

test('parseBackup: parses from JSON string', () => {
  const b = createBackup(ADDONS);
  const parsed = parseBackup(JSON.stringify(b));
  assert.equal(parsed.addonCount, 2);
});

test('parseBackup: handles API response format', () => {
  const apiRes = { result: { addons: ADDONS } };
  const parsed = parseBackup(apiRes);
  assert.equal(parsed.addonCount, 2);
  assert.equal(parsed.source, 'api-import');
});

test('parseBackup: handles legacy format', () => {
  const legacy = { addons: ADDONS };
  const parsed = parseBackup(legacy);
  assert.equal(parsed.addonCount, 2);
  assert.equal(parsed.source, 'legacy-import');
});

test('parseBackup: rejects invalid format', () => {
  assert.throws(() => parseBackup({ bad: true }), /Unrecognized backup format/);
});

test('isValidBackup: true for valid', () => {
  assert.ok(isValidBackup(createBackup(ADDONS)));
});

test('isValidBackup: false for invalid', () => {
  assert.ok(!isValidBackup({ bad: true }));
});
