import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_AUDIO_DEFAULTS, DEVICE_FORCE_LIMITED_AUDIO, DEVICE_AV1_SAFE, DEVICE_DV_SAFE } from '../src/data/devices.js';

test('corrected conservative device capabilities remain enforced', () => {
  assert.equal(DEVICE_AUDIO_DEFAULTS['appletv-new'], 'standard');
  assert.equal(DEVICE_AV1_SAFE.has('appletv-new'), false);
  assert.equal(DEVICE_AV1_SAFE.has('chromecast'), false);
  assert.equal(DEVICE_AV1_SAFE.has('xiaomi'), true);
  assert.equal(DEVICE_DV_SAFE.has('onn'), false);
  assert.equal(DEVICE_FORCE_LIMITED_AUDIO.has('lgtv'), true);
  assert.equal(DEVICE_FORCE_LIMITED_AUDIO.has('sony'), true);
  assert.equal(DEVICE_AUDIO_DEFAULTS.shield, 'lossless');
});
