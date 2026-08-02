import test from 'node:test';
import assert from 'node:assert/strict';

import {
  pushSnapshot,
  popSnapshot,
  peekSnapshot,
  getHistory,
  canUndo,
  clearHistory,
} from '../src/rollback.js';

const makeAddons = (n) => Array.from({ length: n }, (_, i) => ({
  manifest: { name: `Addon${i}` },
  transportUrl: `https://example.com/${i}/manifest.json`,
}));

test('rollback: starts empty', () => {
  clearHistory();
  assert.ok(!canUndo());
  assert.equal(popSnapshot(), null);
  assert.equal(peekSnapshot(), null);
  assert.deepEqual(getHistory(), []);
});

test('rollback: push and pop', () => {
  clearHistory();
  const addons = makeAddons(3);
  pushSnapshot(addons, 'test-push');
  assert.ok(canUndo());
  const snap = popSnapshot();
  assert.equal(snap.label, 'test-push');
  assert.equal(snap.addons.length, 3);
  assert.ok(!canUndo());
});

test('rollback: deep copies addons', () => {
  clearHistory();
  const addons = makeAddons(2);
  pushSnapshot(addons, 'deep-copy');
  addons[0].manifest.name = 'Mutated';
  const snap = popSnapshot();
  assert.equal(snap.addons[0].manifest.name, 'Addon0');
});

test('rollback: peek does not consume', () => {
  clearHistory();
  pushSnapshot(makeAddons(1), 'peek-test');
  const a = peekSnapshot();
  const b = peekSnapshot();
  assert.equal(a.label, 'peek-test');
  assert.equal(b.label, 'peek-test');
  assert.ok(canUndo());
  clearHistory();
});

test('rollback: LIFO order', () => {
  clearHistory();
  pushSnapshot(makeAddons(1), 'first');
  pushSnapshot(makeAddons(2), 'second');
  pushSnapshot(makeAddons(3), 'third');
  assert.equal(popSnapshot().label, 'third');
  assert.equal(popSnapshot().label, 'second');
  assert.equal(popSnapshot().label, 'first');
  assert.ok(!canUndo());
});

test('rollback: max history enforced', () => {
  clearHistory();
  for (let i = 0; i < 15; i++) {
    pushSnapshot(makeAddons(1), `push-${i}`);
  }
  const history = getHistory();
  assert.equal(history.length, 10);
  assert.equal(history[0].label, 'push-5');
  assert.equal(history[9].label, 'push-14');
  clearHistory();
});

test('rollback: ignores empty addons', () => {
  clearHistory();
  pushSnapshot([], 'empty');
  assert.ok(!canUndo());
  pushSnapshot(null, 'null');
  assert.ok(!canUndo());
});

test('rollback: getHistory returns summary', () => {
  clearHistory();
  pushSnapshot(makeAddons(3), 'summary-test');
  const [entry] = getHistory();
  assert.equal(entry.label, 'summary-test');
  assert.equal(entry.addonCount, 3);
  assert.ok(entry.timestamp);
  assert.equal(entry.addons, undefined);
  clearHistory();
});

test('rollback: clearHistory wipes all', () => {
  pushSnapshot(makeAddons(1), 'a');
  pushSnapshot(makeAddons(1), 'b');
  clearHistory();
  assert.ok(!canUndo());
  assert.deepEqual(getHistory(), []);
});
