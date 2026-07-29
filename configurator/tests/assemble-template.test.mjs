import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleTemplate, ALLOWED_MIGRATION_FIELDS } from '../src/core/assemble-template.js';

test('assembleTemplate stamps version metadata and calls sanitizer', () => {
  const tpl = { metadata: { id: 'test' }, config: { autoPlay: { attributes: ['resolution', 'BOGUS'] } } };
  const out = assembleTemplate(tpl, { version: '2.86' });
  assert.equal(out.metadata.coreBuildsVersion, '2.86');
  assert.ok(out.metadata.generatedAt);
  assert.ok(!out.config.autoPlay.attributes.includes('BOGUS'));
});

test('assembleTemplate filters disabled addons via injected matcher', () => {
  const tpl = {
    metadata: {},
    config: {
      presets: [
        { instanceId: 'a', type: 'comet', options: { name: 'Comet' } },
        { instanceId: 'b', type: 'meteor', options: { name: 'Meteor' } },
      ],
    },
  };
  const out = assembleTemplate(tpl, {
    disabledAddons: new Set(['comet']),
    presetMatchesAddon: (p, name) => (p.type || '').toLowerCase() === name.toLowerCase(),
  });
  assert.equal(out.config.presets.length, 1);
  assert.equal(out.config.presets[0].instanceId, 'b');
});

test('assembleTemplate applies only allowed migration fields', () => {
  const tpl = { metadata: {}, config: { size: { global: {} } } };
  const out = assembleTemplate(tpl, {
    migrationKeep: { size: { global: { max: 999 } }, dangerousField: 'hack' },
  });
  assert.deepEqual(out.config.size, { global: { max: 999 } });
  assert.equal(out.config.dangerousField, undefined);
});

test('ALLOWED_MIGRATION_FIELDS covers the documented config sections', () => {
  for (const key of ['services', 'presets', 'sortCriteria', 'formatter', 'size', 'bitrate']) {
    assert.ok(ALLOWED_MIGRATION_FIELDS.has(key), `missing: ${key}`);
  }
  assert.ok(!ALLOWED_MIGRATION_FIELDS.has('addonName'));
  assert.ok(!ALLOWED_MIGRATION_FIELDS.has('trusted'));
});
