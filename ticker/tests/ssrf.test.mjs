import test from 'node:test';
import assert from 'node:assert/strict';

import { isSafeFeedUrl } from '../lib/ssrf.mjs';

test('allows public https feeds', () => {
  const result = isSafeFeedUrl('https://example.com/sports.xml');
  assert.equal(result.ok, true);
});

test('blocks localhost and metadata', () => {
  assert.equal(isSafeFeedUrl('http://127.0.0.1/rss').ok, false);
  assert.equal(isSafeFeedUrl('http://localhost/rss').ok, false);
  assert.equal(isSafeFeedUrl('http://169.254.169.254/latest').ok, false);
  assert.equal(isSafeFeedUrl('http://10.0.0.8/feed').ok, false);
  assert.equal(isSafeFeedUrl('file:///etc/passwd').ok, false);
});
