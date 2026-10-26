import test from 'node:test';
import assert from 'node:assert/strict';
import {
  queryCase,
  readManifestUrl,
  runBenchmark,
  streamRequestUrl,
  summarizeStreams,
} from './core-streams-benchmark.mjs';

const sample = [{ type: 'series', id: 'tt0903747:1:1', title: 'Breaking Bad S01E01' }];

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('benchmark accepts only public HTTPS manifest URLs without displaying values', () => {
  const url = readManifestUrl('https://addons.example.net/private/manifest.json?key=secret', 'TEST_URL');
  assert.equal(url.pathname, '/private/manifest.json');
  for (const [unsafe, errorPattern] of [
    ['http://addon.example.net/manifest.json', /public HTTPS host/],
    ['https://127.0.0.1/manifest.json', /public HTTPS host/],
    ['https://localhost/manifest.json', /public HTTPS host/],
    ['https://user:pass@addon.example.net/manifest.json', /public HTTPS host/],
    ['https://addon.example.net/manifest.json#secret', /public HTTPS host/],
    ['https://addon.example.net/manifest', /manifest\.json/],
    ['https://addon.example/manifest.json', /public HTTPS host/],
  ]) {
    assert.throws(() => readManifestUrl(unsafe, 'TEST_URL'), errorPattern);
  }
});

test('benchmark builds encoded stream paths while preserving path and query install tokens', () => {
  const manifestUrl = readManifestUrl('https://addon.example.net/secret-token/manifest.json?key=secret', 'TEST_URL');
  const url = streamRequestUrl(manifestUrl, sample[0]);
  assert.equal(url.pathname, '/secret-token/stream/series/tt0903747%3A1%3A1.json');
  assert.equal(url.search, '?key=secret');
});

test('benchmark summarizes advertised stream signals without retaining media URLs', () => {
  const metrics = summarizeStreams([
    { infoHash: 'a'.repeat(40), name: '1080p WEB-DL 👤 42' },
    { url: 'https://media.example.net/film.mp4', title: '720p' },
    { ytId: 'dQw4w9WgXcQ', name: 'Official upload' },
  ]);
  assert.equal(metrics.resultCount, 3);
  assert.equal(metrics.first1080pPosition, 1);
  assert.equal(metrics.topFive1080pHints, 1);
  assert.equal(metrics.seedHintCount, 1);
  assert.equal(metrics.maxAdvertisedResolution, 1080);
  assert.deepEqual(metrics.types, { direct: 1, torrent: 1, youtube: 1, other: 0 });
  assert.deepEqual(Object.keys(metrics).sort(), [
    'first1080pPosition', 'maxAdvertisedResolution', 'resolutionHintCount', 'resultCount',
    'seedHintCount', 'topFive1080pHints', 'topFiveCount', 'types',
  ]);
});

test('benchmark report never includes private manifest URLs or bearer tokens', async () => {
  const secret = 'super-secret-install-token';
  const providers = [
    { name: 'Core Streams', manifestUrl: readManifestUrl(`https://core.example.net/${secret}/manifest.json`, 'CORE') },
    { name: 'PenguPlay', manifestUrl: readManifestUrl(`https://pengu.example.net/${secret}/manifest.json`, 'PENGU') },
  ];
  const fetchImpl = async (input) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/manifest.json')) {
      return response({ resources: ['stream'], types: ['movie', 'series'] });
    }
    return response({ streams: [{ infoHash: 'b'.repeat(40), name: '1080p WEB-DL 👤 20' }] });
  };
  const report = await runBenchmark(providers, sample, { fetchImpl, delayMs: 0 });
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes(secret), false);
  assert.equal(report.summaries.length, 2);
  for (const summary of report.summaries) {
    assert.deepEqual(Object.keys(summary).sort(), [
      'attempted', 'caseCount', 'cases', 'coveragePct', 'http200', 'medianLatencyMs', 'medianResultCount',
      'nonEmpty', 'provider', 'topFive1080pHintCases',
    ]);
    assert.deepEqual(Object.keys(summary.cases[0]).sort(), [
      'id', 'latencyMs', 'metrics', 'status', 'title', 'type',
    ]);
  }
  assert.equal(report.summaries[0].coveragePct, 100);
  assert.equal(report.summaries[0].caseCount, 1);
  assert.equal(report.summaries[0].cases[0].metrics.topFive1080pHints, 1);
});

test('manifest network errors are reduced to safe codes without leaking install URLs', async () => {
  const secret = 'another-private-token';
  const providers = [{
    name: 'Core Streams',
    manifestUrl: readManifestUrl(`https://core.example.net/${secret}/manifest.json`, 'CORE'),
  }];
  const report = await runBenchmark(providers, sample, {
    fetchImpl: async (input) => { throw new TypeError(`request failed for ${input}`); },
    delayMs: 0,
  });
  assert.equal(report.manifestErrors[0].error, 'network_error');
  assert.equal(JSON.stringify(report).includes(secret), false);
  assert.deepEqual(report.manifestErrors, [{ provider: 'Core Streams', error: 'network_error' }]);
});

test('unsupported media types are excluded from the benchmark denominator', async () => {
  const manifestUrl = readManifestUrl('https://addon.example.net/manifest.json', 'TEST');
  const row = await queryCase(manifestUrl, { types: ['movie'] }, sample[0], async () => {
    throw new Error('must not request unsupported series');
  });
  assert.equal(row.status, 'unsupported');
});
