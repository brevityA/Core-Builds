import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleCoreStreams, _coreStreamsTest } from './core-streams.js';
import {
  createResponseCache, createHeaderLimiter, responseCacheKey, envInteger,
} from './core-streams-performance.js';

const TOKEN = '0123456789abcdef0123456789abcdef';
const KEY_A = 'test-torbox-key-aaaaaaaaaaaa';
const KEY_B = 'test-torbox-key-bbbbbbbbbbbb';
const env = (overrides = {}) => ({ CORE_STREAMS_INSTALL_TOKEN: TOKEN, ...overrides });
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});
const request = (id = 'tt0133093', origin = 'https://worker.example') =>
  new Request(`${origin}/core-streams/${TOKEN}/stream/movie/${id}.json`);

beforeEach(() => {
  _coreStreamsTest.resetCinemetaCache();
  _coreStreamsTest.resetResponseCache();
  _coreStreamsTest.resetSourceHealth();
  _coreStreamsTest.resetTorboxIds();
});

function sourceFixture({ fail = false, streams } = {}) {
  let calls = 0;
  const fetchImpl = async (input) => {
    calls++;
    const url = String(input);
    if (url.startsWith('https://torrentio.strem.fun/')) {
      if (fail) return json({}, 503);
      return json({ streams: streams || [{ infoHash: 'a'.repeat(40), name: '1080p WEB-DL', title: 'Film.2001.1080p.WEB-DL 👤 50' }] });
    }
    if (url.startsWith('https://v3-cinemeta.strem.io/')) return json({ meta: { name: 'A Film', year: 2001 } });
    return json({ streams: [] });
  };
  return { fetchImpl, calls: () => calls };
}

test('repeat lookup is served from the isolate cache without asking any source again', async () => {
  const fixture = sourceFixture();
  const first = await handleCoreStreams(request(), env(), { fetchImpl: fixture.fetchImpl });
  const second = await handleCoreStreams(request(), env(), { fetchImpl: fixture.fetchImpl });
  assert.equal(first.headers.get('X-Core-Streams-Cache'), 'miss');
  assert.equal(second.headers.get('X-Core-Streams-Cache'), 'hit');
  assert.deepEqual(await second.json(), await first.json());
  const afterFirst = fixture.calls();
  assert.ok(afterFirst > 0);
  await handleCoreStreams(request(), env(), { fetchImpl: fixture.fetchImpl });
  assert.equal(fixture.calls(), afterFirst);
  assert.equal(second.headers.get('Cache-Control'), 'no-store', 'client/CDN caching stays disabled');
});

test('simultaneous identical requests share one provider fan-out', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  const fetchImpl = async (input) => {
    calls++;
    if (String(input).startsWith('https://torrentio.strem.fun/')) {
      await gate;
      return json({ streams: [{ infoHash: 'a'.repeat(40), name: '1080p' }] });
    }
    if (String(input).startsWith('https://v3-cinemeta.strem.io/')) return json({ meta: { name: 'A Film', year: 2001 } });
    return json({ streams: [] });
  };
  const a = handleCoreStreams(request(), env(), { fetchImpl });
  const b = handleCoreStreams(request(), env(), { fetchImpl });
  while (calls === 0) await new Promise((resolve) => setImmediate(resolve));
  const afterFanOut = calls;
  release();
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(calls, afterFanOut, 'second request did not start another fan-out');
  assert.deepEqual([ra.headers.get('X-Core-Streams-Cache'), rb.headers.get('X-Core-Streams-Cache')].sort(), ['coalesced', 'miss']);
  assert.deepEqual(await ra.json(), await rb.json());
});

test('cache entries are isolated by TorBox key, configured source, origin and media id', async () => {
  const fixture = sourceFixture();
  const base = env({ TORBOX_API_KEY: KEY_A, CORE_STREAMS_HTTP_SOURCE_MANIFEST: 'https://addon.example/manifest.json' });
  // Avoid live TorBox semantics: this test only exercises key isolation through
  // the pure key function plus handler cache misses for non-TorBox config changes.
  const k1 = await responseCacheKey(['v', 'https://worker.example', TOKEN, 'movie', 'tt1', KEY_A, 'https://a/manifest.json', 0]);
  const variants = [
    ['v', 'https://worker.example', TOKEN, 'movie', 'tt1', KEY_B, 'https://a/manifest.json', 0],
    ['v', 'https://worker.example', TOKEN, 'movie', 'tt1', KEY_A, 'https://b/manifest.json', 0],
    ['v', 'https://other.example', TOKEN, 'movie', 'tt1', KEY_A, 'https://a/manifest.json', 0],
    ['v', 'https://worker.example', TOKEN, 'movie', 'tt2', KEY_A, 'https://a/manifest.json', 0],
  ];
  for (const parts of variants) assert.notEqual(await responseCacheKey(parts), k1);
  assert.ok(!k1.includes(TOKEN) && !k1.includes(KEY_A));

  await handleCoreStreams(request(), env({ CORE_STREAMS_HTTP_SOURCE_MANIFEST: 'https://a.example.com/manifest.json' }), { fetchImpl: fixture.fetchImpl });
  const changed = await handleCoreStreams(request(), env({ CORE_STREAMS_HTTP_SOURCE_MANIFEST: 'https://b.example.com/manifest.json' }), { fetchImpl: fixture.fetchImpl });
  assert.equal(changed.headers.get('X-Core-Streams-Cache'), 'miss');
  const otherId = await handleCoreStreams(request('tt0133094'), env(), { fetchImpl: fixture.fetchImpl });
  assert.equal(otherId.headers.get('X-Core-Streams-Cache'), 'miss');
  assert.ok(base); // documents the account/config inputs covered by the hash above
});

test('partial results get a short TTL, empty results are never cached, and cache can be disabled', async () => {
  const partial = sourceFixture({ fail: true });
  // Give the response one non-Torrentio result so it is non-empty but partial.
  const fetchImpl = async (input) => {
    if (String(input).startsWith('https://torrentsdb.com/')) return json({ streams: [{ infoHash: 'b'.repeat(40), name: '720p' }] });
    return partial.fetchImpl(input);
  };
  const first = await handleCoreStreams(request(), env({ CORE_STREAMS_CACHE_SECONDS: 90 }), { fetchImpl });
  assert.match(first.headers.get('X-Core-Streams-Sources'), /torrentio=http 503/);
  const second = await handleCoreStreams(request(), env({ CORE_STREAMS_CACHE_SECONDS: 90 }), { fetchImpl });
  assert.equal(second.headers.get('X-Core-Streams-Cache'), 'hit');

  const empty = sourceFixture({ streams: [] });
  await handleCoreStreams(request('tt0133095'), env(), { fetchImpl: empty.fetchImpl });
  const before = empty.calls();
  await handleCoreStreams(request('tt0133095'), env(), { fetchImpl: empty.fetchImpl });
  assert.ok(empty.calls() > before, 'empty response was not cached');

  const disabled = sourceFixture();
  await handleCoreStreams(request('tt0133096'), env({ CORE_STREAMS_CACHE_SECONDS: 0 }), { fetchImpl: disabled.fetchImpl });
  const again = await handleCoreStreams(request('tt0133096'), env({ CORE_STREAMS_CACHE_SECONDS: 0 }), { fetchImpl: disabled.fetchImpl });
  assert.equal(again.headers.get('X-Core-Streams-Cache'), 'bypass');
});

test('response cache enforces entry and byte bounds and expires entries', async () => {
  let now = 1000;
  const cache = createResponseCache({ maxEntries: 2, maxBytes: 10_000, now: () => now });
  const value = { streams: [{ infoHash: 'a'.repeat(40) }], sources: 'ok', partial: false };
  cache.set('a', value, 10);
  cache.set('b', value, 10);
  cache.set('c', value, 10);
  assert.equal(cache.stats().entries, 2);
  assert.equal(cache.get('a'), null);
  now += 10_001;
  assert.equal(cache.get('b'), null);
  const tiny = createResponseCache({ maxBytes: 10 });
  assert.equal(tiny.set('x', value, 10), false);
  assert.equal(tiny.stats().entries, 0);
});

test('header limiter never exceeds six waiting fetches and releases slots on failure', async () => {
  let active = 0;
  let peak = 0;
  let started = 0;
  const gates = Array.from({ length: 10 }, () => {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
  });
  const limited = createHeaderLimiter(async (index) => {
    started++;
    active++;
    peak = Math.max(peak, active);
    await gates[index].promise;
    active--;
    if (index === 0) throw new Error('headers failed');
    return json({ ok: true });
  }, 6);
  const all = gates.map((_, index) => limited(index).catch((error) => error));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 6);
  assert.equal(peak, 6);
  gates[0].resolve();
  await all[0];
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 7, 'failure released a slot');
  gates.slice(1).forEach((gate) => gate.resolve());
  await Promise.all(all);
  assert.equal(peak, 6);
});

test('junk filtering keeps fallbacks and per-resolution cap exempts curated open media', () => {
  const cam = { infoHash: 'a'.repeat(40), name: 'Torrentio · CAM', title: 'Film.2026.HDCAM' };
  const good = { infoHash: 'b'.repeat(40), name: 'Torrentio · 1080p', title: 'Film.2026.1080p.WEB-DL' };
  const open = { url: 'https://archive.org/download/x/x.mp4', name: 'Internet Archive · Public Domain' };
  assert.deepEqual(_coreStreamsTest.dropJunk([cam, good]), [good]);
  assert.deepEqual(_coreStreamsTest.dropJunk([cam]), [cam]);
  const many = Array.from({ length: 12 }, (_, i) => ({ infoHash: String(i).padStart(40, '0'), name: '1080p' }));
  const capped = _coreStreamsTest.limitPerResolution([...many, open, open], 8);
  assert.equal(capped.length, 10);
  assert.equal(capped.filter((stream) => stream.name.startsWith('Internet Archive')).length, 2);
  assert.equal(_coreStreamsTest.limitPerResolution(many, 0).length, 12);
});

test('release scores are memoized per stream object and envInteger validates bounds', () => {
  const stream = { name: '1080p', title: 'Film.2026.1080p.BluRay.REMUX.DV.TrueHD 👤 100' };
  const first = _coreStreamsTest.smartStreamScore(stream);
  stream.title = 'changed after scoring';
  assert.equal(_coreStreamsTest.smartStreamScore(stream), first);
  assert.ok(first > _coreStreamsTest.smartStreamScore({ name: '1080p', title: 'Film.2026.1080p.WEBRip 👤 100' }));
  assert.equal(envInteger('8', 0, 0, 80), 8);
  assert.equal(envInteger('81', 0, 0, 80), 0);
  assert.equal(envInteger('', 90, 0, 300), 90);
});

test('partial cache entries expire after 15 seconds even when a longer TTL is requested', async () => {
  let now = 1000;
  let loads = 0;
  const cache = createResponseCache({ now: () => now });
  const load = async () => { loads++; return { streams: [{ infoHash: 'a'.repeat(40) }], sources: 'torrentio=timeout', partial: true }; };
  assert.equal((await cache.run('k', load, 90)).cache, 'miss');
  now += 14_999;
  assert.equal((await cache.run('k', load, 90)).cache, 'hit');
  now += 2;
  assert.equal((await cache.run('k', load, 90)).cache, 'miss');
  assert.equal(loads, 2);
});

test('rotating the TorBox key or changing the request origin misses the handler cache', async () => {
  const fixture = sourceFixture();
  const fetchImpl = async (input) => {
    if (String(input).startsWith('https://api.torbox.app/')) return json({ success: true, data: [] });
    return fixture.fetchImpl(input);
  };
  const first = await handleCoreStreams(request(), env({ TORBOX_API_KEY: KEY_A }), { fetchImpl });
  assert.equal(first.headers.get('X-Core-Streams-Cache'), 'miss');
  const same = await handleCoreStreams(request(), env({ TORBOX_API_KEY: KEY_A }), { fetchImpl });
  assert.equal(same.headers.get('X-Core-Streams-Cache'), 'hit');
  const rotated = await handleCoreStreams(request(), env({ TORBOX_API_KEY: KEY_B }), { fetchImpl });
  assert.equal(rotated.headers.get('X-Core-Streams-Cache'), 'miss');
  const otherOrigin = await handleCoreStreams(request('tt0133093', 'https://other.example'), env({ TORBOX_API_KEY: KEY_B }), { fetchImpl });
  assert.equal(otherOrigin.headers.get('X-Core-Streams-Cache'), 'miss');
});
