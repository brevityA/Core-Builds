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
const streamRequest = (id = 'tt0133093') => new Request(`https://worker.example/core-streams/${TOKEN}/stream/movie/${id}.json`);
const playRequest = () => new Request(`https://worker.example/core-streams/${TOKEN}/play/${HASH}/movie`);

beforeEach(() => {
  _coreStreamsTest.resetCinemetaCache();
  _coreStreamsTest.resetResponseCache();
  _coreStreamsTest.resetSourceHealth();
  _coreStreamsTest.resetTorboxIds();
});

function collector() {
  const events = [];
  return { events, logEvent: (event, fields) => events.push({ event, ...fields }) };
}

function assertSecretFree(events) {
  const serialized = JSON.stringify(events);
  for (const secret of [TOKEN, KEY, HASH, 'tt0133093', 'https://worker.example', 'https://cdn.example.net']) {
    assert.ok(!serialized.includes(secret), `telemetry leaked ${secret}`);
  }
}

test('lookup telemetry reports cache/source outcomes without identifiers or URLs', async () => {
  const { events, logEvent } = collector();
  const fetchImpl = async (input) => {
    const url = String(input);
    if (url.startsWith('https://torrentio.strem.fun/')) {
      return json({ streams: [{ infoHash: HASH, name: '1080p', title: 'Film.2001.1080p.WEB-DL' }] });
    }
    if (url.startsWith('https://v3-cinemeta.strem.io/')) return json({ meta: { name: 'A Film', year: 2001 } });
    return json({ streams: [] });
  };
  await handleCoreStreams(streamRequest(), env(), { fetchImpl, logEvent });
  await handleCoreStreams(streamRequest(), env(), { fetchImpl, logEvent });
  const lookups = events.filter((event) => event.event === 'core_streams_lookup');
  assert.deepEqual(lookups.map((event) => event.cache), ['miss', 'hit']);
  assert.ok(lookups.every((event) => Number.isInteger(event.ms) && event.ms >= 0));
  assert.ok(events.some((event) => event.event === 'core_streams_source' && event.source === 'torrentio' && event.outcome === 'ok'));
  assertSecretFree(events);
});

test('TorBox play telemetry reports success/failure without hash, key or CDN link', async () => {
  const { events, logEvent } = collector();
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/createtorrent')) return json({ success: true, data: { torrent_id: 42 } });
    if (url.pathname.endsWith('/mylist')) return json({ success: true, data: { files: [{ id: 7, name: 'Film.mkv', size: 100 }] } });
    if (url.pathname.endsWith('/requestdl')) return json({ success: true, data: 'https://cdn.example.net/film.mkv' });
    return json({ success: false, error: 'NOPE' }, 500);
  };
  const ok = await handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), { fetchImpl, logEvent });
  assert.equal(ok.status, 302);
  assert.ok(events.some((event) => event.event === 'core_streams_torbox_add' && event.outcome === 'success'));
  assert.ok(events.some((event) => event.event === 'core_streams_play' && event.outcome === 'success' && event.status === 302));
  assertSecretFree(events);
});

test('repeated TorBox play outages fast-fail playback and keep stream results P2P until recovery', async () => {
  const realNow = Date.now;
  let now = 1_000_000;
  let outage = true;
  let creates = 0;
  Date.now = () => now;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/createtorrent')) {
      creates++;
      return outage ? json({ success: false, error: 'UPSTREAM_UNAVAILABLE' }, 503) : json({ success: true, data: { torrent_id: 42 } });
    }
    if (url.pathname.endsWith('/mylist')) return json({ success: true, data: { files: [{ id: 7, name: 'Film.mkv', size: 100 }] } });
    if (url.pathname.endsWith('/requestdl')) return json({ success: true, data: 'https://cdn.example.net/film.mkv' });
    if (url.pathname.endsWith('/checkcached')) return json({ success: true, data: [{ hash: HASH, files: [{ name: 'Film.mkv', size: 100 }] }] });
    if (String(input).startsWith('https://torrentio.strem.fun/')) return json({ streams: [{ infoHash: HASH, name: '1080p' }] });
    if (String(input).startsWith('https://v3-cinemeta.strem.io/')) return json({ meta: { name: 'A Film', year: 2001 } });
    return json({ streams: [] });
  };
  try {
    for (let i = 0; i < 3; i++) {
      const response = await handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), { fetchImpl });
      assert.equal(response.status, 502);
    }
    const before = creates;
    const paused = await handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), { fetchImpl });
    assert.equal(paused.status, 503);
    assert.equal(paused.headers.get('Retry-After'), '30');
    assert.equal(creates, before, 'paused playback does not add another torrent');

    const streams = await handleCoreStreams(streamRequest('tt0133094'), env({ TORBOX_API_KEY: KEY }), { fetchImpl });
    const payload = await streams.json();
    assert.match(streams.headers.get('X-Core-Streams-Sources'), /torbox=paused/);
    assert.ok(payload.streams.length > 0);
    assert.ok(payload.streams.every((stream) => !String(stream.name).startsWith('TorBox')));

    now += 30_001;
    outage = false;
    const recovered = await handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), { fetchImpl });
    assert.equal(recovered.status, 302);
  } finally {
    Date.now = realNow;
    _coreStreamsTest.resetSourceHealth();
    _coreStreamsTest.resetTorboxIds();
  }
});

test('TorBox account limits do not open the outage breaker', async () => {
  let creates = 0;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/createtorrent')) {
      creates++;
      return json({ success: false, error: 'ACTIVE_LIMIT' }, 400);
    }
    return json({ success: false, error: 'NOPE' }, 500);
  };
  for (let i = 0; i < 4; i++) {
    const response = await handleCoreStreams(playRequest(), env({ TORBOX_API_KEY: KEY }), { fetchImpl });
    assert.equal(response.status, 502);
    assert.match(await response.text(), /ACTIVE_LIMIT/);
  }
  assert.equal(creates, 4, 'account-limit errors are reported, not treated as a TorBox outage');
});
