/* CoreSpeed v3 vs TorBox official vs curl — side-by-side accuracy benchmark
 * ─────────────────────────────────────────────────────────────────────────────
 * What it does
 *   For one CDN node, K rounds, each round runs three legs SEQUENTIALLY (no
 *   cross-contamination on the line):
 *
 *   v3      — the SHIPPED CoreSpeed v3 worker (extracted verbatim from
 *             index.html), TorBox's 100 MB file, first-byte-anchored stats.
 *             Headline: avgFb (bytes ÷ time since first byte) + steady.
 *   torbox  — TorBox's ACTUAL speedtest-worker.js code (verbatim), their exact
 *             protocol: single-HEAD ping, HEAD for size, fetch, 50 ms sampler,
 *             headline averageSpeed = totalBytes·8/10⁶ ÷ totalTime where the
 *             clock starts BEFORE the fetch (setup + TTFB + ramp included).
 *   curl    — OS-level reference: raw line speed, no JS/browser stack.
 *
 *   Then (with --full) a fourth leg:
 *   v3full  — the shipped v3 worker in its native mode: 1 GB file, first-byte-
 *             anchored window (default 15 s), two reps, median steady.
 *
 * Why this answers "why are the numbers different"
 *   v3 and torbox legs use the SAME 100 MB file on the SAME line in the SAME
 *   round. So:
 *     avgFb(v3) − average(torbox)  ≈ the setup/TTFB time TorBox's clock includes
 *     steady(v3) − average(torbox) ≈ setup inclusion + slow-start exclusion
 *     * − curl                        ≈ each JS method's overhead vs the raw line
 *
 * Usage
 *   node benchmark.mjs                       # tier A (3 legs × 2 rounds)
 *   node benchmark.mjs --full                # + v3 native 1 GB/15 s × 2 reps
 *   node benchmark.mjs --rounds 3 --window 20
 *   LIVE_URL=https://nexus-090.cnam.tb-cdn.io/dld/1GB.bin node benchmark.mjs
 *
 * Data budget: hard stop at DATA_BUDGET (default 2.5 GB) — the CDN is known to
 * rate-limit heavy per-host pulls; the report flags anything it skipped.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
const pExecFile = promisify(execFile);

/* ────────────────────────── args ────────────────────────── */
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const FLAG = (name) => process.argv.includes(name);
const ROUNDS = Math.max(1, Number(arg('--rounds', '2')));
const V3_WINDOW_MS = Number(arg('--window', '30000'));   // cap for the 100 MB leg (file usually completes first)
const TORBOX_STOP_MS = Number(arg('--torbox-stop', '30000')); // real site stops at 30 s
const FULL_WINDOW_MS = Number(arg('--full-window', '15000'));
const FULL_MAX_BYTES = 600 * 1024 * 1024;                // cap v3-native data on very fast lines
const DATA_BUDGET = Number(arg('--budget', String(2.5 * 1024 ** 3)));
const FULL = FLAG('--full');

const LIVE_URL = process.env.LIVE_URL || 'https://store-011.wnam.tb-cdn.io/dld/1GB.bin';
const URL100 = LIVE_URL.replace(/\/dld\/[^/]+$/, '/dld/100MB.bin');
const NODE_LABEL = new URL(LIVE_URL).host;
console.log(`\nCoreSpeed v3 vs TorBox official vs curl\nnode: ${NODE_LABEL}\nrounds: ${ROUNDS}${FULL ? ' (+ v3 native 1 GB)' : ''}  budget: ${(DATA_BUDGET / 1024 ** 3).toFixed(1)} GB\n`);

/* ────────────────────────── shared plumbing (same as test-engine) ────────────────────────── */
function makeWorkerEnv(src) {
  const messages = [];
  const listeners = {};
  const self = {
    postMessage: (m) => messages.push(m),
    addEventListener: (n, fn) => { listeners[n] = fn; },
    removeEventListener: () => {},
    onmessage: null,
  };
  const ctx = { self, performance, fetch, setTimeout, clearTimeout, setInterval, clearInterval, AbortController, URL, console };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'worker.js' });
  return {
    messages,
    send: (data) => { if (self.onmessage) self.onmessage({ data }); else listeners.message && listeners.message({ data }); },
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

/* ────────────────────────── sources ────────────────────────── */
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const V3_SRC = html.match(/const WORKER_SRC = `([\s\S]*?)`;/)[1];
// TorBox's current protocol — use a local copy if present (e.g. a pinned test
// fixture), otherwise fetch it fresh from torbox.app so we always benchmark
// against their CURRENT worker.
function loadTorboxWorker() {
  const local = new URL('./torbox-speedtest-worker.js', import.meta.url);
  if (existsSync(local)) return readFileSync(local, 'utf8');
  const pin = process.env.TB_WORKER;
  if (pin) return readFileSync(pin, 'utf8');
  // sync fetch via curl to stay in the top-level sync flow
  const src = execFileSync('curl', ['-sL', '--max-time', '20', 'https://torbox.app/speedtest-worker.js'], { encoding: 'utf8' });
  if (!src || src.length < 500) throw new Error('could not download torbox speedtest-worker.js');
  return src;
}
const TB_SRC = loadTorboxWorker();

let usedBytes = 0;
const guard = (b) => { usedBytes += b || 0; if (usedBytes > DATA_BUDGET) throw new Error('BUDGET'); };

/* ────────────────────────── legs ────────────────────────── */
async function legV3() {
  const env = makeWorkerEnv(V3_SRC);
  env.send({ url: URL100, withPing: true, pingRounds: 5, windowMs: V3_WINDOW_MS, graceMs: 8000 });
  const done = await until(env.messages, 'done', V3_WINDOW_MS + 20000);
  if (!done) return { status: 'no-response' };
  guard(done.bytes);
  return { status: done.status, ok: done.ok, avgFbMbps: done.avgFbMbps, steadyMbps: done.steadyMbps, peakMbps: done.peakMbps, ping: done.ping, ttfbMs: done.ttfb, firstByteMs: done.firstByteMs, bytes: done.bytes };
}

async function legTorbox() {
  // TorBox protocol, verbatim: single-HEAD ping, then fetch; page stops at 30 s.
  const env = makeWorkerEnv(TB_SRC);
  env.send({ type: 'start', data: { server: { url: URL100, region: NODE_LABEL, name: NODE_LABEL, closest: true }, isMultithreaded: false, userCountry: 'AU' } });
  const stopT = setTimeout(() => env.stop(), TORBOX_STOP_MS);
  const complete = await until(env.messages, 'complete', TORBOX_STOP_MS + 15000);
  clearTimeout(stopT);
  env.stop();
  if (!complete) return { status: 'no-response' };
  const r = complete.results || {};
  guard(r.bytes || 0);
  return { status: 'complete', averageSpeedMbps: r.averageSpeedMbps, maxSpeedMbps: r.maxSpeedMbps, ping: r.ping, region: r.region };
}

async function legCurl() {
  try {
    const { stdout } = await pExecFile('curl', ['-s', '--max-time', String(Math.ceil(V3_WINDOW_MS / 1000) + 5), '-o', '/dev/null', '-w', '%{http_code} %{speed_download} %{size_download} %{time_starttransfer}', URL100], { timeout: (V3_WINDOW_MS / 1000 + 10) * 1000 });
    const [code, bps, bytes, ttfb] = stdout.trim().split(' ').map(Number);
    if (code !== 200 && code !== 206) return { status: `http ${code}` };
    guard(bytes);
    return { status: 'ok', mbps: (bps * 8) / 1e6, bytes, ttfbMs: ttfb * 1000 };
  } catch (e) {
    return { status: 'error: ' + (e.message || 'curl failed').slice(0, 60) };
  }
}

async function legV3Full() {
  // Native v3 mode: 1 GB file, first-byte-anchored window, 2 reps, median steady.
  const reps = [];
  for (let i = 0; i < 2; i++) {
    const env = makeWorkerEnv(V3_SRC);
    const range = i === 1 ? { start: Math.floor(1073741824 / 2), end: 1073741823 } : null;
    env.send({ url: LIVE_URL, withPing: i === 0, pingRounds: 5, windowMs: FULL_WINDOW_MS, graceMs: 8000, range, maxBytes: FULL_MAX_BYTES });
    const done = await until(env.messages, 'done', FULL_WINDOW_MS + 20000);
    if (!done) break;
    guard(done.bytes);
    reps.push(done);
    await wait(500);
  }
  const ok = reps.filter(r => r.ok);
  const med = (arr) => { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  return {
    reps: ok.length,
    steadyMbps: med(ok.map(r => r.steadyMbps).filter(v => v != null)),
    avgFbMbps: med(ok.map(r => r.avgFbMbps).filter(v => v != null)),
    peakMbps: Math.max(...ok.map(r => r.peakMbps || 0)),
    ping: ok.length ? ok[0].ping : null,
    ttfbMs: ok.length ? ok[0].ttfb : null,
    bytes: ok.reduce((a, r) => a + r.bytes, 0),
  };
}

/* ────────────────────────── run ────────────────────────── */
const rounds = [];
const median = (arr) => { const a = arr.filter(v => v != null && isFinite(v)); if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

for (let r = 1; r <= ROUNDS; r++) {
  const round = { round: r };
  const runLeg = async (name, fn) => {
    process.stdout.write(`  round ${r} · ${name.padEnd(8)} `);
    try { round[name] = await fn(); }
    catch (e) { round[name] = { status: e.message === 'BUDGET' ? 'skipped (data budget)' : 'error: ' + (e.message || e) }; }
    const g = round[name];
    const headline = name === 'torbox' ? g.averageSpeedMbps : name === 'curl' ? g.mbps : g.avgFbMbps;
    console.log(`${g.status}${headline != null ? ' → ' + headline.toFixed(1) + ' Mbps' : ''}`);
  };
  console.log(`round ${r}/${ROUNDS}`);
  await runLeg('v3', legV3);
  await wait(1000);
  await runLeg('torbox', legTorbox);
  await wait(1000);
  await runLeg('curl', legCurl);
  rounds.push(round);
  if (usedBytes > DATA_BUDGET * 0.85) { console.log('data budget nearly exhausted — skipping remaining rounds'); break; }
}

let v3full = null;
if (FULL) {
  console.log(`\nv3 native (1 GB, ${FULL_WINDOW_MS / 1000} s window, 2 reps)`);
  try { v3full = await legV3Full(); console.log(`  → steady ${v3full.steadyMbps ? v3full.steadyMbps.toFixed(1) : '—'} Mbps over ${v3full.reps} reps, ${(v3full.bytes / 1024 ** 3).toFixed(2)} GB`); }
  catch (e) { v3full = { error: e.message }; }
}

/* ────────────────────────── report ────────────────────────── */
const M = (key) => median(rounds.map(rd => rd[key] && rd[key][key === 'torbox' ? 'averageSpeedMbps' : key === 'curl' ? 'mbps' : 'avgFbMbps']));
const med = (sel) => median(rounds.map(sel));
const pct = (a, b) => (a != null && b != null && b > 0) ? ((a - b) / b) * 100 : null;

const report = {
  ts: new Date().toISOString(),
  node: NODE_LABEL, url100: URL100, url1gb: LIVE_URL,
  roundCount: rounds.length, full: !!v3full, usedBytes,
  rounds,
  median: {
    v3_avgFbMbps: M('v3'), v3_steadyMbps: med(rd => rd.v3 && rd.v3.steadyMbps), v3_ping: med(rd => rd.v3 && rd.v3.ping), v3_ttfbMs: med(rd => rd.v3 && rd.v3.ttfbMs),
    torbox_avgMbps: M('torbox'), torbox_maxMbps: med(rd => rd.torbox && rd.torbox.maxSpeedMbps), torbox_ping: med(rd => rd.torbox && rd.torbox.ping),
    curl_mbps: M('curl'),
  },
  v3full: v3full,
  // Per-ROUND paired deltas — v3 and torbox measured the same file seconds
  // apart, so round-to-round line noise cancels in these ratios. This is the
  // rigorous comparison; the medians above are secondary.
  per_round_deltas_pct: rounds.map(rd => ({
    round: rd.round,
    v3_avgFb_vs_torbox_avg: pct(rd.v3 && rd.v3.avgFbMbps, rd.torbox && rd.torbox.averageSpeedMbps),
    v3_avgFb_vs_curl: pct(rd.v3 && rd.v3.avgFbMbps, rd.curl && rd.curl.mbps),
    torbox_avg_vs_curl: pct(rd.torbox && rd.torbox.averageSpeedMbps, rd.curl && rd.curl.mbps),
  })),
  deltas_pct: {
    // median of the per-round paired deltas (the headline numbers)
    v3_avgFb_vs_torbox_avg: median(rounds.map(rd => pct(rd.v3 && rd.v3.avgFbMbps, rd.torbox && rd.torbox.averageSpeedMbps))),
    v3_avgFb_vs_curl: median(rounds.map(rd => pct(rd.v3 && rd.v3.avgFbMbps, rd.curl && rd.curl.mbps))),
    torbox_avg_vs_curl: median(rounds.map(rd => pct(rd.torbox && rd.torbox.averageSpeedMbps, rd.curl && rd.curl.mbps))),
  },
  notes: [
    'v3 and torbox legs use the SAME 100 MB file on the same line, same round — only the protocol differs.',
    'v3 avgFb = bytes ÷ (end − firstByte). TorBox average = bytes ÷ (end − fetchStart) i.e. includes DNS+TCP+TLS+TTFB.',
    'v3 steady = window minus first 2 s (slow-start excluded); TorBox has no steady-state statistic.',
    'curl is the OS-level reference (no JS/browser stack).',
    'Numbers are vantage-point specific (this machine to this node) — they document METHODOLOGY, not absolute line speed.',
  ],
};

const f1 = (v) => (v == null ? '—' : v.toFixed(1));
console.log('\n' + '═'.repeat(78));
console.log('PER-ROUND HEADLINE (same 100 MB file, legs ~1 s apart — paired)');
console.log('─'.repeat(78));
report.per_round_deltas_pct.forEach(d => {
  console.log(`  round ${d.round}:  v3 vs torbox ${d.v3_avgFb_vs_torbox_avg == null ? '—' : d.v3_avgFb_vs_torbox_avg.toFixed(1).padStart(7)}%   v3 vs curl ${d.v3_avgFb_vs_curl == null ? '—' : d.v3_avgFb_vs_curl.toFixed(1).padStart(7)}%   torbox vs curl ${d.torbox_avg_vs_curl == null ? '—' : d.torbox_avg_vs_curl.toFixed(1).padStart(7)}%`);
});
console.log('─'.repeat(78));
console.log(`  medians:  v3 avgFb ${f1(report.median.v3_avgFbMbps)} Mbps · torbox avg ${f1(report.median.torbox_avgMbps)} Mbps · curl raw ${f1(report.median.curl_mbps)} Mbps`);
console.log('  Δ v3 avgFb − torbox avg (median of paired): ' + (report.deltas_pct.v3_avgFb_vs_torbox_avg == null ? '—' : report.deltas_pct.v3_avgFb_vs_torbox_avg.toFixed(1) + '%') + '   ← setup/TTFB TorBox includes');
console.log('  Δ v3 avgFb − curl (median of paired)      : ' + (report.deltas_pct.v3_avgFb_vs_curl == null ? '—' : report.deltas_pct.v3_avgFb_vs_curl.toFixed(1) + '%'));
console.log('  Δ torbox avg − curl (median of paired)    : ' + (report.deltas_pct.torbox_avg_vs_curl == null ? '—' : report.deltas_pct.torbox_avg_vs_curl.toFixed(1) + '%'));
if (v3full && v3full.steadyMbps) console.log(`  v3-full  steady ${f1(v3full.steadyMbps)} Mbps (1 GB, ${FULL_WINDOW_MS / 1000} s × 2 reps — the mode where the steady statistic is meaningful)`);
console.log('═'.repeat(78));

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const jsonPath = `benchmark-report-${stamp}.json`;
writeFileSync(jsonPath, JSON.stringify(report, null, 2));
console.log(`\nreport: ${jsonPath} · data used: ${(usedBytes / 1024 ** 3).toFixed(2)} GB`);
