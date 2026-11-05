#!/usr/bin/env node
// Offline, deterministic latency-shape benchmark. It does not call providers,
// TorBox, or a private manifest. It measures orchestration overhead and the
// number of provider round-trips under a simulated 120 ms header delay.
import { performance } from 'node:perf_hooks';
import { handleCoreStreams, _coreStreamsTest } from './core-streams.js';

const TOKEN = '0123456789abcdef0123456789abcdef';
const HEADER_DELAY_MS = 120;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (value) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

function fixture() {
  let calls = 0;
  let active = 0;
  let peak = 0;
  const fetchImpl = async (input) => {
    calls++;
    active++;
    peak = Math.max(peak, active);
    await delay(HEADER_DELAY_MS);
    active--;
    const url = String(input);
    if (url.startsWith('https://torrentio.strem.fun/')) {
      return json({ streams: [{ infoHash: 'a'.repeat(40), name: '1080p', title: 'Film.2001.1080p.WEB-DL 👤 80' }] });
    }
    if (url.startsWith('https://v3-cinemeta.strem.io/')) return json({ meta: { name: 'Benchmark Film', year: 2001 } });
    return json({ streams: [] });
  };
  return { fetchImpl, stats: () => ({ calls, peak }) };
}

async function measure(label, run) {
  const started = performance.now();
  const response = await run();
  return { label, ms: +(performance.now() - started).toFixed(1), cache: response.headers.get('X-Core-Streams-Cache') };
}

const request = () => new Request(`https://worker.example/core-streams/${TOKEN}/stream/movie/tt0133093.json`);
const env = { CORE_STREAMS_INSTALL_TOKEN: TOKEN };
const results = [];

_coreStreamsTest.resetCinemetaCache();
_coreStreamsTest.resetResponseCache();
_coreStreamsTest.resetSourceHealth();
const cold = fixture();
results.push(await measure('cold', () => handleCoreStreams(request(), env, { fetchImpl: cold.fetchImpl })));
results.push(await measure('warm cache', () => handleCoreStreams(request(), env, { fetchImpl: cold.fetchImpl })));
const coldStats = cold.stats();

_coreStreamsTest.resetResponseCache();
_coreStreamsTest.resetCinemetaCache();
const concurrent = fixture();
const pair = await Promise.all([
  handleCoreStreams(request(), env, { fetchImpl: concurrent.fetchImpl }),
  handleCoreStreams(request(), env, { fetchImpl: concurrent.fetchImpl }),
]);
const concurrentStats = concurrent.stats();
results.push({ label: 'two simultaneous requests', ms: null, cache: pair.map((r) => r.headers.get('X-Core-Streams-Cache')).sort().join('+') });

console.log(JSON.stringify({
  note: 'Offline simulated-provider benchmark; not a live network or playback measurement.',
  headerDelayMs: HEADER_DELAY_MS,
  results,
  coldProviderCalls: coldStats.calls,
  coldPeakHeaderWaits: coldStats.peak,
  simultaneousProviderCalls: concurrentStats.calls,
  simultaneousPeakHeaderWaits: concurrentStats.peak,
}, null, 2));

if (coldStats.peak > 6 || concurrentStats.peak > 6) process.exitCode = 1;
if (concurrentStats.calls > coldStats.calls) process.exitCode = 1;
_coreStreamsTest.resetCinemetaCache();
_coreStreamsTest.resetResponseCache();
_coreStreamsTest.resetSourceHealth();
