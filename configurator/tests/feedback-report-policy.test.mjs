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

test('buildFeedbackReport redacts full comma-separated Authorization: Digest parameter lists', () => {
  const digestHeader = 'Authorization: Digest username="user1", realm="realm@host.com", '
    + 'nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", uri="/api", qop=auth, nc=00000001, '
    + 'cnonce="0a4f113b", response="6629fae49393a05397450978507c4ef1", '
    + 'opaque="5ccc069c403ebaf9f0171e9517f40e41"';
  const report = buildFeedbackReport({ device: 'TV' }, {
    contentType: 'Movie',
    titleAndEpisode: 'Example Title',
    visibleError: digestHeader,
  });

  const leaked = [
    'username',
    'realm@host.com',
    'dcd98b7102dd2f0e8b11d0f600bfb0c093',
    '0a4f113b',
    '6629fae49393a05397450978507c4ef1',
    '5ccc069c403ebaf9f0171e9517f40e41',
  ];
  for (const value of leaked) {
    assert.equal(report.includes(value), false, `leaked digest parameter: ${value}`);
  }
  assert.match(report, /Authorization \[redacted\]/);
});

test('sanitizeFeedbackText redacts a Digest list and keeps following prose after a semicolon', () => {
  const safe = sanitizeFeedbackText(
    'Authorization: Digest username="user1", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", response="6629fae49393a05397450978507c4ef1"; No streams returned',
  );
  assert.match(safe, /^Authorization \[redacted\]; No streams returned$/);
  assert.equal(safe.includes('dcd98b7102'), false);
});

test('sanitizeFeedbackText redacts a Digest header with nested quotes and a URL-valued uri', () => {
  const safe = sanitizeFeedbackText(
    'Authorization: Digest username="user1", uri="https://example.invalid/private/manifest.json", response="6629fae49393a05397450978507c4ef1"',
  );
  assert.equal(safe.includes('example.invalid'), false);
  assert.equal(safe.includes('6629fae49393a05397450978507c4ef1'), false);
  assert.match(safe, /^Authorization \[redacted\]$/);
});

test('sanitizeFeedbackText redacts Authorization: Basic credentials', () => {
  const safe = sanitizeFeedbackText('Authorization: Basic dXNlcjpwYXNzd29yZA==');
  assert.equal(safe.includes('dXNlcjpwYXNzd29yZA'), false);
  assert.match(safe, /^Authorization \[redacted\]$/);
});

test('sanitizeFeedbackText redacts Authorization: Bearer tokens', () => {
  const safe = sanitizeFeedbackText('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0');
  assert.equal(safe.includes('eyJhbGciOiJIUzI1NiJ9'), false);
  assert.match(safe, /^Authorization \[redacted\]$/);
});

test('sanitizeFeedbackText redacts the Token scheme and a lowercase header name', () => {
  const safe = sanitizeFeedbackText('authorization=Token 0123456789abcdef');
  assert.equal(safe.includes('0123456789abcdef'), false);
  assert.match(safe, /^authorization \[redacted\]$/);
});

test('sanitizeFeedbackText redacts custom Authorization schemes and their values', () => {
  const safe = sanitizeFeedbackText('Authorization: CustomScheme some-opaque-value');
  assert.equal(safe.includes('some-opaque-value'), false);
  assert.match(safe, /^Authorization \[redacted\]$/);
});

test('sanitizeFeedbackText redacts a standalone Bearer token without a header name', () => {
  const safe = sanitizeFeedbackText('request sent with Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0');
  assert.equal(safe.includes('eyJhbGciOiJIUzI1NiJ9'), false);
  assert.match(safe, /Bearer \[redacted\]/);
});

test('sanitizeFeedbackText leaves plain prose about authorization untouched', () => {
  assert.equal(
    sanitizeFeedbackText('Check the authorization settings for this addon'),
    'Check the authorization settings for this addon',
  );
});

test('sanitizeFeedbackText redacts an authorization header with no value', () => {
  assert.equal(sanitizeFeedbackText('Authorization:'), 'Authorization:');
});

test('sanitizeFeedbackText stays linear on long adversarial Authorization input', () => {
  const hostile = `Authorization: Digest ${'a="'.repeat(20000)}`;
  const started = performance.now();
  const safe = sanitizeFeedbackText(hostile, 5000);
  const elapsed = performance.now() - started;
  assert.match(safe, /^Authorization \[redacted\]$/);
  assert.equal(elapsed < 2000, true, `sanitization took ${elapsed.toFixed(1)}ms`);
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
