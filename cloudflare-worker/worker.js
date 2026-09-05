// Core Builds — CORS proxy + template paste + usage analytics for the configurator.
//
// /proxy/*       — re-issues AIOStreams API requests server-to-server to bypass CORS.
// /paste         — stores a validated template or Nuvio badge-pack JSON and returns a URL.
//                  Imports expire after 30 days. Nothing is logged or inspected.
// /t/:id         — returns a stored paste (Durable Object first, legacy KV fallback).
// /api/stats     — returns all usage counters (totals + breakdowns).
// /api/visit     — increments configurator visit counter.
// /api/generate  — increments template generation counter (accepts service/device/resolution).
// /healthz       — liveness/readiness: bindings present + version tag. No I/O.
//
// Proxy calls, paste creates, and paste views are counted automatically.
// Per-host proxy counts, per-service generates, and daily counters are tracked.
//
// Hardening history: 2026-07-27 (caps/timeouts/KV rate limit), 2026-08-21 (custom
// lane, probe cache, CORS narrowing), 2026-09-03 (INFRA-AUDIT.md: redirect refusal,
// layered rate limiting, DO paste store, circuit breaker, observability fixes).

const WORKER_VERSION = '2026-09-03';

// ── Hardening constants ─────────────────────────────────────────────────────
const PROXY_MAX_SIZE = 2 * 1024 * 1024;     // 2 MB proxy request body cap (configs are a few KB)
const PROXY_RESP_MAX_SIZE = 8 * 1024 * 1024; // 8 MB proxy response cap
const PROXY_TIMEOUT_MS = 15000;              // upstream fetch timeout
const PROXY_PATH_RE = /^\/[A-Za-z0-9_\-./%]*$/; // upstream path allowlist (no traversal)
const CONTACT_MAX_SIZE = 16 * 1024;          // contact form payload cap (S7)
const GENERATE_MAX_SIZE = 64 * 1024;         // telemetry payloads are tiny
const PASTE_CREATE_PER_MIN = 10;
const PASTE_READ_PER_MIN = 60;
const CONTACT_PER_HOUR = 5;
const ANALYTICS_PER_MIN = 30;
const STATS_PER_MIN = 20;

// Client IP from Cloudflare's header. Returns '' when absent (direct calls / tests),
// in which case rate limiting is skipped — you cannot fairly bucket an unknown client.
// cf-connecting-ip is set by the Cloudflare edge on every request that reaches a
// Worker and cannot be supplied by the client; X-Forwarded-For is deliberately NOT
// consulted (client-controlled).
function getClientIp(request) {
  return request.headers.get('cf-connecting-ip') || '';
}

// ── Layered rate limiting (INFRA-AUDIT S4) ──────────────────────────────────
//
// Three layers, strongest available wins, each degrading to the next:
//   1. Workers Rate Limiting binding (env.RL_<SCOPE>): counters live on the machine
//      running the Worker and are shared across isolates in the colo — survives
//      isolate recycling, no network round-trip, no KV write cost.
//   2. KV fixed-window bucket (env.RATELIMIT): cross-colo, but KV allows only one
//      write per second per key, so a burst makes put() throw. Treat a write
//      failure INSIDE the window as "someone else is writing this key right now",
//      i.e. count it against the caller instead of failing open.
//   3. In-isolate token map: a floor that always exists, even with zero bindings.
//      Per-isolate only — it stops single-isolate abuse (the common case for one
//      attacking IP hammering one colo) and is documented as best-effort.
// A "deny" from any layer is final. Layers are consulted cheapest-first.
const RL_BINDING_FOR_SCOPE = {
  proxy: 'RL_PROXY', proxy_custom: 'RL_PROXY_CUSTOM', paste: 'RL_PASTE', paste_read: 'RL_PASTE_READ',
  visit: 'RL_ANALYTICS', generate: 'RL_ANALYTICS', stats: 'RL_STATS', contact: 'RL_CONTACT',
};
const localBuckets = new Map(); // key -> { count, windowStart }
const LOCAL_BUCKET_CAP = 5000;  // hard memory bound; oldest evicted first
function localAllow(key, max, windowMs) {
  const now = Date.now();
  let b = localBuckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    if (localBuckets.size >= LOCAL_BUCKET_CAP) localBuckets.delete(localBuckets.keys().next().value);
    b = { count: 0, windowStart: now };
    localBuckets.set(key, b);
  }
  b.count += 1;
  return b.count <= max;
}

async function rateAllow(env, scope, ip, max, windowSec) {
  if (!ip) return true;
  const windowMs = windowSec * 1000;
  // Layer 3 first: free, and denies immediately on a hot isolate.
  if (!localAllow(`${scope}:${ip}`, max, windowMs)) return false;
  // Layer 1: platform binding (per-colo, cross-isolate).
  const binding = env && env[RL_BINDING_FOR_SCOPE[scope]];
  if (binding && typeof binding.limit === 'function') {
    try {
      const { success } = await binding.limit({ key: `${scope}:${ip}` });
      if (!success) return false;
    } catch { /* binding blip — fall through to KV */ }
  }
  // Layer 2: KV (global window). Optional.
  const kv = env && env.RATELIMIT;
  if (kv) {
    const bucket = Math.floor(Date.now() / windowMs);
    const key = `rl:${scope}:${ip}:${bucket}`;
    try {
      const raw = await kv.get(key);
      const count = parseInt(raw, 10) || 0;
      if (count >= max) return false;
      try {
        await kv.put(key, String(count + 1), { expirationTtl: windowSec + 60 });
      } catch {
        // Same-key write cap (1/s) tripped: the key is being hammered. Only a burst
        // from this very IP can cause that, so count it as a hit rather than
        // letting the burst through (the pre-2026-09-03 behaviour).
        if (count + 1 >= max) return false;
      }
    } catch { /* KV read failure — layers 1/3 already ran; allow */ }
  }
  return true;
}

// Read a request body as text with a hard byte cap (returns null on overflow/empty-GET).
async function readCapped(request, max) {
  const len = parseInt(request.headers.get('content-length') || '0', 10);
  if (len > max) return null;
  const buf = await request.arrayBuffer();
  if (buf.byteLength > max) return null;
  return new TextDecoder().decode(buf);
}

// Read an upstream response body as bytes with a hard byte cap (null on overflow).
// Bytes, not text: decoding 8 MB to a JS string and back is CPU we pay for on the
// 10 ms Free-plan budget, and it corrupts non-UTF-8 bodies (INFRA-AUDIT R4).
async function readResponseCapped(response, max) {
  const len = parseInt(response.headers.get('content-length') || '0', 10);
  if (len > max) { try { await response.body?.cancel(); } catch {} return null; }
  const buf = await response.arrayBuffer();
  if (buf.byteLength > max) return null;
  return buf;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

// Public status-probe cache (see isStatusProbe in the proxy handler). Workers
// run in front of the CDN edge cache, so this uses the Cache API (colo-local).
// Everything else stays no-store — pastes/configs must never be cached.
const STATUS_PROBE_CACHE_HEADER = { 'Cache-Control': 'public, max-age=30, s-maxage=30' };
const STATUS_PROBE_CACHE_TTL = 30; // seconds

async function statusProbeCacheGet(url) {
  try {
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    return await caches.default.match(cacheKey);
  } catch { return null; } // no Cache API in tests/local — degrade to uncached
}

// Single-flight for status-probe cache misses (INFRA-AUDIT R2). A page load fires
// one probe per host; on a cold colo every concurrent miss for the same URL would
// go upstream and burn a rate-limit token each. Concurrent misses in one isolate
// now share a single upstream fetch and receive a clone of its response.
const inflightProbes = new Map(); // cache url -> Promise<{status, headers, body:ArrayBuffer}>
function singleFlight(key, run) {
  let p = inflightProbes.get(key);
  if (!p) {
    p = run().finally(() => inflightProbes.delete(key));
    inflightProbes.set(key, p);
  }
  return p;
}

function statusProbeCachePut(ctx, url, response, ttl = STATUS_PROBE_CACHE_TTL) {
  const put = (async () => {
    try {
      const copy = response.clone();
      copy.headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
      await caches.default.put(new Request(url.toString(), { method: 'GET' }), copy);
    } catch { /* cache write failures are never fatal */ }
  })();
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(put);
  else put.catch(() => {}); // no ctx (unit tests) — settle best-effort
}

const ALLOWED_HOSTS = new Set([
  'https://aiostreams.elfhosted.com',
  'https://aiostreams.fortheweak.cloud',
  'https://aiostreamsfortheweebsstable.midnightignite.me',
  'https://aiostreams.viren070.me',
  'https://aiostreams.stremio.ru',
  'https://aio.atbphosting.com',
  'https://aiostreams.12312023.xyz',
  'https://aiostreams-stable.forthewizards.uk',
  // WuPlay genie lane: read probes + (post-dev-blessing) profile-sync writes.
  'https://api.wuplay.app',
  // CoreSpeed lane: the public TorBox speedtest endpoint (GET /v1/api/speedtest)
  // that powers the tools/speedtest page. No auth, no writes — read-only.
  'https://api.torbox.app',
]);

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH']);

// Hosts that may receive a caller-supplied Authorization header (INFRA-AUDIT S3).
// Only the WuPlay genie lane uses device tokens; every other allowlisted host is
// an AIOStreams instance that authenticates via the request body / URL, and the
// configurator never sends Authorization to them. Explicit allowlist so a future
// ALLOWED_HOSTS addition cannot silently inherit credential forwarding.
const AUTH_FORWARD_HOSTS = new Set(['https://api.wuplay.app']);

// Reserved / non-public name shapes refused on the custom lane (INFRA-AUDIT S5).
// Cloudflare's egress already refuses private targets; this keeps the worker from
// even attempting them. Self-hosted AIOStreams instances are public FQDNs.
const RESERVED_HOST_RE = /(^|\.)(localhost|local|internal|intranet|home|lan|corp|arpa|test|invalid|example|onion)$/i;

// Per-host narrowing for the generic proxy lane.
//
// By default an allowlisted host is reachable with GET/POST/PATCH on any path,
// and a caller-supplied Authorization header is forwarded verbatim — the WuPlay
// device-token lane depends on that. api.torbox.app is a third-party API where
// users hold their own account keys, and CoreSpeed needs exactly one public
// read: GET /v1/api/speedtest. Without narrowing, allowlisting the host would
// turn this worker into an authenticated relay for the whole TorBox API,
// reachable by anyone (CORS shapes browser responses, it does not gate requests).
//
// A host listed here is restricted to the named methods and paths, and never
// receives a credential.
const HOST_SCOPES = new Map([
  ['https://api.torbox.app', {
    methods: new Set(['GET']),
    paths: new Set(['/v1/api/speedtest']),
    stripAuth: true,
  }],
]);

// Custom / self-hosted lane.
//
// The configurator's "Custom / Self-hosted" host option lets a user point at
// their own AIOStreams instance. The page CSP forbids direct fetches to
// arbitrary origins, so those hosts must go through this worker — but the
// worker must not become a general-purpose relay for arbitrary URLs. The lane
// is therefore scoped to exactly the AIOStreams config surface:
//
//   host = origin only (https://self-host.example.com)
//     GET    /api/v1/status            health/version probe
//     POST   /api/v1/user              create config
//     PATCH  /api/v1/user              update config
//   host = manifest base (https://self-host.example.com/stremio/<uuid>/<epwd>)
//     GET    /stream/<type>/<id>.json  "Test Streams" probe from the manifest modal
//
// https-only, no userinfo/port, bounded path depth, tighter per-IP rate limit,
// and never receives a forwarded Authorization header. Cloudflare's runtime
// blocks subrequests to RFC1918/loopback/link-local addresses at the network
// layer, and self-hosted instances behind a Cloudflare Tunnel present a public
// hostname anyway, so the residual DNS-rebinding surface is the same bounded
// class as the existing open-relay design (which is rate-limited and path-
// scoped).
const CUSTOM_HOST_PER_MIN = 20;
function customHostScope(host, method, upstreamPath) {
  if (!host || !host.startsWith('https://')) return null;
  let u;
  try { u = new URL(host); } catch { return null; }
  if (u.username || u.password || u.port) return null;          // no userinfo, no explicit port
  if (u.search || u.hash) return null;
  const h = u.hostname.toLowerCase();
  // Reject loopback and private-literal forms outright (defense in depth — the
  // runtime already blocks private-IP subrequests, but never rely on one layer):
  //   - 127.* , localhost, 0.0.0.0, ::1
  //   - IPv4-mapped IPv6 (::ffff:127.0.0.1 serializes to [::ffff:7f00:1])
  //   - any pure-IP hostname (bracketed IPv6 or dotted IPv4) — custom AIOStreams
  //     hosts are hostnames; refusing literals removes an entire bypass class.
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || /^127\./.test(h)) return null;
  if (h.startsWith('[') || /^::ffff:/.test(h) || /^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return null;
  // Dotless names resolve via search domains (intranet-style); reserved TLDs
  // (.local, .internal, .lan, .test, .example, .onion …) never denote a public
  // AIOStreams instance. Matching is on the LAST label, so example.com (the
  // smoke canary) stays allowed while foo.example / foo.internal are refused.
  if (!h.includes('.') || RESERVED_HOST_RE.test(h)) return null;
  const path = u.pathname; // '/' (origin) or '/stremio/<uuid>/<epwd>' (manifest-derived base)
  const segs = path.split('/').length;
  if (path === '/') {
    const okStatus = method === 'GET' && upstreamPath === '/api/v1/status';
    const okUser   = (method === 'POST' || method === 'PATCH') && upstreamPath === '/api/v1/user';
    return (okStatus || okUser) ? { custom: true, stripAuth: true } : null;
  }
  if (!path.startsWith('/stremio/') || segs !== 4) return null; // exactly /stremio/<uuid>/<epwd>
  if (method !== 'GET' || !/^\/stream\/[^/]+\/[^/]+\.json$/.test(upstreamPath)) return null;
  return { custom: true, stripAuth: true };
}

const ALLOWED_ORIGINS = new Set([
  'https://brevitya.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:8080',
]);

function corsHeaders(request, publicRead = false) {
  const origin = request?.headers?.get('Origin') || '';
  // Public read endpoints (paste retrieval /t/, status probes) are fetched by
  // OTHER origins' web apps (any public AIOStreams host importing a template).
  // Echoing only allowlisted origins breaks that (browser CORS rejects when the
  // echoed origin != the requesting origin -> "Load failed" on import). For
  // these, allow any origin. Mutating/private endpoints keep the strict echo.
  let allowed;
  if (publicRead) allowed = '*';
  else allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://brevitya.github.io';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    // Public-read responses carry ACAO:* — the value does not depend on the
    // request Origin, so Vary: Origin would only fragment the CDN cache key.
    // Strict-echo responses keep it so caches never serve one origin's CORS
    // value to another.
    ...(publicRead ? {} : { 'Vary': 'Origin' }),
  };
}

const PASTE_TTL = 30 * 24 * 60 * 60; // 30 days
const PASTE_MAX_SIZE = 512 * 1024; // 512 KB
const BADGE_FILTER_MAX = 500;

function supportedPasteShape(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  // AIOStreams template wrapper generated by the Configurator.
  if (value.config && typeof value.config === 'object' && !Array.isArray(value.config)) return true;
  // Nuvio Fusion badge pack generated by Core Badge Builder. Keep the shape narrow so
  // /paste does not become a generic anonymous JSON store.
  if (!Array.isArray(value.groups) || !Array.isArray(value.filters)) return false;
  if (value.filters.length < 1 || value.filters.length > BADGE_FILTER_MAX) return false;
  return value.filters.every((filter) => filter && typeof filter === 'object' && !Array.isArray(filter)
    && typeof filter.id === 'string' && typeof filter.groupId === 'string'
    && typeof filter.name === 'string' && typeof filter.pattern === 'string'
    && typeof filter.imageURL === 'string');
}

const SECURE_DOC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

function json(status, body, cors = {}) {
  // Allow callers to pass response headers via a `headers` field without them leaking
  // into the JSON body (used for Cache-Control / no-store on sensitive/mutating routes).
  let data = body;
  let extraHeaders;
  if (body && typeof body === 'object' && !Array.isArray(body) && 'headers' in body) {
    const { headers, ...rest } = body;
    extraHeaders = headers;
    data = rest;
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...SECURE_DOC_HEADERS, ...cors, ...(extraHeaders || {}) },
  });
}

function randomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    if (b < 252) id += chars[b % chars.length]; // rejection sampling — removes modulo bias
  }
  while (id.length < 10) { // top up in the vanishingly rare case a byte was rejected
    const extra = new Uint8Array(1);
    crypto.getRandomValues(extra);
    if (extra[0] < 252) id += chars[extra[0] % chars.length];
  }
  return id;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Stats label for a host. Allowlisted hosts keep their hostname; custom-lane hosts
// are users' private self-hosted instances and collapse to 'custom' so /api/stats
// does not enumerate them and attacker-supplied hosts cannot grow the key space
// (INFRA-AUDIT S8).
function hostLabel(hostUrl, isCustom = false) {
  if (isCustom) return 'custom';
  try { return new URL(hostUrl).hostname; } catch { return 'unknown'; }
}

// Telemetry dimension values become KV keys and are published by /api/stats:
// accept a small, lowercase, bounded alphabet only (INFRA-AUDIT S6).
const DIMENSION_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
function cleanDimension(v) {
  return (typeof v === 'string' && DIMENSION_RE.test(v)) ? v : null;
}

const STATS_DAILY_WINDOW_DAYS = 120;
const STATS_CACHE_TTL = 60;

// ── Structured, secret-free logging (INFRA-AUDIT O6) ────────────────────────
// The ONLY console sink in this worker. Fields are a fixed, reviewed set: event
// name, error class, hostname label, HTTP status. Never a URL, path, body, IP,
// header, or paste id — those can carry config passwords or PII.
function logEvent(event, fields = {}) {
  const allowed = ['cls', 'host', 'status', 'scope', 'store', 'attempts'];
  const out = { event, v: WORKER_VERSION };
  for (const k of allowed) if (fields[k] !== undefined) out[k] = fields[k];
  try { console.log(JSON.stringify(out)); } catch { /* never throw from logging */ }
}

// get→modify→put increment with jittered retry (INFRA-AUDIT R6/O1). KV has no
// atomic counter and allows ONE write per second per key; the previous immediate
// retries all landed inside the same second and failed together. Retries are now
// spaced 0.3–2 s (well inside the 30 s waitUntil budget). Genuine concurrent
// get/put collisions still lose updates — analytics-grade — but every exhausted
// retry is now counted in counter_write_err and logged, so under-counting is
// visible instead of silent.
const INCREMENT_DELAYS_MS = [0, 300, 800, 1500];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function increment(kv, key, { delays = INCREMENT_DELAYS_MS } = {}) {
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i] + Math.floor(Math.random() * 200));
    try {
      const raw = await kv.get(key);
      const val = (parseInt(raw, 10) || 0) + 1;
      await kv.put(key, val.toString());
      return val;
    } catch { /* retry */ }
  }
  logEvent('counter_write_err', { attempts: delays.length });
  if (key !== 'counter_write_err') {
    try { const raw = await kv.get('counter_write_err'); await kv.put('counter_write_err', String((parseInt(raw, 10) || 0) + 1)); } catch {}
  }
  return 0;
}

function bgIncrement(ctx, kv, key) {
  ctx.waitUntil(increment(kv, key));
}

function bgIncrementMulti(ctx, kv, keys) {
  ctx.waitUntil(Promise.all(keys.map(k => increment(kv, k))));
}

// ── Upstream circuit breaker (INFRA-AUDIT R3) ───────────────────────────────
// Per-hostname, per-isolate. Transport failures (timeout / network / CF egress
// error page) trip it; upstream 4xx/5xx do not (those are the host answering).
// Open → fast 503 with Retry-After instead of N × 15 s timeouts holding outbound
// connection slots. Half-open lets one probe through after BREAKER_OPEN_MS.
const BREAKER_THRESHOLD = 5;
const BREAKER_OPEN_MS = 30000;
const breakers = new Map(); // hostname -> { failures, openedAt }
const BREAKER_CAP = 500;
function breakerState(host) {
  const b = breakers.get(host);
  if (!b || b.openedAt === 0) return 'closed';
  if (Date.now() - b.openedAt >= BREAKER_OPEN_MS) return 'half-open';
  return 'open';
}
function breakerRecord(host, ok) {
  let b = breakers.get(host);
  if (!b) {
    if (breakers.size >= BREAKER_CAP) breakers.delete(breakers.keys().next().value);
    b = { failures: 0, openedAt: 0 };
    breakers.set(host, b);
  }
  if (ok) { b.failures = 0; b.openedAt = 0; return; }
  b.failures += 1;
  if (b.failures >= BREAKER_THRESHOLD) b.openedAt = Date.now();
}
function _resetBreakers() { breakers.clear(); inflightProbes.clear(); localBuckets.clear(); }

// Cloudflare surfaces DNS/egress failures of a subrequest as an HTTP response
// (e.g. 530 "error code: 1016", 403 "error code: 1002") rather than a thrown
// error, so they were being counted as `status` errors and the CF error page was
// relayed as text/plain. Classify them as transport failures.
function isCfEgressError(status, ct, firstBytes) {
  if (status !== 530 && status !== 502 && status !== 503 && status !== 403 && status !== 520 && status !== 521 && status !== 522 && status !== 523 && status !== 525 && status !== 526) return false;
  if (!/^text\/plain/i.test(ct || '')) return false;
  return /^error code: \d{4}/.test(firstBytes || '');
}

async function listByPrefix(kv, prefix) {
  const result = {};
  let cursor;
  do {
    const list = await kv.list({ prefix, cursor });
    const vals = await Promise.all(list.keys.map(k => kv.get(k.name)));
    list.keys.forEach((key, i) => {
      const label = key.name.slice(prefix.length);
      result[label] = parseInt(vals[i], 10) || 0;
    });
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  return result;
}

// ── Paste store: Durable Object with legacy KV fallback (INFRA-AUDIT R1) ───
//
// KV is eventually consistent: a paste written at the user's colo can 404 for up
// to ~60 s at the colo an AIOStreams host reads from (and the negative lookup is
// cached). A single SQLite-backed Durable Object is strongly consistent, so a
// read anywhere immediately after the write succeeds. One object holds all
// pastes (volume is ~50 writes + ~150 reads/day; a DO handles ~1000 req/s), an
// alarm sweeps expired rows hourly. Available on the Workers Free plan.
//
// The URL contract is unchanged (/t/<id>, same id alphabet, same body). Reads
// fall back to KV for ids written before this deploy; that fallback can be
// removed 30 days after rollout (PASTE_TTL).
export class PasteStore {
  constructor(state) {
    this.state = state;
    this.sql = state.storage.sql;
    this.state.blockConcurrencyWhile(async () => {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS pastes (
        id TEXT PRIMARY KEY,
        body TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )`);
      this.sql.exec('CREATE INDEX IF NOT EXISTS pastes_expires ON pastes(expires_at)');
      const alarm = await this.state.storage.getAlarm();
      if (alarm === null) await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    const id = url.pathname.slice(1);
    if (!/^[a-z0-9]{6,20}$/.test(id)) return new Response('bad id', { status: 400 });
    if (request.method === 'PUT') {
      const body = await request.text();
      if (body.length > PASTE_MAX_SIZE) return new Response('too large', { status: 413 });
      const ttl = parseInt(url.searchParams.get('ttl') || String(PASTE_TTL), 10);
      this.sql.exec('INSERT OR REPLACE INTO pastes (id, body, expires_at) VALUES (?, ?, ?)', id, body, Date.now() + ttl * 1000);
      return new Response(null, { status: 204 });
    }
    if (request.method === 'GET') {
      const row = this.sql.exec('SELECT body, expires_at FROM pastes WHERE id = ?', id).toArray()[0];
      if (!row || row.expires_at <= Date.now()) return new Response(null, { status: 404 });
      return new Response(row.body, { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('method not allowed', { status: 405 });
  }

  async alarm() {
    this.sql.exec('DELETE FROM pastes WHERE expires_at <= ?', Date.now());
    await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
  }
}

function pasteStub(env) {
  if (!env.PASTES || typeof env.PASTES.idFromName !== 'function') return null;
  try { return env.PASTES.get(env.PASTES.idFromName('pastes-v1')); } catch { return null; }
}

// Write: DO first (strongly consistent). If the DO is unbound or fails, KV keeps
// the route alive exactly as before this change (never widen, never break).
async function pasteWrite(env, id, body) {
  const stub = pasteStub(env);
  if (stub) {
    try {
      const r = await stub.fetch(`https://paste-store/${id}`, { method: 'PUT', body });
      if (r.status === 204) return 'do';
    } catch { /* fall through */ }
  }
  if (env.TEMPLATES) {
    await env.TEMPLATES.put(`t:${id}`, body, { expirationTtl: PASTE_TTL });
    return 'kv';
  }
  throw new Error('no paste store');
}

// Read: DO, then legacy KV. Returns { body, store } or null.
async function pasteRead(env, id) {
  const stub = pasteStub(env);
  if (stub) {
    try {
      const r = await stub.fetch(`https://paste-store/${id}`, { method: 'GET' });
      if (r.status === 200) return { body: await r.text(), store: 'do' };
    } catch { /* fall through */ }
  }
  if (env.TEMPLATES) {
    const val = await env.TEMPLATES.get(`t:${id}`);
    if (val) return { body: val, store: 'kv' };
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    // Keep CORS headers request-local. A module-global header object can be
    // overwritten while an earlier async request is awaiting KV/upstream I/O.
    const cors = corsHeaders(request);
    const respond = (status, payload) => json(status, payload, cors);
    // Public read endpoints (paste retrieval + status probes) must be fetchable
    // by ANY origin's web app (public AIOStreams hosts importing a template).
    // The set is deliberately narrow: /t/ carries pasted configs, and
    // /proxy/api/v1/status is public health/version data. Other proxy GETs
    // (e.g. /proxy/stremio/... stream probes whose URLs embed the config
    // password) stay on the strict origin echo — only the configurator's own
    // origins may read those. Computed per request.
    const url = new URL(request.url);
    const isPublicRead = request.method === 'GET' &&
      (url.pathname.startsWith('/t/') || url.pathname === '/proxy/api/v1/status');
    const publicCors = isPublicRead ? corsHeaders(request, true) : null;
    if (request.method === 'OPTIONS') {
      // Preflight must mirror what the actual request would get.
      return new Response(null, { headers: isPublicRead ? publicCors : cors });
    }

    // --- Health: liveness/readiness (no I/O, never rate limited) ---
    if (url.pathname === '/healthz' && request.method === 'GET') {
      const has = (b) => !!(env && env[b]);
      const body = {
        ok: true,
        version: WORKER_VERSION,
        bindings: {
          STATS: has('STATS'), TEMPLATES: has('TEMPLATES'), PASTES: has('PASTES'),
          RATELIMIT: has('RATELIMIT'), RL_PROXY: has('RL_PROXY'), DISCORD_WEBHOOK_URL: has('DISCORD_WEBHOOK_URL'),
        },
        // readiness = the two stores the configurator's flows depend on
        ready: (has('PASTES') || has('TEMPLATES')),
        breakers_open: [...breakers.entries()].filter(([, b]) => b.openedAt && Date.now() - b.openedAt < BREAKER_OPEN_MS).length,
      };
      return respond(body.ready ? 200 : 503, { ...body, headers: NO_STORE });
    }

    // --- Counter: return all stats ---
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const statsIp = getClientIp(request);
      if (!(await rateAllow(env, 'stats', statsIp, STATS_PER_MIN, 60))) {
        if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['rate_limited', 'rl_hit:stats']);
        return respond(429, { error: 'rate limit exceeded' });
      }
      if (!env.STATS) return respond(200, {});
      // ~200 KV ops per build. Workers run BEFORE the CDN cache, so the max-age
      // header alone never cached this; serve from the colo Cache API for 60 s,
      // keyed on the path only so ?cache-busting cannot force a rebuild (R5/O7).
      const statsKey = new URL('/api/stats', url.origin);
      const cached = await statusProbeCacheGet(statsKey);
      if (cached) {
        const body = await cached.text().catch(() => null);
        if (body !== null) {
          return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json', ...SECURE_DOC_HEADERS, ...cors, 'Cache-Control': `public, max-age=${STATS_CACHE_TTL}` } });
        }
      }
      // Every counter the worker writes must appear here or it is write-only.
      // The proxy_err_* class counters are incremented as `proxy_err_${cls}`
      // (underscore) while the per-host ones are `proxy_err:${hostname}` (colon),
      // so the listByPrefix('proxy_err:') scan below does NOT pick them up — they
      // need naming explicitly. Adding a counter without adding it here makes it
      // invisible to /api/stats and to smoke.mjs (the regression test enforces it).
      const keys = ['visits', 'generates', 'proxy_calls', 'proxy_cache_hits', 'proxy_errors',
        'pastes_created', 'pastes_viewed', 'visits_rate_limited', 'visits_write_err',
        'proxy_err_timeout', 'proxy_err_network', 'proxy_err_oversize', 'proxy_err_status',
        'proxy_err_redirect', 'proxy_err_breaker', 'contact_messages', 'counter_write_err',
        'rate_limited', 'pastes_kv_fallback_reads'];
      const vals = await Promise.all(keys.map(k => env.STATS.get(k)));
      const totals = {};
      keys.forEach((k, i) => { totals[k] = parseInt(vals[i], 10) || 0; });

      const [byHost, byHostErrors, byService, byDevice, byResolution, byRateLimit, dailyAll] = await Promise.all([
        listByPrefix(env.STATS, 'proxy:'),
        listByPrefix(env.STATS, 'proxy_err:'),
        listByPrefix(env.STATS, 'gen:service:'),
        listByPrefix(env.STATS, 'gen:device:'),
        listByPrefix(env.STATS, 'gen:res:'),
        listByPrefix(env.STATS, 'rl_hit:'),
        listByPrefix(env.STATS, 'daily:'),
      ]);
      // daily:* grows ~5 keys/day forever; bound the published window (no client
      // reads `daily` — the KV keys stay, only the response is windowed).
      const cutoff = new Date(Date.now() - STATS_DAILY_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
      const daily = {};
      for (const [k, v] of Object.entries(dailyAll)) {
        const day = k.slice(k.lastIndexOf(':') + 1);
        if (day >= cutoff) daily[k] = v;
      }

      const payload = { ...totals, by_host: byHost, by_host_errors: byHostErrors, by_service: byService, by_device: byDevice, by_resolution: byResolution, by_rate_limit: byRateLimit, daily, version: WORKER_VERSION };
      const resp = new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json', ...SECURE_DOC_HEADERS, ...cors, 'Cache-Control': `public, max-age=${STATS_CACHE_TTL}` } });
      statusProbeCachePut(ctx, statsKey, resp, STATS_CACHE_TTL);
      return resp;
    }

    // --- Counter: increment visit ---
    if (url.pathname === '/api/visit' && request.method === 'POST') {
      const visitIp = getClientIp(request);
      if (!(await rateAllow(env, 'visit', visitIp, ANALYTICS_PER_MIN, 60))) {
        // sendBeacon callers cannot read the 429, so a shared-IP clamp-down is
        // invisible — count it so /api/stats shows the clamp instead of looking
        // like a traffic collapse (F10 in AUDIT-CONFIGURATOR-INFRA-2026-08-21).
        if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['visits_rate_limited', `daily:visits_rl:${today()}`, 'rate_limited', 'rl_hit:visit']);
        return respond(429, { error: 'rate limit exceeded' });
      }
      if (env.STATS) {
        const d = today();
        const v = await increment(env.STATS, 'visits', { delays: [0] }); // fast path; the response needs a number now
        // increment() returns 0 only when the KV write failed — count it instead
        // of silently reporting 0 visits, and retry the increment in the background.
        if (v === 0) bgIncrementMulti(ctx, env.STATS, ['visits_write_err', 'visits']);
        bgIncrement(ctx, env.STATS, `daily:visits:${d}`);
        return respond(200, { visits: v });
      }
      return respond(200, { visits: 0 });
    }

    // --- Counter: increment generate ---
    if (url.pathname === '/api/generate' && request.method === 'POST') {
      const genIp = getClientIp(request);
      if (!(await rateAllow(env, 'generate', genIp, ANALYTICS_PER_MIN, 60))) {
        if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['rate_limited', 'rl_hit:generate']);
        return respond(429, { error: 'rate limit exceeded' });
      }
      if (env.STATS) {
        const d = today();
        const v = await increment(env.STATS, 'generates', { delays: [0] });
        if (v === 0) bgIncrement(ctx, env.STATS, 'generates');
        const extra = [`daily:generates:${d}`];

        try {
          const body = await readCapped(request, GENERATE_MAX_SIZE);
          if (body) {
            const data = JSON.parse(body);
            // Dimension values become KV keys and are published verbatim by
            // /api/stats — accept only the bounded lowercase alphabet (S6).
            const service = cleanDimension(data.service);
            const device = cleanDimension(data.device);
            const resolution = cleanDimension(data.resolution);
            if (service) extra.push(`gen:service:${service}`);
            if (device) extra.push(`gen:device:${device}`);
            if (resolution) extra.push(`gen:res:${resolution}`);
          }
        } catch {}

        bgIncrementMulti(ctx, env.STATS, extra);
        return respond(200, { generates: v });
      }
      return respond(200, { generates: 0 });
    }

    // --- Contact: send message to Discord via webhook ---
    if (url.pathname === '/contact' && request.method === 'POST') {
      const webhookUrl = env.DISCORD_WEBHOOK_URL;
      if (!webhookUrl) return respond(500, { error: 'Contact not configured' });

      // Origin check (CSRF protection)
      const reqOrigin = request.headers.get('Origin') || '';
      if (!ALLOWED_ORIGINS.has(reqOrigin)) return respond(403, { error: 'Origin not allowed' });

      // Rate limit check (layered; see rateAllow)
      const contactIp = getClientIp(request) || 'unknown';
      if (!(await rateAllow(env, 'contact', contactIp, CONTACT_PER_HOUR, 3600))) {
        if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['rate_limited', 'rl_hit:contact']);
        return respond(429, { error: 'Rate limit exceeded. Try again later.' });
      }

      let body;
      try {
        const raw = await readCapped(request, CONTACT_MAX_SIZE);
        if (raw === null) return respond(413, { error: 'Payload too large' });
        body = JSON.parse(raw || '');
      } catch { return respond(400, { error: 'Invalid JSON' }); }
      if (!body || typeof body !== 'object') return respond(400, { error: 'Invalid JSON' });

      const { name, email, category, message, setup } = body;
      if (typeof name !== 'string' || name.length < 1 || name.length > 100) return respond(400, { error: 'Name must be 1-100 characters' });
      if (typeof message !== 'string' || !message) return respond(400, { error: 'Message required' });
      if (message.length > 2000) return respond(400, { error: 'Message too long' });
      if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return respond(400, { error: 'Invalid email format' });

      const safe = s => (typeof s === 'string' ? s : '').replace(/[<>]/g, '').slice(0, 2000);
      const catColors = { Bug: 0xf87171, Feature: 0x00d4ff, Question: 0xfbbf24, Feedback: 0x34d399 };
      const safeCat = ['Bug', 'Feature', 'Question', 'Feedback'].includes(category) ? category : 'Feedback';

      const embed = {
        title: `New ${safeCat} message`,
        color: catColors[safeCat] || 0x8b949e,
        fields: [
          { name: 'Name', value: safe(name).slice(0, 100), inline: true },
          { name: 'Category', value: safeCat, inline: true },
          { name: 'Message', value: safe(message) },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Core Builds Contact Widget' },
      };
      if (email) embed.fields.push({ name: 'Email', value: safe(email).slice(0, 200), inline: true });
      if (setup) embed.fields.push({ name: 'Setup', value: safe(setup).slice(0, 500) });

      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'Core Builds Contact',
            avatar_url: 'https://raw.githubusercontent.com/brevityA/Core-Builds/main/Assets/core_icon.svg',
            embeds: [embed],
          }),
          redirect: 'manual',
          signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
        });
        if (res.ok || res.status === 204) {
          if (env.STATS) bgIncrement(ctx, env.STATS, 'contact_messages');
          return respond(200, { ok: true });
        }
        logEvent('contact_upstream_error', { status: res.status });
        return respond(502, { error: 'Discord rejected the message' });
      } catch (e) {
        logEvent('contact_upstream_error', { cls: (e && e.name === 'TimeoutError') ? 'timeout' : 'network' });
        return respond(502, { error: 'Failed to reach Discord' });
      }
    }

    // --- Paste: store template ---
    if (url.pathname === '/paste' && request.method === 'POST') {
      if (!env.TEMPLATES && !pasteStub(env)) return respond(500, { error: 'KV not configured' });
      const pasteIp = getClientIp(request);
      if (!(await rateAllow(env, 'paste', pasteIp, PASTE_CREATE_PER_MIN, 60))) {
        if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['rate_limited', 'rl_hit:paste']);
        return respond(429, { error: 'rate limit exceeded', headers: NO_STORE });
      }
      const body = await readCapped(request, PASTE_MAX_SIZE);
      if (!body) {
        return respond(400, { error: body === null ? 'too large' : 'empty body' });
      }
      let parsed;
      try { parsed = JSON.parse(body); } catch { return respond(400, { error: 'invalid JSON' }); }
      // Accept only the two public Core Builds export shapes so this cannot become a
      // generic anonymous JSON store: AIOStreams templates and Nuvio badge packs.
      if (!supportedPasteShape(parsed)) {
        return respond(400, { error: 'expected a Core Builds template or badge pack' });
      }
      const id = randomId();
      let store;
      try { store = await pasteWrite(env, id, body); } catch { return respond(500, { error: 'paste store unavailable' }); }
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['pastes_created', `daily:pastes:${today()}`]);
      if (store === 'kv' && pasteStub(env)) logEvent('paste_do_write_failed', { store });
      const pasteUrl = `${url.origin}/t/${id}`;
      return respond(200, { url: pasteUrl, headers: NO_STORE });
    }

    // --- Paste: retrieve template ---
    if (url.pathname.startsWith('/t/') && request.method === 'GET') {
      if (!env.TEMPLATES && !pasteStub(env)) return respond(500, { error: 'KV not configured' });
      const id = url.pathname.slice(3);
      if (!/^[a-z0-9]{6,20}$/.test(id)) return respond(400, { error: 'invalid id' });
      const readIp = getClientIp(request);
      if (!(await rateAllow(env, 'paste_read', readIp, PASTE_READ_PER_MIN, 60))) {
        if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['rate_limited', 'rl_hit:paste_read']);
        return respond(429, { error: 'rate limit exceeded', headers: NO_STORE });
      }
      const found = await pasteRead(env, id);
      if (!found) return respond(404, { error: 'not found or expired' });
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, found.store === 'kv' ? ['pastes_viewed', 'pastes_kv_fallback_reads'] : ['pastes_viewed']);
      // no-store: pastes can carry a user's config — never let a shared CDN cache them.
      return new Response(found.body, {
        headers: { 'Content-Type': 'application/json', ...SECURE_DOC_HEADERS, ...publicCors, ...NO_STORE },
      });
    }

    // --- Proxy: forward to AIOStreams ---
    if (!url.pathname.startsWith('/proxy')) {
      return respond(404, { error: 'not found' });
    }

    const upstreamPath = url.pathname.slice('/proxy'.length);
    // Path guard: require a non-empty upstream path of safe characters. NOTE on traversal:
    // the WHATWG URL parser collapses any "/.." *before* this handler runs, so the value
    // here is always a clean absolute path — the host allowlist above is the real SSRF
    // control. This guard mainly rejects an empty path ("/proxy" with nothing after it).
    if (!upstreamPath || upstreamPath.includes('..') || !PROXY_PATH_RE.test(upstreamPath)) {
      return respond(403, { error: 'path not allowed' });
    }
    if (!ALLOWED_METHODS.has(request.method)) {
      return respond(405, { error: 'method not allowed' });
    }

    const host = url.searchParams.get('host');
    // Allowlisted hosts keep the full lane; anything else must pass the scoped
    // custom-host gate (AIOStreams config paths only, https, origin-only).
    const customHost = ALLOWED_HOSTS.has(host) ? null : customHostScope(host, request.method, upstreamPath);
    if (!host || (!ALLOWED_HOSTS.has(host) && !customHost)) {
      return respond(403, { error: 'host not allowed' });
    }

    // Narrowed hosts get one door, not the whole building. See HOST_SCOPES.
    // Custom hosts get the same treatment with an even smaller door.
    const hostScope = customHost || HOST_SCOPES.get(host);
    if (hostScope) {
      if (hostScope.custom) {
        // customHostScope already validated path+method; stripAuth is implied.
      } else {
        if (!hostScope.methods.has(request.method)) {
          return respond(405, { error: 'method not allowed for this host' });
        }
        if (!hostScope.paths.has(upstreamPath)) {
          return respond(403, { error: 'path not allowed for this host' });
        }
      }
    }

    const hostname = hostLabel(host, !!customHost);
    const breakerKey = customHost ? (() => { try { return new URL(host).hostname; } catch { return 'custom'; } })() : hostname;

    // Status probes are public health/version data: 30s of staleness is fine for
    // host picking. Workers sit IN FRONT of the CDN edge cache, so an s-maxage
    // header alone never caches anything — the Cache API (colo-local) is the
    // mechanism. Serving repeated probes from the colo cache skips the upstream
    // fetch and the rate-limit burn on every page load.
    const isStatusProbe = request.method === 'GET' && upstreamPath === '/api/v1/status';
    if (isStatusProbe) {
      const cached = await statusProbeCacheGet(url);
      if (cached) {
        const body = await cached.text().catch(() => null);
        if (body !== null) {
          // Cache hits skip the upstream fetch AND the rate-limit bucket, so
          // they also skip proxy_calls/proxy:host counting — count them in a
          // dedicated bucket so /api/stats stays interpretable.
          if (env.STATS) bgIncrement(ctx, env.STATS, 'proxy_cache_hits');
          return new Response(body, {
            status: 200,
            headers: {
              ...SECURE_DOC_HEADERS,
              'Content-Type': cached.headers.get('Content-Type') || 'application/json',
              ...(publicCors || cors),
              ...STATUS_PROBE_CACHE_HEADER,
            },
          });
        }
      }
    }

    // Per-IP rate limit on the proxy (open relays to allowed hosts are an
    // amplification risk; the un-allowlisted custom lane is tighter).
    // CONTRACT: a 429 must only ever be emitted BEFORE the upstream call — the
    // configurator's writeHostFetch treats 429 as "not forwarded" and retries
    // directly, so a post-forward 429 would duplicate a config write.
    const proxyIp = getClientIp(request);
    const proxyBucket = customHost ? 'proxy_custom' : 'proxy';
    const proxyMax = customHost ? CUSTOM_HOST_PER_MIN : ANALYTICS_PER_MIN * 2;
    if (!(await rateAllow(env, proxyBucket, proxyIp, proxyMax, 60))) {
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['rate_limited', `rl_hit:${proxyBucket}`]);
      return respond(429, { error: 'rate limit exceeded', headers: NO_STORE });
    }

    // Circuit breaker: a host that has failed at the transport layer 5× in a row
    // gets a fast 503 for 30 s instead of every caller waiting out the timeout.
    // 503 (not 429) so writeHostFetch does NOT treat it as "safe to retry direct"
    // — we genuinely do not know the host's state.
    const bstate = breakerState(breakerKey);
    if (bstate === 'open') {
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['proxy_errors', `proxy_err:${hostname}`, 'proxy_err_breaker']);
      return respond(503, { error: 'upstream temporarily unavailable', headers: { ...NO_STORE, 'Retry-After': '30' } });
    }

    const upstreamSearch = url.searchParams.toString();
    const upstreamUrl = new URL(host + upstreamPath);
    if (upstreamSearch) {
      const cleanedSearch = upstreamSearch.replace(/(^|&)host=[^&]*/g, '').replace(/^&+|&+$/g, '');
      if (cleanedSearch) upstreamUrl.search = cleanedSearch;
    }

    // Capped request body (GET has none). 413 on overflow rather than buffering unbounded.
    let reqBody = undefined;
    if (request.method !== 'GET') {
      reqBody = await readCapped(request, PROXY_MAX_SIZE);
      if (reqBody === null) return respond(413, { error: 'request too large' });
    }

    const fwdHeaders = { 'Content-Type': request.headers.get('Content-Type') || 'application/json' };
    const auth = request.headers.get('Authorization');
    // Forward-pass only when the caller set it AND the host is on the explicit
    // AUTH_FORWARD_HOSTS list (WuPlay device tokens). Never to a narrowed host,
    // never to the custom lane, never to an AIOStreams host (none of the
    // configurator surfaces send one there). Drop it otherwise.
    if (auth && !hostScope?.stripAuth && AUTH_FORWARD_HOSTS.has(host)) fwdHeaders['Authorization'] = auth;

    // Redirects are refused (INFRA-AUDIT S2). customHostScope validates the FIRST
    // hop only; following a 3xx would let any custom host (or a lapsed allowlisted
    // domain) bounce the worker — with the caller's method and body — to an
    // arbitrary public URL and return the response cross-origin.
    const doFetch = async () => {
      const upstreamReq = new Request(upstreamUrl, {
        method: request.method,
        headers: fwdHeaders,
        body: reqBody,
        redirect: 'manual',
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      let upstreamRes;
      try {
        upstreamRes = await fetch(upstreamReq);
      } catch (e) {
        // AbortSignal.timeout rejects with TimeoutError; anything else is a
        // network/DNS failure. Separate buckets so the operator can tell "slow
        // host" from "dead host" without digging through upstream logs.
        const cls = (e && e.name === 'TimeoutError') ? 'timeout' : 'network';
        return { error: cls };
      }
      const status = upstreamRes.status;
      if (status >= 300 && status < 400) {
        try { await upstreamRes.body?.cancel(); } catch {}
        return { error: 'redirect', status };
      }
      const ct = upstreamRes.headers.get('Content-Type') || 'application/json';
      const buf = await readResponseCapped(upstreamRes, PROXY_RESP_MAX_SIZE);
      if (buf === null) return { error: 'oversize', status };
      // Cloudflare egress/DNS failures arrive as tiny text/plain "error code: NNNN"
      // responses (530/1016, 403/1002 …) — a transport failure, not the host answering.
      if (buf.byteLength < 64 && isCfEgressError(status, ct, new TextDecoder().decode(buf.slice(0, 32)))) {
        return { error: 'network', status };
      }
      return { status, ct, buf };
    };

    const result = isStatusProbe ? await singleFlight(url.toString(), doFetch) : await doFetch();

    if (result.error) {
      const cls = result.error;
      const transport = cls === 'timeout' || cls === 'network';
      if (transport) breakerRecord(breakerKey, false);
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['proxy_errors', `proxy_err:${hostname}`, `proxy_err_${cls}`]);
      logEvent('proxy_upstream_error', { cls, host: hostname, status: result.status });
      const msg = cls === 'redirect' ? 'upstream redirect refused'
        : cls === 'oversize' ? 'upstream response too large'
        : 'upstream unreachable';
      return respond(502, { error: msg, headers: NO_STORE });
    }
    breakerRecord(breakerKey, true);

    if (env.STATS) {
      const d = today();
      bgIncrementMulti(ctx, env.STATS, [
        'proxy_calls',
        `proxy:${hostname}`,
        `daily:proxy:${d}`,
      ]);
      if (result.status >= 400) {
        bgIncrementMulti(ctx, env.STATS, ['proxy_errors', `proxy_err:${hostname}`, 'proxy_err_status']);
      }
    }

    const resp = new Response(result.buf.slice(0), {
      status: result.status,
      headers: {
        ...SECURE_DOC_HEADERS,
        'Content-Type': result.ct,
        ...(publicCors || cors),
        ...(isStatusProbe ? STATUS_PROBE_CACHE_HEADER : NO_STORE),
      },
    });
    // Only cache successful status probes; failures keep flowing through (and
    // are counted) so a broken host is never masked by a stale 200.
    if (isStatusProbe && resp.status === 200) statusProbeCachePut(ctx, url, resp);
    return resp;
  },
  // Test/introspection hooks. Non-handler module exports are rejected by workerd,
  // so they hang off the default export instead.
  WORKER_VERSION,
  _resetBreakers,
};
