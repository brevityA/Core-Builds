import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { _coreStreamsTest } from './core-streams.js';
import { createHeaderLimiter } from './core-streams-performance.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});
const source = { id: 'torrentio', name: 'Torrentio', base: 'https://torrentio.strem.fun' };
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

beforeEach(() => {
  _coreStreamsTest.resetSourceHealth();
  _coreStreamsTest.resetResponseCache();
  _coreStreamsTest.resetCinemetaCache();
});

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

test('a transient provider timeout opens the breaker briefly and a half-open probe can recover it', async () => {
  const realNow = Date.now;
  let now = 1_000_000;
  let mode = 'timeout';
  Date.now = () => now;
  const fetchImpl = async () => {
    if (mode === 'timeout') throw Object.assign(new Error('provider timed out'), { name: 'TimeoutError' });
    return json({ streams: [{ infoHash: 'a'.repeat(40), name: '1080p' }] });
  };
  try {
    for (let i = 0; i < 3; i++) {
      const report = {};
      assert.deepEqual(await _coreStreamsTest.fetchSource(source, 'movie', 'tt0133093', fetchImpl, report, AbortSignal.timeout(1000)), []);
      assert.equal(report.torrentio, 'timeout');
    }
    const pausedReport = {};
    assert.deepEqual(await _coreStreamsTest.fetchSource(source, 'movie', 'tt0133093', fetchImpl, pausedReport, AbortSignal.timeout(1000)), []);
    assert.equal(pausedReport.torrentio, 'paused');

    now += 30_001;
    mode = 'ok';
    const recoveredReport = {};
    const recovered = await _coreStreamsTest.fetchSource(source, 'movie', 'tt0133093', fetchImpl, recoveredReport, AbortSignal.timeout(1000));
    assert.equal(recovered.length, 1);
    assert.equal(recoveredReport.torrentio, 'ok 1');
  } finally {
    Date.now = realNow;
    _coreStreamsTest.resetSourceHealth();
  }
});
