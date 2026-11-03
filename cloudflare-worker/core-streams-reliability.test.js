import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleCoreStreams, _coreStreamsTest } from './core-streams.js';

const TOKEN = '0123456789abcdef0123456789abcdef';
const KEY = 'test-torbox-key-0123456789';
const HASH = 'a'.repeat(40);
const env = (overrides = {}) => ({ CORE_STREAMS_INSTALL_TOKEN: TOKEN, ...overrides });
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});
const playRequest = (method = 'GET') => new Request(
  `https://worker.example/core-streams/${TOKEN}/play/${HASH}/1x1`, { method },
);

beforeEach(() => {
  _coreStreamsTest.resetCinemetaCache();
  _coreStreamsTest.resetTorboxIds();
  _coreStreamsTest.resetSourceHealth();
  _coreStreamsTest.resetResponseCache();
});

function playbackFixture({ create, list, link } = {}) {
  const calls = [];
  let created = 0;
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    if (url.pathname.endsWith('/torrents/createtorrent')) {
      created++;
      return create ? create(created, init) : json({ success: true, data: { torrent_id: 42 } });
    }
    if (url.pathname.endsWith('/torrents/mylist')) {
      const id = Number(url.searchParams.get('id'));
      return list ? list(id) : json({ success: true, data: {
        id, download_present: true, files: [{ id: 7, name: 'Show.S01E01.mkv', size: 100 }],
      } });
    }
    if (url.pathname.endsWith('/torrents/requestdl')) {
      return link ? link(url) : json({ success: true, data: `https://cdn.example.net/${url.searchParams.get('torrent_id')}.mkv` });
    }
    return json({ streams: [] });
  };
  return { calls, fetchImpl };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('Cinemeta metadata is reused across episodes, but not across movies or media types', async () => {
  _coreStreamsTest.resetCinemetaCache();
  _coreStreamsTest.resetSourceHealth();
  const metadataUrls = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    if (url.startsWith('https://v3-cinemeta.strem.io/')) {
      metadataUrls.push(url);
      return json({ meta: { name: 'A Test Show', year: 2020 } });
    }
    return json({ streams: [] });
  };
  for (const id of ['tt0903747:1:1', 'tt0903747:1:2', 'tt0903747:2:1']) {
    const response = await handleCoreStreams(
      new Request(`https://worker.example/core-streams/${TOKEN}/stream/series/${id}.json`), env(), { fetchImpl },
    );
    assert.equal(response.status, 200);
  }
  assert.deepEqual(metadataUrls, ['https://v3-cinemeta.strem.io/meta/series/tt0903747.json']);
  const signal = AbortSignal.timeout(1000);
  await _coreStreamsTest.fetchCinemetaTitleYear('movie', 'tt0903747', fetchImpl, signal);
  await _coreStreamsTest.fetchCinemetaTitleYear('series', 'tt0133093', fetchImpl, signal);
  assert.equal(metadataUrls.length, 3);
  _coreStreamsTest.resetCinemetaCache();
  _coreStreamsTest.resetSourceHealth();
});

test('metadata cache hits survive an open breaker and are reported without request identifiers', async () => {
  _coreStreamsTest.resetCinemetaCache();
  _coreStreamsTest.resetSourceHealth();
  let calls = 0;
  const fetchImpl = async (input) => {
    if (String(input).startsWith('https://v3-cinemeta.strem.io/')) {
      calls++;
      return calls === 1 ? json({ meta: { name: 'Cached title', year: 2001 } }) : json({}, 503);
    }
    return json({ streams: [] });
  };
  const request = () => new Request(`https://worker.example/core-streams/${TOKEN}/stream/series/tt0903747:1:1.json`);
  const first = await handleCoreStreams(request(), env(), { fetchImpl });
  assert.match(first.headers.get('X-Core-Streams-Sources'), /cinemeta=ok/);
  for (let i = 0; i < 3; i++) {
    await _coreStreamsTest.fetchCinemetaTitleYear('series', 'tt0133093', fetchImpl, AbortSignal.timeout(1000));
  }
  const cached = await handleCoreStreams(request(), env(), { fetchImpl });
  const status = cached.headers.get('X-Core-Streams-Sources');
  assert.match(status, /cinemeta=cache hit/);
  assert.ok(!status.includes(TOKEN) && !status.includes('tt0903747'));
  assert.equal(calls, 4);
  _coreStreamsTest.resetCinemetaCache();
  _coreStreamsTest.resetSourceHealth();
});

test('metadata cache expires, evicts its oldest entry at 256 titles, and never caches missing or failed metadata', async () => {
  _coreStreamsTest.resetCinemetaCache();
  _coreStreamsTest.resetSourceHealth();
  const realNow = Date.now;
  let now = 1_000_000;
  let calls = 0;
  let missing = false;
  Date.now = () => now;
  const fetchImpl = async () => {
    calls++;
    return missing ? json({}, 404) : json({ meta: { name: `Title ${calls}`, year: 2000 } });
  };
  const lookup = (id) => _coreStreamsTest.fetchCinemetaTitleYear('movie', id, fetchImpl, AbortSignal.timeout(1000));
  try {
    const first = await lookup('tt0000001');
    assert.deepEqual(await lookup('tt0000001'), first);
    assert.equal(calls, 1);
    now += 6 * 60 * 60 * 1000 + 1;
    await lookup('tt0000001');
    assert.equal(calls, 2);

    missing = true;
    assert.equal(await lookup('tt0000002'), null);
    missing = false;
    assert.ok(await lookup('tt0000002'));
    assert.equal(calls, 4, 'a missing title is fetched again and can become available');

    _coreStreamsTest.resetCinemetaCache();
    calls = 0;
    for (let i = 0; i < 257; i++) await lookup(`tt${String(i + 1).padStart(7, '0')}`);
    const before = calls;
    await lookup('tt0000001');
    assert.equal(calls, before + 1, 'the oldest entry was evicted');
    await lookup('tt0000257');
    assert.equal(calls, before + 1, 'the newest entry remains cached');
  } finally {
    Date.now = realNow;
    _coreStreamsTest.resetCinemetaCache();
    _coreStreamsTest.resetSourceHealth();
  }
});

test('simultaneous GET and HEAD playback requests share one TorBox add but resolve their own CDN links', async () => {
  _coreStreamsTest.resetTorboxIds();
  const gate = deferred();
  const started = deferred();
  const { calls, fetchImpl } = playbackFixture({
    create: async () => { started.resolve(); await gate.promise; return json({ success: true, data: { torrent_id: 42 } }); },
  });
  const options = { fetchImpl };
  const get = handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), options);
  const head = handleCoreStreams(playRequest('HEAD'), env({ TORBOX_API_KEY: KEY }), options);
  await started.promise;
  assert.equal(calls.filter(({ url }) => url.pathname.endsWith('/createtorrent')).length, 1);
  gate.resolve();
  const [getResult, headResult] = await Promise.all([get, head]);
  assert.equal(getResult.status, 302);
  assert.equal(headResult.status, 302);
  assert.equal(headResult.headers.get('Location'), getResult.headers.get('Location'));
  assert.equal(await headResult.text(), '');
  assert.equal(calls.filter(({ url }) => url.pathname.endsWith('/createtorrent')).length, 1);
  assert.equal(calls.filter(({ url }) => url.pathname.endsWith('/requestdl')).length, 2);
  _coreStreamsTest.resetTorboxIds();
});

test('a failed shared add is not cached and the next playback can retry', async () => {
  _coreStreamsTest.resetTorboxIds();
  const gate = deferred();
  const started = deferred();
  const { calls, fetchImpl } = playbackFixture({
    create: async (count) => {
      if (count > 1) return json({ success: true, data: { torrent_id: 43 } });
      started.resolve();
      await gate.promise;
      return json({ success: false, error: 'ACTIVE_LIMIT' }, 400);
    },
  });
  const options = { fetchImpl };
  const first = handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), options);
  const second = handleCoreStreams(playRequest('HEAD'), env({ TORBOX_API_KEY: KEY }), options);
  await started.promise;
  gate.resolve();
  for (const response of await Promise.all([first, second])) {
    assert.equal(response.status, 502);
    assert.match(await response.text(), /ACTIVE_LIMIT/);
  }
  const retry = await handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), options);
  assert.equal(retry.status, 302);
  assert.equal(retry.headers.get('Location'), 'https://cdn.example.net/43.mkv');
  assert.equal(calls.filter(({ url }) => url.pathname.endsWith('/createtorrent')).length, 2);
  _coreStreamsTest.resetTorboxIds();
});

test('rotating the TorBox key cannot reuse another account\'s torrent id', async () => {
  _coreStreamsTest.resetTorboxIds();
  const otherKey = 'another-test-key-0123456789';
  const { calls, fetchImpl } = playbackFixture({
    create: (_count, init) => json({ success: true, data: {
      torrent_id: init.headers.Authorization === `Bearer ${KEY}` ? 42 : 99,
    } }),
  });
  for (const [key, location] of [[KEY, '42'], [otherKey, '99'], [KEY, '42']]) {
    const response = await handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: key }), { fetchImpl });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), `https://cdn.example.net/${location}.mkv`);
    assert.ok(!response.headers.get('Location').includes(key));
  }
  assert.equal(calls.filter(({ url }) => url.pathname.endsWith('/createtorrent')).length, 3);
  _coreStreamsTest.resetTorboxIds();
});

test('a stale TorBox id is invalidated and recreated once in the same playback request', async () => {
  _coreStreamsTest.resetTorboxIds();
  let stale = false;
  const { calls, fetchImpl } = playbackFixture({
    create: (count) => json({ success: true, data: { torrent_id: count === 1 ? 42 : 43 } }),
    list: (id) => stale && id === 42
      ? json({ success: false, error: 'ITEM_NOT_FOUND' }, 404)
      : json({ success: true, data: { id, files: [{ id: 7, name: 'Show.S01E01.mkv', size: 100 }] } }),
  });
  const options = { fetchImpl };
  assert.equal((await handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), options)).status, 302);
  stale = true;
  const recovered = await handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), options);
  assert.equal(recovered.status, 302);
  assert.equal(recovered.headers.get('Location'), 'https://cdn.example.net/43.mkv');
  assert.equal(calls.filter(({ url }) => url.pathname.endsWith('/createtorrent')).length, 2);
  _coreStreamsTest.resetTorboxIds();
});

test('common episode spellings are matched consistently without accepting neighbouring episodes or ranges', () => {
  const matcher = _coreStreamsTest.episodeMatcher(2, 1);
  for (const name of ['Show.S02E01.1080p', 'Show.2x01.720p', 'Show.S02E01-1080p', 'Show.S02E01']) {
    assert.ok(matcher.test(name), name);
  }
  for (const name of ['Show.S02E01E02', 'Show.S02E01-E02', 'Show.2x01-02', 'Show.S02E01.02', 'Show.S02E01.and.E02', 'Show.S02E10', 'Show.S12E01']) {
    assert.ok(!matcher.test(name), name);
  }
  const file = new RegExp(_coreStreamsTest.episodeFilePattern(2, 1));
  for (const name of ['Show.2x01.mkv', 'Show.S02E01', 'Show.S02E01-E02.mkv', 'Season 2/Show - 2x01 - Title.mp4']) {
    assert.ok(file.test(name), name);
  }
  for (const name of ['Show.2x10.mkv', 'Show.12x01.mkv', 'Show.S02E11.mkv']) assert.ok(!file.test(name), name);
  assert.ok(_coreStreamsTest.showTitleMatches('The.Office.US.2x01.1080p', 'The Office'));
  assert.ok(_coreStreamsTest.showTitleMatches('The Office US S02 E01 1080p', 'The Office'));
  assert.ok(!_coreStreamsTest.showTitleMatches('The Office Party 2x01', 'The Office'));
});

test('TorBox opens NxN episode files and multipart episode files inside a pack', () => {
  const files = [
    { id: 1, name: 'Show.2x02.mkv', size: 20 },
    { id: 2, name: 'Show.2x01-03.mkv', size: 30 },
    { id: 3, name: 'Show.2x10.mkv', size: 40 },
  ];
  const selected = _coreStreamsTest.chooseVideoFile(files, _coreStreamsTest.parsePlaySelector('2x1'));
  assert.equal(selected.id, 2);
});

test('a shared TorBox add outlives its first viewer and keeps the next viewer on the same add', async () => {
  const gate = deferred();
  const started = deferred();
  let addSignal;
  let creates = 0;
  const fetchImpl = async (_input, init = {}) => {
    creates++;
    addSignal = init.signal;
    started.resolve();
    await gate.promise;
    return json({ success: true, data: { torrent_id: 42 } });
  };
  const firstViewer = new AbortController();
  const secondViewer = new AbortController();
  const first = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, firstViewer.signal);
  await started.promise;
  const second = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, secondViewer.signal);
  firstViewer.abort(Object.assign(new Error('first viewer timed out'), { name: 'TimeoutError' }));
  await assert.rejects(first, /first viewer timed out/);
  assert.equal(creates, 1);
  assert.equal(addSignal.aborted, false, 'the shared add is not owned by the first viewer');
  gate.resolve();
  assert.deepEqual(await second, { id: 42, cached: false });
  assert.equal(creates, 1);
});

test('a joined viewer whose deadline is still live replaces an aborted shared add once, and other waiters join that replacement', async () => {
  const firstGate = deferred();
  const firstStarted = deferred();
  const replacementStarted = deferred();
  let creates = 0;
  const fetchImpl = async () => {
    creates++;
    if (creates === 1) {
      firstStarted.resolve();
      await firstGate.promise;
      throw Object.assign(new Error('shared add timed out'), { name: 'TimeoutError' });
    }
    replacementStarted.resolve();
    return json({ success: true, data: { torrent_id: 43 } });
  };
  const ownerViewer = new AbortController();
  const joinedViewer = new AbortController();
  const otherViewer = new AbortController();
  const owner = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, ownerViewer.signal);
  await firstStarted.promise;
  const joined = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, joinedViewer.signal);
  const other = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, otherViewer.signal);
  firstGate.resolve();
  const [ownerResult, joinedResult, otherResult] = await Promise.allSettled([owner, joined, other]);
  assert.equal(ownerResult.status, 'rejected', 'the original add still reports its own failure');
  assert.equal(joinedResult.status, 'fulfilled');
  assert.equal(otherResult.status, 'fulfilled');
  assert.deepEqual(joinedResult.value, { id: 43, cached: false });
  assert.deepEqual(otherResult.value, { id: 43, cached: false });
  assert.equal(creates, 2, 'waiters coalesce behind one replacement');
  assert.equal(joinedViewer.signal.aborted, false);
  assert.equal(otherViewer.signal.aborted, false);
  await replacementStarted.promise;
});

test('a viewer whose own deadline aborts does not start a replacement TorBox add', async () => {
  const gate = deferred();
  const started = deferred();
  let creates = 0;
  const fetchImpl = async () => {
    creates++;
    started.resolve();
    await gate.promise;
    return json({ success: true, data: { torrent_id: 42 } });
  };
  const ownerViewer = new AbortController();
  const joinedViewer = new AbortController();
  const owner = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, ownerViewer.signal);
  await started.promise;
  const joined = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, joinedViewer.signal);
  joinedViewer.abort(Object.assign(new Error('viewer timed out'), { name: 'TimeoutError' }));
  await assert.rejects(joined, /viewer timed out/);
  assert.equal(creates, 1);
  gate.resolve();
  assert.deepEqual(await owner, { id: 42, cached: false });
  assert.equal(creates, 1);
});

test('a joined viewer gets at most one replacement when the shared TorBox add keeps timing out', async () => {
  let creates = 0;
  const fetchImpl = async () => {
    creates++;
    throw Object.assign(new Error('shared add timed out'), { name: 'TimeoutError' });
  };
  const ownerViewer = new AbortController();
  const joinedViewer = new AbortController();
  const owner = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, ownerViewer.signal);
  // Let the first add settle before the second viewer joins, so the second
  // viewer exercises the replacement path rather than the initial add.
  await assert.rejects(owner, /shared add timed out/);
  await assert.rejects(
    _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, joinedViewer.signal),
    /shared add timed out/,
  );
  assert.equal(creates, 2, 'one initial add and one replacement, not an unbounded retry loop');
  assert.equal(joinedViewer.signal.aborted, false);
});

test('replacement TorBox adds are bounded even when the replacement also aborts', async () => {
  const firstGate = deferred();
  const firstStarted = deferred();
  let creates = 0;
  const fetchImpl = async () => {
    creates++;
    if (creates === 1) {
      firstStarted.resolve();
      await firstGate.promise;
    }
    throw Object.assign(new Error('shared add timed out'), { name: 'TimeoutError' });
  };
  const ownerViewer = new AbortController();
  const joinedViewer = new AbortController();
  const owner = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, ownerViewer.signal);
  await firstStarted.promise;
  const joined = _coreStreamsTest.ensureTorboxTorrent(HASH, KEY, fetchImpl, joinedViewer.signal);
  firstGate.resolve();
  const [ownerResult, joinedResult] = await Promise.allSettled([owner, joined]);
  assert.equal(ownerResult.status, 'rejected');
  assert.equal(joinedResult.status, 'rejected');
  assert.equal(creates, 2, 'the replacement is not retried again');
  assert.equal(joinedViewer.signal.aborted, false);
});
