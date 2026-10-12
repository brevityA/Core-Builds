import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const provider = require('../providers/core-aiostreams-proxy.js');
const manifestPath = fileURLToPath(new URL('../manifest.json', import.meta.url));
const rootDir = path.dirname(manifestPath);
const AIO_MANIFEST = 'https://aiostreams.example.net/stremio/12345678-abcd/pw%2Ftoken/manifest.json';
const AIO_BASE = 'https://aiostreams.example.net/stremio/12345678-abcd/pw%2Ftoken';
const WORKER_BASE = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev';

function response(payload, ok = true) {
  return { ok, json: () => Promise.resolve(payload) };
}

async function withRuntime(settings, timeoutFetch, run) {
  const previousSettings = globalThis.SCRAPER_SETTINGS;
  const previousFetch = globalThis.fetch;
  const previousTimeoutFetch = globalThis.fetchWithTimeout;
  globalThis.SCRAPER_SETTINGS = settings;
  globalThis.fetch = async () => { throw new Error('Unexpected plain fetch'); };
  globalThis.fetchWithTimeout = timeoutFetch;
  try {
    return await run();
  } finally {
    if (previousSettings === undefined) delete globalThis.SCRAPER_SETTINGS;
    else globalThis.SCRAPER_SETTINGS = previousSettings;
    globalThis.fetch = previousFetch;
    if (previousTimeoutFetch === undefined) delete globalThis.fetchWithTimeout;
    else globalThis.fetchWithTimeout = previousTimeoutFetch;
  }
}

describe('Core Builds AIOStreams Proxy manifest', () => {
  it('declares a settings-enabled movie and TV provider with an existing entry point', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.version, '0.2.0');
    assert.equal(manifest.scrapers.length, 1);

    const scraper = manifest.scrapers[0];
    assert.equal(scraper.id, 'core-aiostreams-proxy');
    assert.equal(scraper.hasSettings, true);
    assert.deepEqual(scraper.supportedTypes, ['movie', 'tv']);
    assert.ok(existsSync(path.join(rootDir, scraper.filename)));
  });
});

describe('Core Builds AIOStreams Proxy provider', () => {
  it('fetches a movie stream response through the existing Cloudflare Worker route', async () => {
    let requestedUrl = '';
    let timeoutMs = null;
    let requestOptions = null;
    const payload = {
      streams: [
        {
          name: 'Comet',
          title: '1080p WEB-DL · H.265',
          url: 'https://cdn.example.net/movie.mp4?sig=abc',
          quality: '1080p',
          size: 2048,
          behaviorHints: { proxyHeaders: { request: { Referer: 'https://cdn.example.net/' } } },
          subtitles: [{
            lang: 'en',
            label: 'English',
            url: 'https://cdn.example.net/movie.en.srt',
            headers: { Referer: 'https://cdn.example.net/' }
          }]
        },
        { name: 'P2P', title: 'Magnet result', url: 'magnet:?xt=urn:btih:abc' }
      ]
    };

    const streams = await withRuntime(
      { manifestUrl: AIO_MANIFEST },
      async (url, options, timeout) => {
        requestedUrl = url;
        requestOptions = options;
        timeoutMs = timeout;
        return response(payload);
      },
      () => provider.getStreams('550', 'movie', null, null)
    );

    const request = new URL(requestedUrl);
    assert.equal(request.origin, WORKER_BASE);
    assert.equal(request.pathname, '/proxy/stream/movie/tmdb%3A550.json');
    assert.equal(request.searchParams.get('host'), AIO_BASE);
    assert.equal(timeoutMs, 8000);
    assert.equal(requestOptions.method, 'GET');
    assert.equal(streams.length, 1, 'only direct HTTPS streams should be returned');
    assert.equal(streams[0].name, 'Comet');
    assert.equal(streams[0].title, '1080p WEB-DL · H.265');
    assert.equal(streams[0].url, 'https://cdn.example.net/movie.mp4?sig=abc');
    assert.deepEqual(streams[0].headers, { Referer: 'https://cdn.example.net/' });
    assert.deepEqual(streams[0].subtitles, [{
      url: 'https://cdn.example.net/movie.en.srt',
      language: 'en',
      name: 'English',
      headers: { Referer: 'https://cdn.example.net/' }
    }]);
  });

  it('requests an exact AIOStreams TV episode with an encoded series ID', async () => {
    let requestedUrl = '';
    const streams = await withRuntime(
      { manifestUrl: AIO_MANIFEST },
      async (url) => {
        requestedUrl = url;
        return response({
          streams: [{ name: 'Meteor', title: 'S02E03', url: 'https://cdn.example.net/show/s02e03.m3u8' }]
        });
      },
      () => provider.getStreams('1399', 'tv', 2, 3)
    );

    assert.equal(new URL(requestedUrl).pathname, '/proxy/stream/series/tmdb%3A1399%3A2%3A3.json');
    assert.equal(streams.length, 1);
    assert.equal(streams[0].url, 'https://cdn.example.net/show/s02e03.m3u8');
  });

  it('accepts an AIOStreams base URL as well as a manifest.json URL', async () => {
    let requestedUrl = '';
    await withRuntime(
      { manifestUrl: 'https://aiostreams.example.net/stremio/uuid/pw' },
      async (url) => {
        requestedUrl = url;
        return response({ streams: [] });
      },
      () => provider.getStreams('550', 'movie', null, null)
    );

    assert.equal(new URL(requestedUrl).searchParams.get('host'), 'https://aiostreams.example.net/stremio/uuid/pw');
  });

  it('rejects insecure, userinfo, custom-port, malformed, or incomplete manifest URLs before fetching', async () => {
    const invalidUrls = [
      'http://aiostreams.example.net/stremio/uuid/pw/manifest.json',
      'https://user:password@aiostreams.example.net/stremio/uuid/pw/manifest.json',
      'https://aiostreams.example.net:8443/stremio/uuid/pw/manifest.json',
      'https://aiostreams.example.net/not-aiostreams/manifest.json',
      'https://aiostreams.example.net/stremio/uuid/manifest.json'
    ];
    let calls = 0;
    for (const manifestUrl of invalidUrls) {
      const streams = await withRuntime(
        { manifestUrl },
        async () => {
          calls += 1;
          return response({ streams: [] });
        },
        () => provider.getStreams('550', 'movie', null, null)
      );
      assert.deepEqual(streams, []);
    }
    assert.equal(calls, 0);
  });

  it('returns an empty list for malformed IDs, missing episode numbers, upstream errors, and bad payloads', async () => {
    let calls = 0;
    const timeoutFetch = async () => {
      calls += 1;
      return response({ error: 'upstream unavailable' }, false);
    };

    const invalidId = await withRuntime(
      { manifestUrl: AIO_MANIFEST }, timeoutFetch,
      () => provider.getStreams('../../admin', 'movie', null, null)
    );
    const invalidEpisode = await withRuntime(
      { manifestUrl: AIO_MANIFEST }, timeoutFetch,
      () => provider.getStreams('1399', 'tv', 1, null)
    );
    const failedUpstream = await withRuntime(
      { manifestUrl: AIO_MANIFEST }, timeoutFetch,
      () => provider.getStreams('550', 'movie', null, null)
    );
    const badPayload = await withRuntime(
      { manifestUrl: AIO_MANIFEST },
      async () => response({ data: { streams: [] } }),
      () => provider.getStreams('550', 'movie', null, null)
    );

    assert.deepEqual(invalidId, []);
    assert.deepEqual(invalidEpisode, []);
    assert.deepEqual(failedUpstream, []);
    assert.deepEqual(badPayload, []);
    assert.equal(calls, 1, 'invalid requests should be rejected before the Worker call');
  });

  it('exposes only the AIOStreams manifest URL setting', async () => {
    const settings = await provider.onSettings();
    assert.ok(settings.some(item => item.key === 'manifestUrl' && item.type === 'text' && item.isPassword === true));
    assert.ok(settings.some(item => item.type === 'info' && item.label.includes('Cloudflare Worker')));
  });
});
