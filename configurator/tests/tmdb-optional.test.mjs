import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tmdbFeaturePolicy } from '../src/core/template-policy.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('generated config disables every TMDB-dependent AIOStreams feature without a key', () => {
  assert.deepEqual(tmdbFeaturePolicy({}), {
    hasTmdb: false,
    bitrate: { useMetadataRuntime: false },
    digitalReleaseFilter: { enabled: false },
    titleMatching: { enabled: false },
    yearMatching: { enabled: false },
  });
  assert.ok(app.includes('hasTmdbCredentials(input)'));
  assert.equal(tmdbFeaturePolicy({}).bitrate.useMetadataRuntime, false);
  assert.ok(app.includes('digitalReleaseFilter: { enabled:hasTmdb'));
  assert.ok(app.includes('titleMatching: { enabled:hasTmdb'));
  assert.ok(app.includes('yearMatching: { enabled:hasTmdb'));
});

test('digital-release passthrough expression is emitted only when TMDB is configured', () => {
  assert.ok(app.includes("...(hasTmdb ? [{ enabled:true, expression:\"/*digitalRelease Bypass*/"));
  assert.doesNotMatch(app, /digitalReleaseFilter:\s*\{\s*enabled:true/);
  assert.doesNotMatch(app, /bitrate:\s*\{\s*useMetadataRuntime:true/);
});

test('Quick Install explains that TMDB is optional and does not add a blocking preflight warning', () => {
  assert.ok(app.includes('Leave both blank and Core Builds will disable every TMDB-dependent feature so AIOStreams accepts the config.'));
  assert.ok(!app.includes("warns.push('No TMDB key"));
});
