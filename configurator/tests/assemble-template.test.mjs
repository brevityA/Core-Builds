import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleTemplate, ALLOWED_MIGRATION_FIELDS } from '../src/core/assemble-template.js';

test('assembleTemplate is pure and does not invent volatile metadata', () => {
  const source = { config:{ autoPlay:{ attributes:['bad'] } }, metadata:{ name:'Test' } };
  const result = assembleTemplate(source, { metadata:{ coreBuildsVersion:'2.86' } });
  assert.notEqual(result, source);
  assert.equal(source.metadata.generatedAt, undefined);
  assert.equal(result.metadata.generatedAt, undefined);
  assert.equal(result.metadata.coreBuildsVersion, '2.86');
  assert.notEqual(result.config, source.config);
});

test('assembleTemplate applies only allowlisted migration fields', () => {
  const result = assembleTemplate({ config:{ sortCriteria:{} } }, {
    migrationKeep:{ sortCriteria:{ global:[] }, secret:'must-not-copy' },
  });
  assert.deepEqual(result.config.sortCriteria, { global:[] });
  assert.equal(result.config.secret, undefined);
});

test('assembleTemplate filters disabled addons without mutating input', () => {
  const source = { config:{ presets:[{ instanceId:'a' }, { instanceId:'b' }] } };
  const result = assembleTemplate(source, {
    disabledAddons:new Set(['b']),
    presetMatchesAddon:(preset, name) => preset.instanceId === name,
  });
  assert.deepEqual(result.config.presets.map(p => p.instanceId), ['a']);
  assert.deepEqual(source.config.presets.map(p => p.instanceId), ['a','b']);
});

test('ALLOWED_MIGRATION_FIELDS covers the documented config sections', () => {
  for (const key of ['services', 'presets', 'sortCriteria', 'formatter', 'size', 'bitrate']) {
    assert.ok(ALLOWED_MIGRATION_FIELDS.has(key), `missing: ${key}`);
  }
  assert.ok(!ALLOWED_MIGRATION_FIELDS.has('addonName'));
  assert.ok(!ALLOWED_MIGRATION_FIELDS.has('trusted'));
});
