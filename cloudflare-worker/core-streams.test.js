import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCoreStreams, _coreStreamsTest } from './core-streams.js';

const TOKEN = '0123456789abcdef0123456789abcdef';
const secureHeaders = { 'Access-Control-Allow-Origin': '*' };
const makeRequest = (path, method = 'GET') => new Request(`https://worker.example${path}`, { method });
const makeEnv = (overrides = {}) => ({ CORE_STREAMS_INSTALL_TOKEN: TOKEN, ...overrides });

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

test('manifest is a Stremio stream-only manifest behind the install token', async () => {
  const response = await handleCoreStreams(makeRequest(`/core-streams/${TOKEN}/manifest.json`), makeEnv(), { headers: secureHeaders });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), {
    id: 'uk.corebuilds.core-streams',
    version: '0.6.0',
    name: 'Core Streams',
    description: 'Stream-source fallback with curated public-domain torrents, Library of Congress films, open media, and configured add-ons.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
  });
});

test('unconfigured or invalid install tokens fail closed without fetching providers', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse({ streams: [] }); };
  const unconfigured = await handleCoreStreams(makeRequest(`/core-streams/${TOKEN}/manifest.json`), {}, { fetchImpl });
  assert.equal(unconfigured.status, 503);
  const badToken = await handleCoreStreams(makeRequest(`/core-streams/${'f'.repeat(32)}/stream/movie/tt0133093.json`), makeEnv(), { fetchImpl });
  assert.equal(badToken.status, 404);
  assert.equal(calls, 0);
});

test('stream request fans out to fixed torrent sources and returns normalized, deduplicated results', async () => {
  const calls = [];
  const fetchImpl = async (input, init) => {
    calls.push({ url: String(input), init });
    if (String(input).startsWith('https://torrentio.strem.fun/')) {
      return jsonResponse({ streams: [
        { infoHash: 'A'.repeat(40), fileIdx: 2, name: '1080p', title: 'Movie release' },
        { url: 'https://cdn.example.com/movie.mp4', name: 'Direct HTTPS' },
        { url: 'http://insecure.example/movie.mp4', name: 'Unsafe HTTP' },
      ] });
    }
    return jsonResponse({ streams: [
      { infoHash: 'a'.repeat(40), fileIdx: 2, name: 'duplicate' },
      { infoHash: 'b'.repeat(40), name: 'another torrent' },
    ] });
  };
  const response = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/movie/tt0133093.json`),
    makeEnv(),
    { headers: secureHeaders, fetchImpl },
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(calls.length, 4, 'three torrent add-ons and Cinemeta are queried once');
  assert.ok(calls.every(({ init }) => init.method === 'GET' && init.redirect === 'manual'));
  assert.equal(payload.streams.length, 3);
  assert.deepEqual(payload.streams.map((item) => item.name), [
    'Torrentio · 1080p', 'Torrentio · Direct HTTPS', 'TorrentsDB · another torrent',
  ]);
  assert.equal(payload.streams[0].infoHash, 'a'.repeat(40));
  assert.equal(payload.streams[0].fileIdx, 2);
  assert.equal(payload.streams[1].url, 'https://cdn.example.com/movie.mp4');
});

test('official Public Domain Movies results are included for movies with a local-rights caveat', async () => {
  _coreStreamsTest.resetSourceHealth();
  const requested = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.startsWith('https://caching.stremio.net/publicdomainmovies.now.sh/')) {
      return jsonResponse({ streams: [{
        infoHash: '9f86563ce2ed86bbfedd5d3e9f4e55aedd660960',
        fileIdx: 0,
        name: '1080p',
        title: '💾 1.24 GB',
      }] });
    }
    return jsonResponse({ streams: [] });
  };
  const response = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/movie/tt0051744.json`), makeEnv(), { fetchImpl },
  );
  const payload = await response.json();
  const pdStream = payload.streams.find((stream) => stream.name.startsWith('Public Domain Movies'));
  assert.ok(pdStream);
  assert.equal(pdStream.infoHash, '9f86563ce2ed86bbfedd5d3e9f4e55aedd660960');
  assert.equal(pdStream.fileIdx, 0);
  assert.match(pdStream.description, /public-domain status can vary by country/i);
  assert.ok(requested.includes(
    'https://caching.stremio.net/publicdomainmovies.now.sh/stream/movie/tt0051744.json',
  ));
  assert.equal(requested.length, 4, 'movie add-on, two general add-ons, and Cinemeta are queried');
  _coreStreamsTest.resetSourceHealth();
});

test('valid IMDb episode ids are passed through encoded; bad type and identifier return empty results', async () => {
  const requestedUrls = [];
  const fetchImpl = async (input) => {
    requestedUrls.push(String(input));
    return jsonResponse({ streams: [] });
  };
  const episode = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/series/tt0944947%3A1%3A2.json`), makeEnv(), { fetchImpl },
  );
  assert.equal(episode.status, 200);
  assert.ok(requestedUrls.includes('https://torrentio.strem.fun/stream/series/tt0944947%3A1%3A2.json'));
  assert.equal(requestedUrls.length, 2, 'the movie-only Public Domain Movies and Cinemeta sources are skipped for episodes');
  assert.ok(!requestedUrls.some((url) => url.includes('publicdomainmovies.now.sh')));
  assert.equal((await episode.json()).streams.length, 0);

  const invalid = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/movie/tt0133093.json`), makeEnv(),
    { fetchImpl: async () => { throw new Error('must not fetch'); } },
  );
  assert.equal(invalid.status, 200);
  assert.deepEqual(await invalid.json(), { streams: [] });

  const wrongType = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/series/tt0944947.json`), makeEnv(),
    { fetchImpl: async () => { throw new Error('must not fetch'); } },
  );
  assert.deepEqual(await wrongType.json(), { streams: [] });
});

test('source failures and redirects are isolated; the working source still returns results', async () => {
  let index = 0;
  const fetchImpl = async (input) => {
    index++;
    if (String(input).startsWith('https://torrentio.strem.fun/')) {
      return new Response('', { status: 302, headers: { Location: 'https://untrusted.example/' } });
    }
    throw new Error('upstream timeout');
  };
  const response = await handleCoreStreams(makeRequest(`/core-streams/${TOKEN}/stream/movie/tt0133093.json`), makeEnv(), { fetchImpl });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { streams: [] });
  assert.equal(index, 4, 'Cinemeta and the three stream providers fail independently');
});

test('failed providers open an isolate-local circuit after three failures and resume probes after cooldown', async () => {
  _coreStreamsTest.resetSourceHealth();
  const realNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('provider unavailable'); };
  const path = `/core-streams/${TOKEN}/stream/movie/tt0133093.json`;
  try {
    for (let i = 0; i < 3; i++) {
      const response = await handleCoreStreams(makeRequest(path), makeEnv(), { fetchImpl });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { streams: [] });
    }
    assert.equal(calls, 12, 'three add-ons and the optional Cinemeta lookup were tried on each of the first three requests');

    const open = await handleCoreStreams(makeRequest(path), makeEnv(), { fetchImpl });
    assert.equal(open.status, 200);
    assert.equal(calls, 12, 'open circuits avoid another upstream wait during the cooldown');

    now += 30_001;
    const recoveryFetch = async (input) => {
      calls++;
      const source = String(input).startsWith('https://torrentio.strem.fun/') ? 'torrentio' : 'torrentsdb';
      return jsonResponse({ streams: [{ url: `https://${source}.example.com/movie.mp4` }] });
    };
    const recovered = await handleCoreStreams(makeRequest(path), makeEnv(), { fetchImpl: recoveryFetch });
    assert.equal(calls, 16, 'one half-open probe runs per add-on and metadata lookup after cooldown');
    assert.equal((await recovered.json()).streams.length, 2);
  } finally {
    Date.now = realNow;
    _coreStreamsTest.resetSourceHealth();
  }
});

test('operator-configured addon may return deduplicated native YouTube IDs', async () => {
  const urls = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.startsWith('https://torrentio.strem.fun/')) {
      return jsonResponse({ streams: [{ ytId: 'dQw4w9WgXcQ', name: 'Duplicate YouTube result' }] });
    }
    if (url.startsWith('https://pengu.example.com/')) {
      return jsonResponse({ streams: [
        { ytId: 'dQw4w9WgXcQ', name: 'Duplicate from configured source' },
        { ytId: 'M7lc1UVf-VE', name: 'Native YouTube result', title: 'Embedded player', behaviorHints: { filename: 'Open film' } },
        { ytId: 'not-a-youtube-id', name: 'Malformed ID' },
      ] });
    }
    return jsonResponse({ streams: [] });
  };
  const validManifest = 'https://pengu.example.com/config/abc123/manifest.json';
  const response = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/movie/tt0133093.json`),
    makeEnv({ CORE_STREAMS_HTTP_SOURCE_MANIFEST: validManifest }), { fetchImpl },
  );
  const payload = await response.json();
  assert.equal(urls.length, 5, 'three fixed add-ons, the configured add-on, and one Cinemeta request');
  assert.ok(urls.includes('https://pengu.example.com/config/abc123/stream/movie/tt0133093.json'));
  assert.deepEqual(payload.streams, [
    { ytId: 'dQw4w9WgXcQ', name: 'Torrentio · Duplicate YouTube result' },
    {
      ytId: 'M7lc1UVf-VE', name: 'HTTP source · Native YouTube result',
      title: 'Embedded player', behaviorHints: { filename: 'Open film' },
    },
  ]);

  for (const value of [

    'http://pengu.example/manifest.json',
    'https://127.0.0.1/manifest.json',
    'https://pengu.local/manifest.json',
    'https://user:pass@pengu.example/manifest.json',
    'https://pengu.example:8443/manifest.json',
    'https://pengu.example/manifest.json?token=secret',
    'https://pengu.example/not-a-manifest',
  ]) {
    assert.equal(_coreStreamsTest.configuredAddonBase(value), null, value);
  }
});

test('stream normalization rejects unsafe links and malformed torrent hashes', () => {
  assert.equal(_coreStreamsTest.normalizeStream({ url: 'http://media.example/video.mp4' }, 'Source'), null);
  assert.equal(_coreStreamsTest.normalizeStream({ url: 'https://localhost/video.mp4' }, 'Source'), null);
  assert.equal(_coreStreamsTest.normalizeStream({ infoHash: 'not-a-hash' }, 'Source'), null);
  assert.deepEqual(_coreStreamsTest.normalizeStream({ infoHash: 'C'.repeat(40), fileIdx: -1 }, 'Source'), {
    infoHash: 'c'.repeat(40),
    name: 'Core Streams · Source',
  });
});

test('native YouTube stream normalization accepts only 11-character video IDs', () => {
  assert.deepEqual(_coreStreamsTest.normalizeStream({
    ytId: 'dQw4w9WgXcQ',
    name: 'Official upload',
    title: 'Full film',
    behaviorHints: { filename: 'Full film.mp4' },
  }, 'YouTube source'), {
    ytId: 'dQw4w9WgXcQ',
    name: 'YouTube source · Official upload',
    title: 'Full film',
    behaviorHints: { filename: 'Full film.mp4' },
  });
  for (const ytId of ['short', 'dQw4w9WgXcQ=', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'abcdefghijk/']) {
    assert.equal(_coreStreamsTest.normalizeStream({ ytId }, 'Source'), null, ytId);
  }
  assert.equal(_coreStreamsTest.normalizeStream({ externalUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }, 'Source'), null);
});

test('torrent peer-discovery hints keep only public tracker URLs and valid DHT hashes', () => {
  const stream = _coreStreamsTest.normalizeStream({
    infoHash: 'e'.repeat(40),
    sources: [
      'tracker:udp://tracker.example.com:6969/announce',
      'tracker:https://localhost/announce',
      'tracker:https://user:pass@tracker.example.com/announce',
      `dht:${'f'.repeat(40)}`,
      'dht:not-a-node-id',
      'tracker:https://tracker.example.com/announce\\r\\nX-Injected: yes',
    ],
  }, 'Torrent source');
  assert.deepEqual(stream.sources, [
    'tracker:udp://tracker.example.com:6969/announce',
    `dht:${'f'.repeat(40)}`,
  ]);
});

test('direct HTTP stream preserves only safe playback headers and marks proxy-header streams not web-ready', () => {
  const stream = _coreStreamsTest.normalizeStream({
    url: 'https://cdn.example.com/movie.m3u8',
    filename: 'movie.m3u8',
    behaviorHints: {
      videoSize: 123456,
      proxyHeaders: { request: {
        Referer: 'https://player.example.com/',
        'User-Agent': 'CoreStreamsTest/1',
        Authorization: 'Bearer should-not-leak',
        Cookie: 'session=secret',
        Range: 'bytes=0-100',
        'X-Injected': 'not-allowed',
      } },
    },
  }, 'HTTP Source');
  assert.deepEqual(stream, {
    url: 'https://cdn.example.com/movie.m3u8',
    name: 'Core Streams · HTTP Source',
    behaviorHints: {
      filename: 'movie.m3u8',
      videoSize: 123456,
      proxyHeaders: { request: {
        Referer: 'https://player.example.com/',
        'User-Agent': 'CoreStreamsTest/1',
      } },
      notWebReady: true,
    },
  });
});

test('Library of Congress mappings require exact IMDb title/year and link the explicit collection rights record', () => {
  const cases = [
    {
      id: 'tt0205480', title: 'A Trip Down Market Street Before the Fire', year: 1906,
      item: '00694408', file: '00015143.mp4',
    },
    {
      id: 'tt0366872', title: 'Panoramic View of the Golden Gate', year: 1902,
      item: '00694423', file: '00045679.mp4',
    },
    {
      id: 'tt0309365', title: "Bird's-Eye View of San Francisco, Cal., from a Balloon", year: 1902,
      item: '00694409', file: '00045682.mp4',
    },
    {
      id: 'tt1811321', title: 'San Francisco Earthquake & Fire: April 18, 1906', year: 1906,
      metadataTitle: 'San Francisco earthquake and fire, April 18, 1906',
      item: '00694425', file: '00007947.mp4',
    },
  ];
  for (const film of cases) {
    const stream = _coreStreamsTest.locFilmStreams(film.id, { title: film.title, year: film.year })[0];
    assert.ok(stream, film.title);
    assert.equal(stream.url, `https://tile.loc.gov/storage-services/service/mbrs/ntscrm/${film.file.replace('.mp4', '')}/${film.file}`);
    assert.equal(stream.name, 'Library of Congress · Public domain');
    assert.equal(stream.title, `${film.title} (${film.year})`);
    assert.equal(stream.behaviorHints.filename, film.file);
    assert.match(stream.description, new RegExp(film.item));
    assert.match(stream.description, /public domain and free to use and reuse/i);
    assert.match(stream.description, /Motion Picture, Broadcasting, and Recorded Sound Division/);
    assert.match(stream.description, /collections\/san-francisco-earthquake-and-fire-1897-to-1916/);
    assert.match(stream.description, /Check local rights/i);
    assert.match(stream.description, /codec and playback are untested/i);
    assert.deepEqual(_coreStreamsTest.locFilmStreams(film.id, { title: film.title, year: film.year - 1 }), []);
    assert.deepEqual(_coreStreamsTest.locFilmStreams(film.id, { title: 'A different film', year: film.year }), []);
    if (film.metadataTitle) {
      assert.equal(_coreStreamsTest.locFilmStreams(film.id, { title: film.metadataTitle, year: film.year }).length, 1);
    }
  }
  assert.deepEqual(_coreStreamsTest.locFilmStreams('tt0000439', {
    title: 'The Great Train Robbery', year: 1903,
  }), []);
});

test('Library of Congress direct stream is included only for the exact Stremio film metadata match', async () => {
  const requested = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.includes('/meta/movie/tt0205480.json')) {
      return jsonResponse({ meta: { name: 'A Trip Down Market Street Before the Fire', year: '1906' } });
    }
    if (url.includes('archive.org/advancedsearch.php')) {
      return jsonResponse({ response: { docs: [] } });
    }
    if (url.includes('video.blender.org/api/v1/videos')) return jsonResponse({ data: [] });
    return jsonResponse({ streams: [] });
  };
  const response = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/movie/tt0205480.json`), makeEnv(), { fetchImpl },
  );
  const payload = await response.json();
  const loc = payload.streams.find((stream) => stream.name.startsWith('Library of Congress'));
  assert.ok(loc);
  assert.equal(loc.url, 'https://tile.loc.gov/storage-services/service/mbrs/ntscrm/00015143/00015143.mp4');
  assert.ok(requested.includes('https://v3-cinemeta.strem.io/meta/movie/tt0205480.json'));
  assert.ok(!requested.some((url) => new URL(url).hostname === 'tile.loc.gov'), 'Worker returns the direct LOC URL; it does not fetch or relay movie bytes');
});

test('Internet Archive adapter returns only exact-title, year-matched, uploader-declared open MP4 files', async () => {
  _coreStreamsTest.resetSourceHealth();
  const calls = [];
  const fetchImpl = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.startsWith('https://v3-cinemeta.strem.io/')) {
      return jsonResponse({ meta: { name: 'Big Buck Bunny', year: '2008' } });
    }
    if (url.startsWith('https://archive.org/advancedsearch.php?')) {
      return jsonResponse({ response: { docs: [
        { identifier: 'bbb-open', title: 'Big Buck Bunny' },
        { identifier: 'bbb-remake', title: 'Big Buck Bunny Returns' },
      ] } });
    }
    if (url.startsWith('https://video.blender.org/api/v1/videos?')) {
      return jsonResponse({ data: [{
        id: 56,
        name: 'Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film',
        privacy: { id: 1 }, nsfw: false, licence: { id: 1 },
        channel: { name: 'blender_open_movies' }, account: { name: 'blender' },
      }] });
    }
    if (url === 'https://video.blender.org/api/v1/videos/56') {
      return jsonResponse({
        id: 56,
        name: 'Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film',
        privacy: { id: 1 }, nsfw: false, licence: { id: 1 },
        channel: { name: 'blender_open_movies' }, account: { name: 'blender' },
        files: [{
          fileUrl: 'https://video.blender.org/object-storage/web_videos/bbb-1080.mp4',
          hasAudio: true, hasVideo: true, size: 2048, resolution: { id: 1080 },
        }],
      });
    }
    if (url === 'https://archive.org/metadata/bbb-open') {
      return jsonResponse({
        metadata: {
          title: 'Big Buck Bunny', date: '2008-04-10', creator: 'Blender Foundation',
          licenseurl: 'http://creativecommons.org/licenses/by/3.0/',
        },
        files: [
          { name: 'bbb_sunflower_1080p.mp4', format: 'MPEG4', size: '2048' },
          { name: 'bbb_source.mkv', format: 'Matroska', size: '4096' },
          { name: 'bbb_private.mp4', format: 'MPEG4', private: true, size: '1000' },
        ],
      });
    }
    return jsonResponse({ streams: [] });
  };

  const response = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/movie/tt1254207.json`), makeEnv(), { fetchImpl },
  );
  const payload = await response.json();
  const archiveStream = payload.streams.find((stream) => stream.url?.includes('archive.org/download/'));
  assert.ok(archiveStream);
  assert.equal(archiveStream.url, 'https://archive.org/download/bbb-open/bbb_sunflower_1080p.mp4');
  assert.equal(archiveStream.name, 'Internet Archive · CC BY 3.0');
  assert.equal(archiveStream.behaviorHints.filename, 'bbb_sunflower_1080p.mp4');
  assert.match(archiveStream.description, /uploader-supplied and has not been independently verified/i);
  const blenderStream = payload.streams.find((stream) => stream.url?.includes('video.blender.org/object-storage/'));
  assert.ok(blenderStream);
  assert.equal(blenderStream.name, 'Blender Open Movies · CC BY 3.0');
  assert.match(blenderStream.description, /peach\.blender\.org\/about/);
  assert.equal(calls.length, 8, 'three add-ons, Cinemeta, IA search/item metadata, and Blender search/video metadata');
  assert.ok(calls.every(({ init }) => init.redirect === 'manual'));

  assert.equal(_coreStreamsTest.declaredOpenLicense('https://creativecommons.org/licenses/by-nc/4.0/'), null);
  assert.equal(_coreStreamsTest.declaredOpenLicense('https://creativecommons.org/licenses/by-nd/4.0/'), null);
  assert.equal(_coreStreamsTest.declaredOpenLicense('https://notcreativecommons.org/licenses/by/4.0/'), null);
  _coreStreamsTest.resetSourceHealth();
});

test('Blender Open Movies resolves the exact Elephants Dream upload under its official CC BY 2.5 terms', async () => {
  _coreStreamsTest.resetSourceHealth();
  const calls = [];
  const baseVideo = {
    id: 55,
    name: 'Elephants Dream',
    privacy: { id: 1 }, nsfw: false, licence: { id: null },
    channel: { name: 'blender_open_movies' }, account: { name: 'blender' },
  };
  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith('https://v3-cinemeta.strem.io/')) {
      return jsonResponse({ meta: { name: 'Elephants Dream', year: '2006' } });
    }
    if (url.startsWith('https://archive.org/advancedsearch.php?')) {
      return jsonResponse({ response: { docs: [] } });
    }
    if (url.startsWith('https://video.blender.org/api/v1/videos?')) {
      return jsonResponse({ data: [baseVideo] });
    }
    if (url === 'https://video.blender.org/api/v1/videos/55') {
      return jsonResponse({ ...baseVideo, files: [{
        fileUrl: 'https://video.blender.org/object-storage/web_videos/elephants-dream-720.mp4',
        hasAudio: true, hasVideo: true, size: 117134159, resolution: { id: 720 },
      }] });
    }
    return jsonResponse({ streams: [] });
  };

  const response = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/movie/tt0807840.json`), makeEnv(), { fetchImpl },
  );
  const payload = await response.json();
  const stream = payload.streams.find((item) => item.url?.includes('elephants-dream-720.mp4'));
  assert.ok(stream);
  assert.equal(stream.name, 'Blender Open Movies · CC BY 2.5');
  assert.match(stream.description, /creativecommons\.org\/licenses\/by\/2\.5/);
  assert.match(stream.description, /orange\.blender\.org/);
  assert.equal(calls.length, 7);
  _coreStreamsTest.resetSourceHealth();
});

test('mapped Blender Open Movies use exact official uploads and per-film verified licenses', async () => {
  const films = [
    {
      id: 'tt1727587', title: 'Sintel', year: '2010',
      videoId: 52, videoTitle: 'Sintel - Third Open Movie by Blender Foundation',
      path: '0eb052d0-fd51-43e6-aa33-ecdbf77a5d40-818.mp4', resolution: 1080,
      license: 'CC BY 3.0', licenseUrl: 'creativecommons.org/licenses/by/3.0',
      officialRightsUrl: 'durian.blender.org/sharing',
    },
    {
      id: 'tt2285752', title: 'Tears of Steel', year: '2012',
      videoId: 53, videoTitle: 'Tears of Steel - Blender VFX Open Movie',
      path: '8533ea43-4271-4a57-9694-e9d0b35e1aa1-800.mp4', resolution: 1080,
      license: 'CC BY 3.0', licenseUrl: 'creativecommons.org/licenses/by/3.0',
      officialRightsUrl: 'mango.blender.org/about',
    },
    {
      id: 'tt5243642', title: 'Glass Half', year: '2015',
      videoId: 49, videoTitle: 'Glass Half - Blender animated cartoon',
      path: '64222c8a-c4c7-4b3b-9850-7fb2078edcf6-720.mp4', resolution: 720,
      license: 'CC BY 3.0', licenseUrl: 'creativecommons.org/licenses/by/3.0',
      peerTubeLicenseId: 1,
      officialRightsUrl: 'studio.blender.org/projects/glass-half/pages/licensing',
    },
    {
      id: 'tt13716914', title: 'Coffee Run', year: '2020',
      videoId: 24061, videoTitle: 'Coffee Run - Blender Open Movie',
      path: 'ff8fe61b-026f-4f07-b66b-2a790d6f6ab1-804.mp4', resolution: 1080,
      license: 'CC BY 4.0', licenseUrl: 'creativecommons.org/licenses/by/4.0',
      officialRightsUrl: 'studio.blender.org/projects/coffee-run/pages/licensing',
    },
  ];
  for (const film of films) {
    _coreStreamsTest.resetSourceHealth();
    const baseVideo = {
      id: film.videoId,
      name: film.videoTitle,
      privacy: { id: 1 }, nsfw: false, licence: { id: film.peerTubeLicenseId ?? null },
      channel: { name: 'blender_open_movies' }, account: { name: 'blender' },
    };
    const calls = [];
    const fetchImpl = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith('https://v3-cinemeta.strem.io/')) {
        return jsonResponse({ meta: { name: film.title, year: film.year } });
      }
      if (url.startsWith('https://archive.org/advancedsearch.php?')) {
        return jsonResponse({ response: { docs: [] } });
      }
      if (url.startsWith('https://video.blender.org/api/v1/videos?')) {
        return jsonResponse({ data: [baseVideo] });
      }
      if (url === `https://video.blender.org/api/v1/videos/${film.videoId}`) {
        return jsonResponse({ ...baseVideo, files: [{
          fileUrl: `https://video.blender.org/object-storage/web_videos/${film.path}`,
          hasAudio: true, hasVideo: true, size: 250_000_000, resolution: { id: film.resolution },
        }] });
      }
      return jsonResponse({ streams: [] });
    };
    const response = await handleCoreStreams(
      makeRequest(`/core-streams/${TOKEN}/stream/movie/${film.id}.json`), makeEnv(), { fetchImpl },
    );
    const payload = await response.json();
    const stream = payload.streams.find((item) => item.url?.endsWith(film.path));
    assert.ok(stream, film.title);
    assert.equal(stream.name, `Blender Open Movies · ${film.license}`);
    assert.ok(stream.description.includes(film.licenseUrl));
    assert.ok(stream.description.includes(film.officialRightsUrl));
    assert.equal(stream.url, `https://video.blender.org/object-storage/web_videos/${film.path}`);
    assert.equal(calls.length, 7, 'three add-ons, Cinemeta, Archive search, and Blender search/detail');
  }
  _coreStreamsTest.resetSourceHealth();
});

test('Internet Archive item-metadata failures count toward its circuit breaker', async () => {
  _coreStreamsTest.resetSourceHealth();
  const path = `/core-streams/${TOKEN}/stream/movie/tt0133093.json`;
  let archiveSearchCalls = 0;
  const fetchImpl = async (input) => {
    const url = String(input);
    if (url.startsWith('https://v3-cinemeta.strem.io/')) {
      return jsonResponse({ meta: { name: 'The Matrix', year: '1999' } });
    }
    if (url.startsWith('https://archive.org/advancedsearch.php?')) {
      archiveSearchCalls++;
      return jsonResponse({ response: { docs: [{ identifier: 'matrix-open', title: 'The Matrix' }] } });
    }
    if (url === 'https://archive.org/metadata/matrix-open') return jsonResponse({}, 503);
    return jsonResponse({ streams: [] });
  };

  try {
    for (let i = 0; i < 3; i++) {
      const response = await handleCoreStreams(makeRequest(path), makeEnv(), { fetchImpl });
      assert.equal(response.status, 200);
    }
    await handleCoreStreams(makeRequest(path), makeEnv(), { fetchImpl });
    assert.equal(archiveSearchCalls, 3, 'after three failed metadata reads, the fourth request skips Archive search');
  } finally {
    _coreStreamsTest.resetSourceHealth();
  }
});

test('Internet Archive adapter rejects title/year mismatches, unsafe identifiers, unlicensed files and non-MP4 formats', () => {
  const metadata = {
    metadata: {
      title: 'Different Movie', date: '2008-01-01', licenseurl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    },
    files: [{ name: 'video.mp4', format: 'MPEG4' }],
  };
  assert.deepEqual(_coreStreamsTest.archiveMediaStreams('item-1', metadata, 'Big Buck Bunny', 2008), []);
  metadata.metadata.title = 'Big Buck Bunny';
  metadata.metadata.date = '2009';
  assert.deepEqual(_coreStreamsTest.archiveMediaStreams('item-1', metadata, 'Big Buck Bunny', 2008), []);
  metadata.metadata.date = '1998';
  assert.deepEqual(_coreStreamsTest.archiveMediaStreams('item-1', metadata, 'Big Buck Bunny', 2008), []);
  metadata.metadata.date = '2008';
  metadata.metadata.licenseurl = 'https://creativecommons.org/licenses/by-nc/4.0/';
  assert.deepEqual(_coreStreamsTest.archiveMediaStreams('item-1', metadata, 'Big Buck Bunny', 2008), []);
  metadata.metadata.licenseurl = 'https://creativecommons.org/publicdomain/zero/1.0/';
  metadata.files = [
    { name: '../escape.mp4', format: 'MPEG4' },
    { name: 'video.mkv', format: 'Matroska' },
  ];
  assert.deepEqual(_coreStreamsTest.archiveMediaStreams('item-1', metadata, 'Big Buck Bunny', 2008), []);
  assert.deepEqual(_coreStreamsTest.archiveMediaStreams('../item', metadata, 'Big Buck Bunny', 2008), []);
});

test('rate limiting and HTTP method restrictions are enforced', async () => {
  let providerCalls = 0;
  const fetchImpl = async () => { providerCalls++; return jsonResponse({ streams: [] }); };
  const denied = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/stream/movie/tt0133093.json`), makeEnv(),
    { fetchImpl, rateLimit: async () => false },
  );
  assert.equal(denied.status, 429);
  assert.equal(providerCalls, 0);

  const post = await handleCoreStreams(
    makeRequest(`/core-streams/${TOKEN}/manifest.json`, 'POST'), makeEnv(), { fetchImpl },
  );
  assert.equal(post.status, 405);
});
