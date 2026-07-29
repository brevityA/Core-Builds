import test from 'node:test';
import assert from 'node:assert/strict';
import { sortPolicy } from '../src/core/sort-policy.js';

test('free HTTP sorting prioritizes expression match then quality/resolution', () => {
  const sort = sortPolicy({ service:'http', qualityFirst:true, resolution:'1080p' });
  assert.deepEqual(sort.global.slice(0, 4), [
    { key:'streamExpressionMatched', direction:'desc' },
    { key:'streamExpressionScore', direction:'desc' },
    { key:'quality', direction:'desc' },
    { key:'resolution', direction:'desc' },
  ]);
});

test('P2P sorting includes seeders after the quality/resolution preference', () => {
  const keys = sortPolicy({ service:'p2p', qualityFirst:true, resolution:'mixed' }).global.map(x => x.key);
  assert.ok(keys.includes('seeders'));
  assert.equal(keys.indexOf('quality') < keys.indexOf('seeders'), true);
});

test('mixed quality-first sorting is deterministic', () => {
  const a = sortPolicy({ service:'torbox', qualityFirst:false, resolutionFirst:false, resolution:'mixed', pseArch:'apex-mixed' });
  const b = sortPolicy({ service:'torbox', qualityFirst:false, resolutionFirst:false, resolution:'mixed', pseArch:'apex-mixed' });
  assert.deepEqual(a, b);
});
