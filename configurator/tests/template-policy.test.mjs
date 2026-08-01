import test from 'node:test';
import assert from 'node:assert/strict';
import { hasTmdbCredentials, tmdbFeaturePolicy, bandwidthCapMbps, templateInput } from '../src/core/template-policy.js';

test('TMDB policy is pure and disabled when credentials are absent', () => {
  assert.equal(hasTmdbCredentials({}), false);
  assert.deepEqual(tmdbFeaturePolicy({}), {
    hasTmdb: false,
    bitrate: { useMetadataRuntime: false },
    digitalReleaseFilter: { enabled: false },
    titleMatching: { enabled: false },
    yearMatching: { enabled: false },
  });
});

test('TMDB policy enables metadata-dependent features for either credential', () => {
  assert.equal(hasTmdbCredentials({ tmdbToken: ' token ' }), true);
  assert.equal(tmdbFeaturePolicy({ tmdbApiKey: 'key' }).titleMatching.enabled, true);
});

test('bandwidth policy applies an 80 percent cap and safe fallback', () => {
  assert.equal(bandwidthCapMbps(100), 80_000_000);
  assert.equal(bandwidthCapMbps(0), 150_000_000);
  assert.equal(bandwidthCapMbps('invalid'), 150_000_000);
});

test('template input normalizes defaults without browser dependencies', () => {
  assert.deepEqual(templateInput({ service: ' torbox ', tmdbApiKey: ' key ' }), {
    service: ' torbox ',
    device: 'generic',
    resolution: '1080p',
    architecture: 'standard',
    pseArch: 'standard',
    tmdbToken: '',
    tmdbApiKey: 'key',
    bandwidthMbps: 0,
    sizeLimit: 'unlimited',
  });
});

test('template input strips GB suffix and rejects invalid sizeLimit', () => {
  assert.equal(templateInput({ sizeLimit: '10GB' }).sizeLimit, '10');
  assert.equal(templateInput({ sizeLimit: '25gb' }).sizeLimit, '25');
  assert.equal(templateInput({ sizeLimit: 'abc' }).sizeLimit, 'unlimited');
  assert.equal(templateInput({ sizeLimit: '-5' }).sizeLimit, 'unlimited');
  assert.equal(templateInput({ sizeLimit: 'Infinity' }).sizeLimit, 'unlimited');
});
