import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const selectorFixture = JSON.parse(readFileSync(
  resolve(root, 'reliability/fixtures/selector-contract.v1.json'),
  'utf8'
));
const timingFixture = JSON.parse(readFileSync(
  resolve(root, 'reliability/fixtures/fetch-timing-contract.v1.json'),
  'utf8'
));
const nabMigrationFixture = JSON.parse(readFileSync(
  resolve(root, 'reliability/fixtures/v232-nab-migration-contract.v1.json'),
  'utf8'
));
const importMatrix = JSON.parse(readFileSync(
  resolve(root, 'reliability/import-matrix.v1.json'),
  'utf8'
));

test('selector fixture corpus is versioned, unique, and credential-free', () => {
  assert.equal(selectorFixture.schemaVersion, 1);
  assert.deepEqual(Object.keys(selectorFixture.upstreamTargets), ['2.31.1', '2.32.0']);
  const streamIds = selectorFixture.streams.map(stream => stream.id);
  assert.equal(new Set(streamIds).size, streamIds.length);
  const selectorIds = selectorFixture.selectors.map(selector => selector.id);
  assert.equal(new Set(selectorIds).size, selectorIds.length);
  for (const selector of selectorFixture.selectors) {
    assert.ok(selector.expected['2.31.1'], `${selector.id} missing v2.31.1 contract`);
    assert.ok(selector.expected['2.32.0'], `${selector.id} missing v2.32.0 contract`);
  }
  const serialised = JSON.stringify(selectorFixture).toLowerCase();
  assert.equal(/(?:api[_-]?key|password|bearer\s|authorization)/.test(serialised), false);
});

test('v2.32 Newznab migration fixture is credential-free and proves legacy TorBox Search is not auto-renamed', () => {
  assert.equal(nabMigrationFixture.schemaVersion, 2);
  assert.equal(nabMigrationFixture.upstreamTarget.version, '2.32.0');
  assert.deepEqual(nabMigrationFixture.expected.options.api, {
    url: 'https://fixture.invalid/newznab/api',
  });
  for (const key of nabMigrationFixture.expected.removedOptionKeys) {
    assert.equal(Object.hasOwn(nabMigrationFixture.input.presets[0].options, key), true);
  }
  assert.equal(nabMigrationFixture.expected.legacyTorboxSearch.manualMigrationRequired, true);
  assert.equal(nabMigrationFixture.expected.legacyTorboxSearch.type, 'torbox-search');
  assert.equal(/(?:api[_-]?key|password|bearer\s|authorization)/.test(JSON.stringify(nabMigrationFixture).toLowerCase()), false);
});

test('manual import matrix is staged and carries no sensitive data', () => {
  assert.equal(importMatrix.schemaVersion, 1);
  assert.equal(importMatrix.lanes.length, 7);
  const byId = new Map(importMatrix.lanes.map(lane => [lane.id, lane]));
  assert.equal(byId.get('v231-local-json').status, 'pending');
  assert.equal(byId.get('v232-local-json').status, 'pending');
  assert.deepEqual(byId.get('v231-import-url').requires, ['v231-local-json']);
  assert.deepEqual(byId.get('v232-newznab-torbox-search-endpoint').requires, ['v232-local-json']);
  assert.equal(byId.get('v232-newznab-torbox-search-endpoint').profile, 'legacy-torbox-search-to-newznab');
  assert.deepEqual(byId.get('v232-direct-install').requires, ['v232-local-json', 'v232-import-url']);
  const serialised = JSON.stringify(importMatrix).toLowerCase();
  assert.equal(/(?:https?:\/\/|bearer\s|[a-f0-9]{32,})/.test(serialised), false);
});

test('timing fixture has scenarios with expected fields', () => {
  assert.equal(timingFixture.schemaVersion, 1);
  assert.ok(Array.isArray(timingFixture.scenarios));
  assert.ok(timingFixture.scenarios.length > 0);
  for (const scenario of timingFixture.scenarios) {
    assert.ok(scenario.id, 'scenario must have an id');
    assert.ok(scenario.expected, `${scenario.id} missing expected block`);
    assert.ok(Array.isArray(scenario.expected.returnedStreamIds), `${scenario.id} missing returnedStreamIds`);
    assert.equal(typeof scenario.expected.earlyExit, 'boolean', `${scenario.id} missing earlyExit`);
  }
});
