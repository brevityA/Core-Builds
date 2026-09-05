#!/usr/bin/env node
// Post-deploy smoke test for the Core Builds CORS proxy worker.
//
// Run AFTER the worker has been deployed (Actions deploy on merge, or wrangler):
//   node cloudflare-worker/smoke.mjs [--base=https://core-builds-cors-proxy.<sub>.workers.dev] [--strict]
//
// --strict turns "deployed worker is older than this smoke" warnings into failures
// (the deploy workflow uses it as the post-deploy gate).
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

// --strict: fail (not warn) when the deployed worker predates 2026-09-03
// (used by the deploy workflow's post-deploy gate).
const STRICT = args.includes('--strict');
const EXPECTED_VERSION = '2026-09-03';

async function main() {
  console.log(`Core Builds worker smoke — ${BASE}\n`);

  // 0. health: cheapest possible liveness + version + bindings (no KV)
  try {
    const r = await get(`${BASE}/healthz`);
    let h = null; try { h = JSON.parse(r.text); } catch {}
    check('GET /healthz → 200', r.status === 200 || !STRICT, `http ${r.status} version=${h?.version}${r.status === 404 ? ' (pre-2026-09-03 worker)' : ''}`);
    if (h && r.status === 200) {
      const isNew = h.version === EXPECTED_VERSION;
      check('healthz reports expected worker version', isNew || !STRICT, `got ${h.version}, expected ${EXPECTED_VERSION}${isNew ? '' : ' (stale deploy?)'}`);
      check('healthz: a paste store is bound (PASTES DO or TEMPLATES KV)', !!(h.bindings?.PASTES || h.bindings?.TEMPLATES), JSON.stringify(h.bindings));
      if (!h.bindings?.PASTES) console.log('WARN  PASTES Durable Object not bound — paste read-after-write relies on KV (eventual consistency)');
      if (!h.bindings?.RL_PROXY) console.log('WARN  Rate Limiting bindings not present — only the in-isolate floor + KV (if bound) enforce limits');
      check('healthz: no circuit breakers open', (h.breakers_open || 0) === 0, `breakers_open=${h.breakers_open}`);
    }
  } catch (e) {
    check('GET /healthz → 200', false, String(e.message || e));
  }

  // 1. stats endpoint + observability counters
  try {
    const r = await get(`${BASE}/api/stats`);
    check('GET /api/stats → 200', r.status === 200, `http ${r.status}`);
    if (r.status === 200) {
      let d;
      try { d = JSON.parse(r.text); } catch { d = null; }
      const hasCounters = !!d && Object.keys(d).length > 2;
      check('stats has visits counter', !hasCounters || Number.isFinite(Number(d.visits)), hasCounters ? `visits=${d?.visits}` : 'no STATS binding (staging?)');
      const required = ['proxy_cache_hits', 'visits_rate_limited', 'visits_write_err', 'proxy_err_timeout', 'proxy_err_network', 'proxy_err_oversize', 'proxy_err_status',
        'proxy_err_redirect', 'proxy_err_breaker', 'contact_messages', 'counter_write_err', 'rate_limited', 'by_rate_limit'];
      const missing = d ? required.filter((k) => !(k in d)) : required;
      check('stats exposes every counter class', missing.length === 0 || !STRICT, missing.length ? `missing: ${missing.join(', ')} (deployed worker older than 2026-09-03?)` : 'all present');
      if (d && Number(d.proxy_calls) > 100) {
        const ratio = Number(d.proxy_errors) / Number(d.proxy_calls);
        check('lifetime proxy error ratio < 35%', ratio < 0.35, `${(ratio * 100).toFixed(1)}%`);
      }
      if (d && Object.keys(d.by_host || {}).some((h) => !AIO_HOSTS.some((a) => a.endsWith(h)) && !['api.wuplay.app', 'api.torbox.app', 'custom', 'unknown'].includes(h))) {
        console.log('WARN  by_host still lists pre-2026-09-03 custom hostnames (historical keys; new traffic is labelled "custom")');
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

  // 3b. security gates that must never regress (INFRA-AUDIT S2/S5/S9)
  try {
    // www.github.com answers every path with a 301 → github.com; the worker must refuse to follow it.
    const r = await get(`${BASE}/proxy/api/v1/status?host=${enc('https://www.github.com')}`);
    let j = null; try { j = JSON.parse(r.text); } catch {}
    check('proxy refuses upstream redirects (S2)', r.status === 502 && j?.error === 'upstream redirect refused', `http ${r.status} ${r.text.slice(0, 60)}`);
  } catch (e) {
    check('proxy refuses upstream redirects (S2)', false, String(e.message || e));
  }
  try {
    const r = await get(`${BASE}/proxy/api/v1/status?host=${enc('https://router.local')}`);
    check('custom lane refuses reserved hostnames (S5)', r.status === 403, `http ${r.status}`);
  } catch (e) {
    check('custom lane refuses reserved hostnames (S5)', false, String(e.message || e));
  }
  try {
    const r = await get(`${BASE}/nope`);
    check('security headers present (S9)', r.headers.get('x-frame-options') === 'DENY' && /frame-ancestors/.test(r.headers.get('content-security-policy') || ''), `xfo=${r.headers.get('x-frame-options')}`);
  } catch (e) {
    check('security headers present (S9)', false, String(e.message || e));
  }

  // 4. paste roundtrip — IMMEDIATE read-back (R1: no KV propagation wait)
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
      check('GET /t/:id immediate roundtrip matches', r.status === 200 && r.text === body, `http ${r.status}${r.text === body ? '' : ' · body mismatch'}`);
      check('GET /t/:id is no-store + ACAO *', r.headers.get('cache-control') === 'no-store' && r.headers.get('access-control-allow-origin') === '*');
    }
    const bad = await fetch(`${BASE}/paste`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"hello":"world"}', signal: AbortSignal.timeout(TIMEOUT_MS) });
    check('POST /paste rejects non-template JSON (400)', bad.status === 400, `http ${bad.status}`);
  } catch (e) {
    check('POST /paste roundtrip', false, String(e.message || e));
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('smoke crashed:', e); process.exit(1); });
