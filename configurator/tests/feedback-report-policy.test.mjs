import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedbackReport, sanitizeFeedbackText } from '../src/core/feedback-report-policy.js';

test('feedback report includes the minimum reproducibility fields without credentials', () => {
  const report = buildFeedbackReport({
    device: 'Fire Stick',
    service: 'TorBox',
    cacheMode: 'Cached only',
    resolution: '4K + 1080p fallback',
    host: 'Example host',
    aiostreamsVersion: '2.31.1',
    profile: 'Core Stable',
  }, {
    contentType: 'Series',
    titleAndEpisode: 'Example Title S02E03',
    addonReturnedStreams: 'No',
    visibleError: 'No streams returned',
  });

  assert.match(report, /Device: Fire Stick/);
  assert.match(report, /Exact title \+ episode: Example Title S02E03/);
  assert.match(report, /Any addon returned streams: No/);
  assert.match(report, /Do not attach API keys/);
});

test('feedback text redacts URLs, token-like fields, and manifest-like IDs', () => {
  const value = 'Error at https://example.invalid/private?x=1 token=do-not-copy password=do-not-copy 12345678-1234-1234-1234-123456789abc';
  const safe = sanitizeFeedbackText(value);
  assert.equal(safe.includes('https://'), false);
  assert.equal(safe.includes('do-not-copy'), false);
  assert.equal(safe.includes('12345678-1234-1234-1234-123456789abc'), false);
  assert.match(safe, /\[redacted URL\]/);
  assert.match(safe, /token=\[redacted\]/i);
  assert.match(safe, /password=\[redacted\]/i);
  assert.match(safe, /\[redacted ID\]/);
});

test('feedback report does not serialize undeclared credential-bearing state', () => {
  const report = buildFeedbackReport({
    device: 'TV',
    service: 'TorBox',
    cacheMode: 'Cached only',
    resolution: '1080p',
    host: 'Example host',
    aiostreamsVersion: '2.31.1',
    profile: 'Balanced',
    creds: { ignored: 'must-not-appear' },
  }, {
    titleAndEpisode: 'Example S01E01',
  });
  assert.equal(report.includes('must-not-appear'), false);
  assert.equal(report.includes('creds'), false);
});
