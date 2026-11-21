/**
 * UPSTREAM.pin keeps `sameContractSince` at the oldest release that accepts the
 * output, not the oldest with a byte-identical schema: a release may add options
 * and presets the generators never write. Those additions are listed in
 * `addedSinceSameContract`, and this test holds the claim true — no golden config
 * and no branch of the smart template may use one. If a generator starts to,
 * raise sameContractSince to the release that added it (and gate older hosts).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const pin = JSON.parse(await readFile(new URL('../UPSTREAM.pin', import.meta.url), 'utf8'));
const added = pin.addedSinceSameContract || { configKeys: [], presets: [] };

const goldenDir = new URL('../e2e/golden/', import.meta.url);
const goldens = await Promise.all((await readdir(goldenDir)).filter(f => f.endsWith('.json'))
  .map(async f => [f, JSON.parse(await readFile(new URL(f, goldenDir), 'utf8'))]));
const smart = JSON.parse(await readFile(new URL('../../Templates/Smart/core-builds.json', import.meta.url), 'utf8'));

// Every object key and every preset `type` value anywhere in a JSON tree,
// so directive branches (__switch / __if) of the smart template are covered.
function scan(node, keys = new Set(), types = new Set()) {
  if (Array.isArray(node)) { for (const item of node) scan(item, keys, types); return { keys, types }; }
  if (!node || typeof node !== 'object') return { keys, types };
  for (const [key, value] of Object.entries(node)) {
    keys.add(key);
    if (key === 'type' && typeof value === 'string') types.add(value);
    scan(value, keys, types);
  }
  return { keys, types };
}

test('the pin lists what upstream added since the same-contract release', () => {
  assert.ok(pin.sameContractSince, 'sameContractSince');
  assert.ok(Array.isArray(added.configKeys) && Array.isArray(added.presets));
  assert.ok(goldens.length >= 15, 'goldens found');
});

test('no golden config and no smart-template branch uses an addition', () => {
  for (const [name, tree] of [...goldens, ['Templates/Smart/core-builds.json', smart]]) {
    const { keys, types } = scan(tree);
    for (const key of added.configKeys) assert.ok(!keys.has(key), `${name} uses ${key}, added after ${pin.sameContractSince}`);
    for (const type of added.presets) assert.ok(!types.has(type), `${name} emits the ${type} preset, added after ${pin.sameContractSince}`);
  }
});
