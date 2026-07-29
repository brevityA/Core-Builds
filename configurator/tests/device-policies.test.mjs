import test from 'node:test';
import assert from 'node:assert/strict';
import { resolutionPolicy, encodePolicy, audioPolicy } from '../src/core/device-policies.js';

const av1Safe = new Set(['shield', 'windows']);
const limited = new Set(['appletv-old', 'firestick-hd']);

test('resolution policy preserves 4K, 1080p, and mixed output contracts', () => {
  assert.deepEqual(resolutionPolicy({ resolution: '4k', streamPool: 'normal' }).requiredResolutions, []);
  assert.deepEqual(resolutionPolicy({ resolution: '1080p' }).requiredResolutions, ['1080p', '720p']);
  assert.deepEqual(resolutionPolicy({ resolution: 'mixed' }).preferredResolutions, ['2160p','1080p','1440p','720p','576p','480p','Unknown']);
});

test('encode policy is conservative for unsupported devices', () => {
  assert.deepEqual(encodePolicy({ device: 'appletv-new' }, av1Safe).excludedEncodes, ['AV1', 'VC-1']);
  assert.deepEqual(encodePolicy({ device: 'shield' }, av1Safe).preferredEncodes, ['HEVC','AV1','AVC','Unknown']);
});

test('audio policy applies forced device limits and Dolby preferences', () => {
  const constrained = audioPolicy({ device: 'firestick-hd', audio: 'lossless' }, limited);
  assert.ok(constrained.excludedAudioTags.includes('TrueHD'));
  const dolby = audioPolicy({ device: 'shield', audio: 'dolby' }, limited);
  assert.deepEqual(dolby.preferredAudioChannels, ['7.1','5.1','2.0']);
  assert.ok(dolby.preferredAudioTags.includes('Atmos'));
});
