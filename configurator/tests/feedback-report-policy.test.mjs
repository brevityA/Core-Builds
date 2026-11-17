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

test('feedback text redacts "Bearer <value>" header syntax (value, not just keyword)', () => {
  const safe = sanitizeFeedbackText('request failed: Authorization: Bearer sk-super-secret-123');
  assert.equal(safe.includes('sk-super-secret-123'), false);
  assert.match(safe, /Authorization \[redacted\]/i);
  // bare "Bearer <token>" outside an Authorization header too
  const bare = sanitizeFeedbackText('retry with Bearer sk-standalone-999 please');
  assert.equal(bare.includes('sk-standalone-999'), false);
});

test('feedback text redacts Basic, Token, and general Authorization schemes as well as colon values', () => {
  const basic = sanitizeFeedbackText('request failed: Authorization: Basic dXNlcjpwYXNz==, code 401');
  assert.equal(basic.includes('dXNlcjpwYXNz'), false);
  assert.equal(basic.includes('Basic'), false);
  assert.match(basic, /Authorization \[redacted\], code 401/i);

  const tokenScheme = sanitizeFeedbackText('Authorization: Token tok-secret-456; retry');
  assert.equal(tokenScheme.includes('tok-secret-456'), false);
  assert.match(tokenScheme, /Authorization \[redacted\]; retry/i);

  const customScheme = sanitizeFeedbackText('Authorization: CustomScheme custom-secret-789, ok');
  assert.equal(customScheme.includes('custom-secret-789'), false);
  assert.match(customScheme, /Authorization \[redacted\], ok/i);

  const colonCred = sanitizeFeedbackText('Authorization: user:colon-secret-000');
  assert.equal(colonCred.includes('colon-secret-000'), false);
  assert.equal(colonCred, 'Authorization [redacted]');
});

test('feedback text redacts credential-bearing URLs (userinfo + query tokens)', () => {
  const userinfo = sanitizeFeedbackText('see https://user:hunter2@api.example.com/v1 for the config');
  assert.equal(userinfo, 'see [redacted URL] for the config');
  const query = sanitizeFeedbackText('see https://api.example.com/v1?key=abc123secret for the config');
  assert.equal(query, 'see [redacted URL] for the config');
});

test('feedback text survives nested objects and arrays without leaking values', () => {
  // object: String() yields '[object Object]' — the inner value must not appear
  const obj = sanitizeFeedbackText({ token: 'nested-secret-token', n: 1 });
  assert.equal(obj.includes('nested-secret-token'), false);
  // array: elements are spaced-joined, so each is redacted independently and
  // adjacent diagnostic content survives
  const arr = sanitizeFeedbackText(['https://x.example/a?token=arr-secret', 'status 502', 'password=arr-pass']);
  assert.equal(arr.includes('arr-secret'), false);
  assert.equal(arr.includes('arr-pass'), false);
  assert.match(arr, /status 502/, 'adjacent diagnostic content must not be swallowed into the URL match');
  // spaced list form: each credential is independently redacted
  const list = sanitizeFeedbackText('password=list-pass and token=list-tok, end');
  assert.equal(list.includes('list-pass'), false);
  assert.equal(list.includes('list-tok'), false);
  assert.match(list, /end/);
  // null / undefined degrade to empty, not 'null'/'undefined' text
  assert.equal(sanitizeFeedbackText(null), '');
  assert.equal(sanitizeFeedbackText(undefined), '');
});

test('redaction holds across multiple credentials, case/whitespace and punctuation boundaries', () => {
  const value = 'API_KEY = prod-key-111; Token:tok222. secret=sec333, apikey=x444, authorization: Bearer hdr556~end, code 401';
  const safe = sanitizeFeedbackText(value);
  for (const secret of ['prod-key-111', 'tok222', 'sec333', 'x444', 'hdr556~end']) {
    assert.equal(safe.includes(secret), false, `secret ${secret} must be absent`);
  }
  assert.match(safe, /code 401/, 'trailing diagnostic content must survive');
});

test('the full serialised report contains none of the original secrets', () => {
  const report = buildFeedbackReport({
    device: 'Fire Stick',
    service: 'TorBox',
    host: 'https://host.example.com/?session=host-session-9',
  }, {
    visibleError: '401 at https://api.example.com/v1?token=query-token-7 then Authorization: Bearer b64-token-8; api_key=inline-key-6',
    titleAndEpisode: 'Series S01E01 (uuid 9f8e7d6c-5b4a-3210-fedc-ba9876543210)',
  });
  for (const secret of ['host-session-9', 'query-token-7', 'b64-token-8', 'inline-key-6', '9f8e7d6c-5b4a-3210-fedc-ba9876543210']) {
    assert.equal(report.includes(secret), false, `secret ${secret} must be absent from the full report`);
  }
  // the report is still useful: non-secret content survives
  assert.match(report, /Fire Stick/);
  assert.match(report, /Series S01E01/);
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

test('buildFeedbackReport redacts Authorization: Basic base64 credentials from serialized output', () => {
  const report = buildFeedbackReport({
    device: 'Fire Stick',
    service: 'TorBox',
    host: 'Example host',
  }, {
    titleAndEpisode: 'Series S01E01',
    visibleError: 'HTTP 401 Authorization: Basic dXNlcjpwYXNz; token=inline-tok-2',
  });
  assert.equal(report.includes('dXNlcjpwYXNz'), false);
  assert.equal(report.includes('Basic'), false);
  assert.equal(report.includes('inline-tok-2'), false);
  assert.match(report, /Authorization \[redacted\]/i);
  assert.match(report, /Fire Stick/);
  assert.match(report, /Series S01E01/);
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
  assert.equal(safe, 'Authorization [redacted]; No streams returned');
});

test('sanitizeFeedbackText redacts a Digest header with nested quotes and a URL-valued uri', () => {
  const safe = sanitizeFeedbackText(
    'Authorization: Digest username="user1", uri="https://example.invalid/private/manifest.json", response="6629fae49393a05397450978507c4ef1"',
  );
  assert.equal(safe, 'Authorization [redacted]');
});

test('sanitizeFeedbackText redacts the Token scheme and a lowercase header name', () => {
  const safe = sanitizeFeedbackText('authorization=Token 0123456789abcdef');
  assert.equal(safe, 'authorization [redacted]');
});

test('sanitizeFeedbackText leaves plain prose about authorization untouched', () => {
  assert.equal(
    sanitizeFeedbackText('Check the authorization settings for this addon'),
    'Check the authorization settings for this addon',
  );
});

test('sanitizeFeedbackText leaves an authorization header with no value untouched', () => {
  assert.equal(sanitizeFeedbackText('Authorization:'), 'Authorization:');
});

test('sanitizeFeedbackText stays linear on long adversarial Authorization input', () => {
  const hostile = `Authorization: Digest ${'a="'.repeat(20000)}`;
  const started = performance.now();
  const safe = sanitizeFeedbackText(hostile, 5000);
  const elapsed = performance.now() - started;
  assert.equal(safe, 'Authorization [redacted]');
  assert.equal(elapsed < 2000, true, `sanitization took ${elapsed.toFixed(1)}ms`);
});

test('sanitizeFeedbackText stays linear on long adversarial Bearer spacing', () => {
  const hostile = `Bearer${' '.repeat(50000)}short`;
  const started = performance.now();
  const safe = sanitizeFeedbackText(hostile, 5000);
  const elapsed = performance.now() - started;
  assert.equal(safe, 'Bearer short');
  assert.equal(elapsed < 2000, true, `sanitization took ${elapsed.toFixed(1)}ms`);
});
