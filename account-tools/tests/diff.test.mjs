import test from 'node:test';
import assert from 'node:assert/strict';

import { diffSnapshots, formatDiff } from '../src/diff.js';

const SNAPSHOT_A = {
  addons: [
    { name: 'Torrentio', transportUrl: 'https://torrentio.strem.fun/manifest.json' },
    { name: 'Comet', transportUrl: 'https://comet.example.com/manifest.json' },
    { name: 'Cinemeta', transportUrl: 'https://cinemeta.strem.io/manifest.json' },
  ],
};

const SNAPSHOT_B = {
  addons: [
    { name: 'Torrentio', transportUrl: 'https://torrentio.strem.fun/manifest.json' },
    { name: 'Cinemeta', transportUrl: 'https://cinemeta.strem.io/manifest.json' },
    { name: 'NewAddon', transportUrl: 'https://new.example.com/manifest.json' },
  ],
};

test('diffSnapshots: detects added addons', () => {
  const d = diffSnapshots(SNAPSHOT_A, SNAPSHOT_B);
  assert.equal(d.added.length, 1);
  assert.equal(d.added[0].name, 'NewAddon');
});

test('diffSnapshots: detects removed addons', () => {
  const d = diffSnapshots(SNAPSHOT_A, SNAPSHOT_B);
  assert.equal(d.removed.length, 1);
  assert.equal(d.removed[0].name, 'Comet');
});

test('diffSnapshots: detects reordered addons', () => {
  const d = diffSnapshots(SNAPSHOT_A, SNAPSHOT_B);
  assert.equal(d.moved.length, 1);
  assert.equal(d.moved[0].addon.name, 'Cinemeta');
  assert.equal(d.moved[0].from, 2);
  assert.equal(d.moved[0].to, 1);
});

test('diffSnapshots: identical snapshots', () => {
  const d = diffSnapshots(SNAPSHOT_A, SNAPSHOT_A);
  assert.equal(d.added.length, 0);
  assert.equal(d.removed.length, 0);
  assert.equal(d.moved.length, 0);
  assert.ok(!d.hasDifferences);
});

test('diffSnapshots: reports counts', () => {
  const d = diffSnapshots(SNAPSHOT_A, SNAPSHOT_B);
  assert.equal(d.totalA, 3);
  assert.equal(d.totalB, 3);
  assert.ok(d.hasDifferences);
});

test('diffSnapshots: handles empty snapshots', () => {
  const d = diffSnapshots({ addons: [] }, SNAPSHOT_A);
  assert.equal(d.added.length, 3);
  assert.equal(d.removed.length, 0);
});

test('formatDiff: produces readable output', () => {
  const d = diffSnapshots(SNAPSHOT_A, SNAPSHOT_B);
  const text = formatDiff(d);
  assert.ok(text.includes('Added (1)'));
  assert.ok(text.includes('Removed (1)'));
  assert.ok(text.includes('Reordered (1)'));
  assert.ok(text.includes('NewAddon'));
  assert.ok(text.includes('Comet'));
});

test('formatDiff: no differences message', () => {
  const d = diffSnapshots(SNAPSHOT_A, SNAPSHOT_A);
  const text = formatDiff(d);
  assert.ok(text.includes('No differences found'));
});
