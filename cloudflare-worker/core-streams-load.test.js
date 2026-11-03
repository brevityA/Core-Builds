import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleCoreStreams, _coreStreamsTest } from './core-streams.js';
import { createHeaderLimiter } from './core-streams-performance.js';

const TOKEN = '0123456789abcdef0123456789abcdef';
const env = { CORE_STREAMS_INSTALL_TOKEN: TOKEN };
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});
const source = { id: 'torrentio', name: 'Torrentio', base: 'https://torrentio.strem.fun' };
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const request = (id = 'tt0133093') => new Request(`https://worker.example/core-streams/${TOKEN}/stream/movie/${id}.json`);

beforeEach(() => {
  _coreStreamsTest.resetSourceHealth();
  _coreStreamsTest.resetResponseCache();
  _coreStreamsTest.resetCinemetaCache();
});

// Node's mock timers advance setTimeout/Date, but not the platform's
// AbortSignal.timeout. Mock that one primitive with the same mocked clock so a
// hanging fetch is aborted by a real signal, not by a synchronous fake throw.
function mockClock(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  t.mock.method(AbortSignal, 'timeout', (ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('request deadline expired', 'TimeoutError')), ms);
    return controller.signal;
  });
}

function hangingFetch(init, started) {
  started?.resolve();
  return new Promise((_resolve, reject) => {
    const abort = () => reject(init.signal.reason);
    if (init.signal?.aborted) abort();
    else init.signal?.addEventListener('abort', abort, { once: true });
  });
}

test('a saturated six-slot header queue respects queued request deadlines without poisoning the provider breaker', async () => {
  const gates = Array.from({ length: 6 }, deferred);
  const started = [];
  const limited = createHeaderLimiter(async (url, init = {}) => {
    const index = started.length;
    started.push(String(url));
    if (index < gates.length) await gates[index].promise;
    if (init.signal?.aborted) throw init.signal.reason;
    return json({ streams: [{ infoHash: 'a'.repeat(40), name: '1080p' }] });
  }, 6);

  const activeReports = Array.from({ length: 6 }, () => ({}));
  const active = activeReports.map((report) => _coreStreamsTest.fetchSource(
    source, 'movie', 'tt0133093', limited, report, AbortSignal.timeout(5000),
  ));
  while (started.length < 6) await new Promise((resolve) => setImmediate(resolve));

  const queued = Array.from({ length: 3 }, () => {
    const deadline = new AbortController();
    const report = {};
    const result = _coreStreamsTest.fetchSource(source, 'movie', 'tt0133093', limited, report, deadline.signal);
    return { deadline, report, result };
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started.length, 6, 'queued calls do not exceed the six header-wait slots');
  for (const item of queued) item.deadline.abort(Object.assign(new Error('request budget expired'), { name: 'TimeoutError' }));
  for (const item of await Promise.all(queued.map((item) => item.result))) assert.deepEqual(item, []);
  for (const item of queued) assert.equal(item.report.torrentio, 'timeout');
  assert.equal(started.length, 6, 'aborted queued calls never started a fetch');

  gates.forEach((gate) => gate.resolve());
  for (const streams of await Promise.all(active)) assert.equal(streams.length, 1);
  const recoveredReport = {};
  const recovered = await _coreStreamsTest.fetchSource(
    source, 'movie', 'tt0133093', limited, recoveredReport, AbortSignal.timeout(1000),
  );
  assert.equal(recovered.length, 1);
  assert.equal(recoveredReport.torrentio, 'ok 1', 'transient queue deadlines did not open the breaker');
});

test('a real provider header hang opens the breaker and a half-open probe can recover it', async (t) => {
  mockClock(t);
  let mode = 'hang';
  let hangs = 0;
  let started = deferred();
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith('https://torrentio.strem.fun/')) {
      if (mode === 'hang') {
        hangs++;
        return hangingFetch(init, started);
      }
      return json({ streams: [{ infoHash: 'a'.repeat(40), name: '1080p' }] });
    }
    if (url.startsWith('https://v3-cinemeta.strem.io/')) return json({ meta: { name: 'A Film', year: 2001 } });
    if (url.startsWith('https://archive.org/advancedsearch.php')) return json({ response: { docs: [] } });
    return json({ streams: [] });
  };

  for (let i = 0; i < 3; i++) {
    started = deferred();
    const pending = handleCoreStreams(request(), env, { fetchImpl });
    await started.promise;
    t.mock.timers.tick(5500);
    const response = await pending;
    assert.equal(response.status, 200);
    assert.match(response.headers.get('X-Core-Streams-Sources'), /torrentio=timeout/);
  }
  assert.equal(hangs, 3);

  // If the shared request deadline had swallowed the provider timeouts, the
  // breaker would still be closed here and this lookup would report ok.
  mode = 'ok';
  const paused = await handleCoreStreams(request(), env, { fetchImpl });
  assert.match(paused.headers.get('X-Core-Streams-Sources'), /torrentio=paused/);
  assert.equal(hangs, 3, 'the open breaker avoids another provider hang');

  t.mock.timers.tick(30_001);
  const recovered = await handleCoreStreams(request(), env, { fetchImpl });
  assert.match(recovered.headers.get('X-Core-Streams-Sources'), /torrentio=ok 1/);
});

test('a queued provider does not start its own timeout until a header slot is granted', async (t) => {
  mockClock(t);
  const gate = deferred();
  const limited = createHeaderLimiter(async (url, init = {}) => {
    if (String(url) === 'https://active.example') {
      await gate.promise;
      return json({ ok: true });
    }
    if (init.signal?.aborted) throw init.signal.reason;
    return json({ streams: [{ infoHash: 'a'.repeat(40), name: '1080p' }] });
  }, 1);

  const active = limited('https://active.example', {});
  await new Promise((resolve) => setImmediate(resolve));
  const report = {};
  let settled = false;
  const queued = _coreStreamsTest.fetchSource(
    source, 'movie', 'tt0133093', limited, report, new AbortController().signal,
  ).then((value) => { settled = true; return value; });
  await new Promise((resolve) => setImmediate(resolve));

  // The old design started this 5.5 s timer before the queue wait and failed
  // the provider even though it had never received a connection slot.
  t.mock.timers.tick(5500);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false, 'queue time is charged to the request deadline, not the provider timer');

  gate.resolve();
  await active;
  assert.equal((await queued).length, 1);
  assert.equal(report.torrentio, 'ok 1');
});

test('a real Cinemeta metadata hang opens its breaker instead of being swallowed by the request deadline', async (t) => {
  mockClock(t);
  let hangs = 0;
  let started = deferred();
  const fetchImpl = async (input, init = {}) => {
    if (String(input).startsWith('https://v3-cinemeta.strem.io/')) {
      hangs++;
      return hangingFetch(init, started);
    }
    return json({ streams: [] });
  };
  for (let i = 0; i < 3; i++) {
    started = deferred();
    const report = {};
    const pending = _coreStreamsTest.fetchCinemetaTitleYear('movie', 'tt0133093', fetchImpl, AbortSignal.timeout(8000), report);
    await started.promise;
    t.mock.timers.tick(4000);
    assert.equal(await pending, null);
    assert.equal(report.cinemeta, 'timeout');
  }
  const paused = {};
  assert.equal(await _coreStreamsTest.fetchCinemetaTitleYear('movie', 'tt0133093', fetchImpl, AbortSignal.timeout(8000), paused), null);
  assert.equal(paused.cinemeta, 'paused');
  assert.equal(hangs, 3);
});

test('a provider body hang still counts as a provider timeout after headers arrive', async (t) => {
  mockClock(t);
  let mode = 'hang';
  let bodies = 0;
  const fetchImpl = async (_url, init = {}) => {
    if (mode === 'ok') return json({ streams: [{ infoHash: 'a'.repeat(40), name: '1080p' }] });
    bodies++;
    const body = new ReadableStream({
      start(controller) {
        const abort = () => controller.error(init.signal.reason);
        if (init.signal?.aborted) abort();
        else init.signal?.addEventListener('abort', abort, { once: true });
      },
    });
    return new Response(body, { headers: { 'Content-Type': 'application/json' } });
  };

  for (let i = 0; i < 3; i++) {
    const report = {};
    const pending = _coreStreamsTest.fetchSource(source, 'movie', 'tt0133093', fetchImpl, report, new AbortController().signal);
    await new Promise((resolve) => setImmediate(resolve));
    t.mock.timers.tick(5500);
    assert.deepEqual(await pending, []);
    assert.equal(report.torrentio, 'timeout');
  }
  assert.equal(bodies, 3);
  const paused = {};
  assert.deepEqual(await _coreStreamsTest.fetchSource(source, 'movie', 'tt0133093', fetchImpl, paused, new AbortController().signal), []);
  assert.equal(paused.torrentio, 'paused');

  t.mock.timers.tick(30_001);
  mode = 'ok';
  const recovered = {};
  assert.equal((await _coreStreamsTest.fetchSource(source, 'movie', 'tt0133093', fetchImpl, recovered, new AbortController().signal)).length, 1);
  assert.equal(recovered.torrentio, 'ok 1');
});
