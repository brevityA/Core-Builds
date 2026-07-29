import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/core/generate-template.js';

test('generateTemplate composes normalized policies without browser dependencies', () => {
  const result = generateTemplate({
    service:'torbox', device:'shield', resolution:'mixed', bandwidthMbps:'100',
    tmdbApiKey:' key ', qualityFirst:true,
  }, {
    deviceAv1Safe:new Set(['shield']),
    deviceForceLimitedAudio:new Set(),
    presets:[{ type:'torbox', instanceId:'torbox-1', options:{} }],
  });
  assert.equal(result.input.tmdbApiKey, 'key');
  assert.equal(result.hasTmdb, true);
  assert.equal(result.filters.bitrate.global.movies[1], 80_000_000);
  assert.equal(result.addons.presets[0].instanceId, 'torbox-1');
  assert.ok(result.sort);
});

test('generateTemplate delegates final assembly through an injected pure function', () => {
  const result = generateTemplate({}, {
    presets:[],
    assemble: context => ({ kind:'template', service:context.input.service, filter:context.filters })
  });
  assert.equal(result.kind, 'template');
  assert.equal(result.service, 'torbox');
});
