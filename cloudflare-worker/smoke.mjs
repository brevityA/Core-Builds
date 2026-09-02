#!/usr/bin/env node
// Post-deploy smoke test for the Core Builds CORS proxy worker.
//
// Run AFTER the worker has been deployed (Actions deploy on merge, or wrangler):
//   node cloudflare-worker/smoke.mjs [--base=https://core-builds-cors-proxy.<sub>.workers.dev]
//
// Exit code 0 = all checks passed, 1 = at least one failed.
// Requires Node 18+ (global fetch + AbortSignal.timeout).

const DEFAULT_BASE = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev';
const args = process.argv.slice(2);
const baseArg = args.find((a) => a.startsWith('--base='));
const BASE = (baseArg ? baseArg.split('=')[1] : DEFAULT_BASE).replace(/\/+$/, '');

// Keep in sync with ALLOWED_HOSTS in worker.js.
const AIO_HOSTS = [
  'https://aiostreams.elfhosted.com',
  'https://aiostreams.fortheweak.cloud',
  'https://aiostreamsfortheweebsstable.midnightignite.me',
  'https://aiostreams.viren070.me',
  'https://aiostreams.stremio.ru',
  'https://aio.atbphosting.com',
  'https://aiostreams.12312023.xyz',
  'https://aiostreams-stable.forthewizards.uk',
];

const TIMEOUT_MS = 15000;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: res.status, headers: res.headers, text: await res.text() };
}

const enc = (s) => encodeURIComponent(s);

async function main() {
  console.log(`Core Builds worker smoke — ${BASE}\n`);

  // 1. stats endpoint + new observability counters
  try {
    const r = await get(`${BASE}/api/stats`);
    check('GET /api/stats → 200', r.status === 200, `http ${r.status}`);
    if (r.status === 200) {
      let d;
      try { d = JSON.parse(r.text); } catch { d = null; }
      check('stats has visits counter', !!d && Number.isFinite(Number(d.visits)), `visits=${d?.visits}`);
      for (const key of ['proxy_cache_hits', 'visits_rate_limited', 'visits_write_err', 'proxy_err_timeout', 'proxy_err_network', 'proxy_err_oversize', 'proxy_err_status']) {
        if (d && !(key in d)) console.log(`WARN  stats key "${key}" missing — deployed worker older than 2026-08-21?`);
      }
    }
  } catch (e) {
    check('GET /api/stats → 200', false, String(e.message || e));
  }

  // 2. status probes through the allowlisted lane + the 30s cache header
  for (const host of AIO_HOSTS) {
    const label = host.replace('https://', '');
    try {
      const r = await get(`${BASE}/proxy/api/v1/status?host=${enc(host)}`);
      const cc = r.headers.get('cache-control') || '';
      const cached = /max-age=30/.test(cc);
      check(`status ${label}`, r.status === 200, `http ${r.status}${cached ? ' · cached' : ' · NO cache header'}`);
      if (r.status === 200) {
        try { const d = JSON.parse(r.text); if (!d?.data?.version) console.log(`WARN  ${label} status missing data.version`); } catch { /* non-JSON */ }
      }
    } catch (e) {
      check(`status ${label}`, false, String(e.message || e));
    }
  }

  // 3. custom/self-hosted lane matrix (Stage-0 F1 gate)
  try {
    const r = await get(`${BASE}/proxy/api/v1/status?host=${enc('https://example.com')}`);
    check('custom lane accepts https origin (status probe)', r.status !== 403 && r.status !== 429, `http ${r.status} (403 = lane closed)`);
  } catch (e) {
    check('custom lane accepts https origin (status probe)', false, String(e.message || e));
  }
  try {
    const r = await get(`${BASE}/proxy/api/v1/status?host=${enc('http://example.com')}`);
    check('custom lane refuses http://', r.status === 403, `http ${r.status}`);
  } catch (e) {
    check('custom lane refuses http://', false, String(e.message || e));
  }
  try {
    const r = await get(`${BASE}/proxy/api/v1/user?host=${enc('https://example.com')}`);
    check('custom lane refuses GET /api/v1/user (POST/PATCH only)', r.status === 403, `http ${r.status}`);
  } catch (e) {
    check('custom lane refuses GET /api/v1/user', false, String(e.message || e));
  }

  // 4. paste roundtrip
  try {
    const body = JSON.stringify({ metadata: { id: 'smoke', name: 'smoke', version: '0.0.1' }, config: { addonName: 'smoke' } });
    const post = await fetch(`${BASE}/paste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const postJson = await post.json().catch(() => null);
    check('POST /paste → 200 + url', post.status === 200 && !!postJson?.url, `http ${post.status}`);
    if (post.status === 200 && postJson?.url) {
      const r = await get(postJson.url);
      check('GET /t/:id roundtrip matches', r.status === 200 && r.text === body, `http ${r.status}${r.text === body ? '' : ' · body mismatch'}`);
    }
  } catch (e) {
    check('POST /paste roundtrip', false, String(e.message || e));
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('smoke crashed:', e); process.exit(1); });
