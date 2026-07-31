import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_PROFILES } from '../src/data/devices.js';

test('capability-based device profiles have safe complete shapes', () => {
  for (const profile of Object.values(DEVICE_PROFILES)) {
    assert.ok(profile.id && profile.label && profile.family);
    assert.ok(profile.video.maxResolution);
    assert.ok(Array.isArray(profile.video.codecs));
    assert.ok(profile.audio.maxChannels);
    assert.ok(profile.playback.maxBitrate);
    assert.ok(Array.isArray(profile.warnings) && profile.warnings.length > 0);
  }
});

test('Android mobile profile is conservative', () => {
  const profile = DEVICE_PROFILES['android-mobile'];
  assert.equal(profile.video.codecs.includes('AV1'), false);
  assert.equal(profile.audio.lossless, false);
  assert.equal(profile.audio.maxChannels, '2.0');
});
