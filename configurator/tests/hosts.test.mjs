import test from 'node:test';
import assert from 'node:assert/strict';
import { HOST_BASE_URLS, HOST_META, MIN_AIOSTREAMS_VERSION } from '../src/data/hosts.js';

test('every host has metadata', () => {
  for (const key of Object.keys(HOST_BASE_URLS)) assert.ok(HOST_META[key], `missing metadata for ${key}`);
});

test('automatic compatibility policy remains explicit', () => {
  assert.equal(MIN_AIOSTREAMS_VERSION, '2.31.1');
  assert.equal(HOST_META.elfhosted.blocksFree, true);
  assert.equal(HOST_META.viren.channel, 'nightly');
  assert.ok(HOST_META.omni.priority > HOST_META.fortheweak.priority);
});
