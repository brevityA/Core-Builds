import test from 'node:test';
import assert from 'node:assert/strict';
import { sizePolicy, bitratePolicy, filterPolicy, isHighResolution } from '../src/core/filter-policy.js';

test('size policy includes 2160p bounds only for high-resolution inputs', () => {
  assert.equal(isHighResolution({ resolution:'4k' }), true);
  assert.equal(sizePolicy({ resolution:'4k' }).resolution['2160p'].movies[1], 150000000000);
  assert.equal(sizePolicy({ resolution:'1080p' }).resolution['2160p'], undefined);
});

test('bitrate policy applies the 80 percent bandwidth cap', () => {
  const cfg = bitratePolicy({ resolution:'mixed', bandwidthMbps:100 }, false);
  assert.equal(cfg.useMetadataRuntime, false);
  assert.deepEqual(cfg.global.movies, [1000000, 80000000]);
  assert.deepEqual(cfg.resolution['2160p'].movies, [5000000, 80000000]);
});

test('size policy applies the selected max file size to built-in global bounds', () => {
  const cfg = sizePolicy({ resolution:'1080p', sizeLimit:'10' });
  assert.deepEqual(cfg.global.movies, [0, 10_000_000_000]);
  assert.deepEqual(cfg.global.series, [0, 10_000_000_000]);
  assert.deepEqual(cfg.resolution['1080p'].movies, [0, 10_000_000_000]);
  assert.deepEqual(cfg.resolution['720p'].series, [0, 8_000_000_000]);
});

test('size policy rejects non-finite sizeLimit', () => {
  const cfg = sizePolicy({ resolution:'1080p', sizeLimit:'Infinity' });
  assert.deepEqual(cfg.global.movies, [1610612736, 80000000000]);
});

test('filter policy combines pure size and bitrate policies', () => {
  const cfg = filterPolicy({ resolution:'1080p', bandwidthMbps:50 }, { hasTmdb:true });
  assert.equal(cfg.bitrate.useMetadataRuntime, true);
  assert.equal(cfg.size.resolution['1080p'].series[1], 20000000000);
});
