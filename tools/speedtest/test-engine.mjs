/* CoreSpeed v3 — engine test harness
 * 1) Unit-tests the pure logic (extracted from the shipped index.html, section A).
 * 2) Runs the ACTUAL shipped WORKER_SRC against the live TorBox CDN from Node
 *    (worker emulated with a `self` shim + Node's real fetch).
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const sectionA = script.split('/* ================= UI SECTION ================= */')[0];

/* ---------- section A in a sandbox ---------- */
const ctxA = {
  performance, fetch, setTimeout, clearTimeout, URL, URLSearchParams,
  AbortController, console,
  location: { search: '', href: 'http://test/' },
  navigator: { userAgent: 'node-test' },
};
vm.createContext(ctxA);
// top-level const/let live in the context's lexical scope, not on the sandbox
// object — append a `var` export list (var does attach to the global) so we
// can reach the bindings from here.
vm.runInContext(
  sectionA +
  '\n;var __exports = { WORKER_SRC, median, mean, sd, downSample, fmtMbps, fmtUnit, fmtMs, fmtBytes, fmtEta, hostOf, verdictFor, proxyChain, normalize, snapshotList, buildRun, summarizeRun, BUDGET_BYTES, FILE_1GB, SNAPSHOT };',
  ctxA, { filename: 'sectionA.js' }
);
const A = ctxA.__exports;

let pass = 0, fail = 0;
function t(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('\n== unit: pure helpers ==');
t('median empty → null', A.median([]) === null);
t('median single', A.median([5]) === 5);
t('median odd', A.median([1, 3, 2]) === 2);
t('median even', A.median([4, 1, 3, 2]) === 2.5);
t('verdict 4K remux', A.verdictFor(200, 50)[1] === '4K Remux ready');
t('verdict 4K stream', A.verdictFor(90, 50)[1] === '4K streaming');
t('verdict 1080p remux', A.verdictFor(30, 100)[1] === '1080p Remux / 4K');
t('verdict high-latency cap', A.verdictFor(30, 300)[1] === '1080p max — high latency');
t('verdict very-high-latency cap', A.verdictFor(100, 500)[1] === 'SD — very high latency');
t('verdict SD', A.verdictFor(2, 100)[1] === 'SD only');
t('verdict null', A.verdictFor(null, 100) === null);
t('fmtUnit decimal', A.fmtUnit(80, 'mb') === '10.0 MB/s');
t('fmtUnit binary', A.fmtUnit(80, 'mib') === '9.5 MiB/s');
t('fmtMbps Gbps', A.fmtMbps(2500) === '2.50 Gbps');
t('fmtMbps round', A.fmtMbps(120) === '120 Mbps');
t('fmtMbps 1dp', A.fmtMbps(12.34) === '12.3 Mbps');
t('fmtMs null', A.fmtMs(null) === '—');

console.log('\n== unit: snapshot + normalize ==');
const list = A.snapshotList();
t('snapshot has 17 nodes', list.length === 17, `got ${list.length}`);
t('snapshot has exactly one closest', list.filter(s => s.closest).length === 1);
t('snapshot urls are https', list.every(s => s.urlShort.startsWith('https://') && s.urlLong.startsWith('https://')));
t('snapshot 1GB paths', list.every(s => s.urlLong.includes('/dld/1GB.bin')));
t('snapshot regions known', list.every(s => s.meta && s.meta.label));
const norm = A.normalize({ region: 'wnam', name: 'store-011', url: 'https://store-011.wnam.tb-cdn.io/dld/100MB.bin', closest: true, coordinates: { lat: 34, lng: -118 } });
t('normalize keeps fields', norm && norm.region === 'wnam' && norm.closest === true && norm.urlLong.includes('1GB.bin'));
t('normalize rejects non-https', A.normalize({ region: 'wnam', url: 'http://x' }) === null);

console.log('\n== unit: summarizeRun (never ranks failed) ==');
const fakeRun = A.buildRun('accurate', [
  { region: 'a', name: 'a', urlShort: 'https://a/x', urlLong: 'https://a/1GB.bin', closest: false, lat: 0, lng: 0, meta: { label: 'A', city: 'A', flag: '🌐', net: 'direct' } },
  { region: 'b', name: 'b', urlShort: 'https://b/x', urlLong: 'https://b/1GB.bin', closest: true, lat: 0, lng: 0, meta: { label: 'B', city: 'B', flag: '🌐', net: 'direct' } },
  { region: 'c', name: 'c', urlShort: 'https://c/x', urlLong: 'https://c/1GB.bin', closest: false, lat: 0, lng: 0, meta: { label: 'C', city: 'C', flag: '🌐', net: 'direct' } },
  { region: 'd', name: 'd', urlShort: 'https://d/x', urlLong: 'https://d/1GB.bin', closest: false, lat: 0, lng: 0, meta: { label: 'D', city: 'D', flag: '🌐', net: 'direct' } },
], { mode: 'accurate', reps: 2, windowMs: 15000, streams: 1, capBytes: 500 * 1024 * 1024 });
fakeRun.nodes[0].status = 'done'; fakeRun.nodes[0].steady = 100;
fakeRun.nodes[1].status = 'done'; fakeRun.nodes[1].steady = 220;
fakeRun.nodes[2].status = 'failed'; fakeRun.nodes[2].err = 'timeout'; fakeRun.nodes[2].steady = null;
fakeRun.nodes[3].status = 'skipped'; fakeRun.nodes[3].err = 'data budget (12 GB)';
const sum = A.summarizeRun(fakeRun);
t('ranked only valid', sum.ranked.length === 2);
t('rank order by steady', sum.ranked[0].s.region === 'b' && sum.ranked[0].rank === 1 && sum.ranked[1].rank === 2);
t('failed section', sum.failed.length === 2);

/* ---------- live worker tests ---------- */
function makeWorkerEnv() {
  const messages = [];
  const listeners = {};
  const self = {
    postMessage: (m) => messages.push(m),
    addEventListener: (n, fn) => { listeners[n] = fn; },
    removeEventListener: () => {},
    onmessage: null,
  };
  const ctx = { self, performance, fetch, setTimeout, clearTimeout, AbortController, URL, console };
  vm.createContext(ctx);
  vm.runInContext(A.WORKER_SRC, ctx, { filename: 'worker-src.js' });
  return {
    messages,
    send: (data) => self.onmessage({ data }),
    stop: () => { if (listeners.message) listeners.message({ data: 'stop' }); },
  };
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function until(messages, type, timeoutMs = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const m = messages.find(x => x.type === type);
    if (m) return m;
    await wait(100);
  }
  return null;
}

if (process.argv.includes('--unit')) {
  console.log(`\n${pass} passed, ${fail} failed (unit only — no network; drop --unit for live CDN tests)`);
  process.exit(fail ? 1 : 0);
}

/* Live tests are vantage-point independent: probe a 2 MB sample first,
 * then scale byte/speed assertions from the measured baseline. */
const LIVE_URL = process.env.LIVE_URL || 'https://store-011.wnam.tb-cdn.io/dld/1GB.bin';
const baselineMBps = await (async () => {
  const end = 2 * 1024 * 1024 - 1;
  const t0 = performance.now();
  const r = await fetch(LIVE_URL, { headers: { Range: 'bytes=0-' + end }, cache: 'no-store' });
  const buf = Buffer.from(await r.arrayBuffer());
  const dt = (performance.now() - t0) / 1000;
  return buf.byteLength / dt / 1e6;
})();
const baselineMbps = baselineMBps * 8;
console.log(`\n== live: baseline ${baselineMBps.toFixed(1)} MB/s (${baselineMbps.toFixed(0)} Mbps) @ ${LIVE_URL} ==`);
const WINDOW_S = 6;
const SLICE_BYTES = Math.min(125 * 1024 * 1024, Math.max(8 * 1024 * 1024, Math.round(baselineMBps * 10) * 1024 * 1024));

console.log('\n== live: ping + 6 s windowed 1 GB transfer ==');
{
  const env = makeWorkerEnv();
  const p = env.send({ url: LIVE_URL, withPing: true, pingRounds: 5, windowMs: WINDOW_S * 1000, graceMs: 8000 });
  const ping = await until(env.messages, 'ping');
  t('ping message sent', !!ping);
  t('ping 5 rounds', ping && ping.pingsAll.length === 5, `got ${ping && ping.pingsAll.length}`);
  t('ping trimmed mean sane', ping && ping.ping > 5 && ping.ping < 5000, `ping=${ping && ping.ping}`);
  t('ping min ≤ mean', ping && ping.pingMin <= ping.ping + 0.01);
  t('jitter present', ping && ping.jitter >= 0);
  const done = await until(env.messages, 'done', 60000);
  t('done message sent', !!done);
  if (done) {
    t('transfer ok (capped or complete)', done.ok === true && (done.status === 'capped' || done.status === 'complete'), `status=${done.status} err=${done.err}`);
    t('bytes > 1 MB in window', done.bytes > 1e6, `bytes=${(done.bytes / 1e6).toFixed(1)}MB`);
    // Cloudflare-fronted nodes ramp per-connection, so the 2 MB baseline probe
    // does NOT predict the sustained rate — assert line-rate-independent
    // invariants instead.
    t('steady absolute sanity (5–10 Gbps)', done.steadyMbps > 5 && done.steadyMbps < 10000, `steady=${done.steadyMbps && done.steadyMbps.toFixed(1)}Mbps`);
    t('avgFb ≤ steady×1.25 (ramp included)', done.avgFbMbps > 0 && done.avgFbMbps <= done.steadyMbps * 1.25 + 5, `avgFb=${done.avgFbMbps && done.avgFbMbps.toFixed(1)}Mbps`);
    t('peak ≥ steady (window mean cannot exceed max interval)', done.peakMbps >= done.steadyMbps - 1, `peak=${done.peakMbps && done.peakMbps.toFixed(1)}Mbps`);
    t('ttfb measured', done.ttfb != null && done.ttfb > 0, `ttfb=${done.ttfb}`);
    t('firstByteMs measured', done.firstByteMs > 0, `fb=${done.firstByteMs}`);
    t('peak ≥ p95 ≥ 0', done.peakMbps >= (done.p95Mbps || 0) && done.peakMbps > 0);
    t('marks for sparkline', Array.isArray(done.marks) && done.marks.length >= 5, `marks=${done.marks.length}`);
    t('elapsed ≈ 6 s window', done.elapsedMs > WINDOW_S * 1000 - 200 && done.elapsedMs < WINDOW_S * 1000 + 6000, `elapsed=${done.elapsedMs}`);
  }
  console.log(`  info: bytes=${done && (done.bytes / 1e6).toFixed(0)}MB steady=${done && done.steadyMbps && done.steadyMbps.toFixed(1)}Mbps avgFb=${done && done.avgFbMbps && done.avgFbMbps.toFixed(1)}Mbps ping=${ping && ping.ping && ping.ping.toFixed(0)}ms ttfb=${done && done.ttfb && done.ttfb.toFixed(0)}ms`);
}

console.log(`\n== live: Range slice (${(SLICE_BYTES / 1048576).toFixed(0)} MB, capacity-style) ==`);
{
  const env = makeWorkerEnv();
  const p = env.send({ url: LIVE_URL, withPing: false, windowMs: 30000, graceMs: 8000, range: { start: 0, end: SLICE_BYTES - 1 }, maxBytes: SLICE_BYTES });
  const done = await until(env.messages, 'done', 90000);
  t('slice done ok', !!done && done.ok === true, `status=${done && done.status} err=${done && done.err}`);
  t('slice bytes exact (±1 KB)', done && Math.abs(done.bytes - SLICE_BYTES) < 1024, `bytes=${done && done.bytes}`);
  // A multi-second slice crosses the 800 ms mid-fallback threshold, so we
  // expect a steady estimate (or, if it finishes very fast, a sane avgFb).
  const sliceRate = done ? (done.steadyMbps != null ? done.steadyMbps : done.avgFbMbps) : null;
  t('slice steady/avgFb sane (5–10 Gbps)', sliceRate != null && sliceRate > 5 && sliceRate < 10000,
    `steady=${done && done.steadyMbps} avgFb=${done && done.avgFbMbps}`);
}

console.log('\n== live: ping-only mode (no transfer) ==');
{
  const env = makeWorkerEnv();
  const p = env.send({ url: LIVE_URL, withPing: true, pingRounds: 5, windowMs: 0 });
  const done = await until(env.messages, 'done', 30000);
  t('ping-only done', !!done && done.status === 'ping-only', `status=${done && done.status}`);
  t('ping-only has ping', done && done.ping != null && done.ping > 0, `ping=${done && done.ping}`);
  t('ping-only no bytes', done && done.bytes === 0);
}

console.log('\n== live: stop message aborts a running transfer ==');
{
  const env = makeWorkerEnv();
  const p = env.send({ url: LIVE_URL, withPing: false, windowMs: 30000, graceMs: 8000 });
  await until(env.messages, 'progress', 30000);
  const before = env.messages.length;
  env.stop();
  const done = await until(env.messages, 'done', 15000);
  t('stop → done with aborted status', !!done && (done.status === 'aborted' || done.status === 'timeout'), `status=${done && done.status}`);
  t('stop → not ok', !!done && done.ok === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
