import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAioEnumArrays } from '../src/config/schema-guard.js';

test('sanitizes legacy AIOStreams enum arrays', () => {
  const config = {
    autoPlay: { attributes: ['resolution', 'audio', ' language ', 'bogus', 'audioTags'] },
    cacheAndPlay: { streamTypes: ['usenet', 'torrent', 'debrid', 'p2p', 'nzb', 'invalid'] },
  };
  sanitizeAioEnumArrays(config);
  assert.deepEqual(config.autoPlay.attributes, ['resolution', 'audioTags', 'languages']);
  assert.deepEqual(config.cacheAndPlay.streamTypes, ['usenet', 'torrent']);
});

test('adds safe defaults when arrays contain no valid values', () => {
  const config = { autoPlay: { attributes: ['bad'] }, cacheAndPlay: { streamTypes: ['bad'] } };
  sanitizeAioEnumArrays(config);
  assert.deepEqual(config.autoPlay.attributes, ['resolution', 'quality', 'releaseGroup']);
  assert.deepEqual(config.cacheAndPlay.streamTypes, ['usenet', 'torrent']);
});
