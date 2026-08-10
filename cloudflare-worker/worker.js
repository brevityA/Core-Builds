// Core Builds — CORS proxy + template paste + usage analytics for the configurator.
//
// /proxy/*       — re-issues AIOStreams API requests server-to-server to bypass CORS.
// /paste         — stores a template JSON in KV and returns a URL that serves it back.
//                  Templates expire after 30 days. Nothing is logged or inspected.
// /api/stats     — returns all usage counters (totals + breakdowns).
// /api/visit     — increments configurator visit counter.
// /api/generate  — increments template generation counter (accepts service/device/resolution).
//
// Proxy calls, paste creates, and paste views are counted automatically.
// Per-host proxy counts, per-service generates, and daily counters are tracked.

// ── Hardening constants ─────────────────────────────────────────────────────
// Edge-wide rate limits (KV-backed; see rateAllow). The legacy in-memory map was
// per-isolate and reset on every cold start, so it did nothing at the edge.
const PROXY_MAX_SIZE = 2 * 1024 * 1024;     // 2 MB proxy request body cap (configs are a few KB)
const PROXY_RESP_MAX_SIZE = 8 * 1024 * 1024; // 8 MB proxy response cap
const PROXY_TIMEOUT_MS = 15000;              // upstream fetch timeout
const PROXY_PATH_RE = /^\/[A-Za-z0-9_\-./%]*$/; // upstream path allowlist (no traversal)
const PASTE_CREATE_PER_MIN = 10;
const PASTE_READ_PER_MIN = 60;
const CONTACT_PER_HOUR = 5;
const ANALYTICS_PER_MIN = 30;
const STATS_PER_MIN = 20;

// Client IP from Cloudflare's header. Returns '' when absent (direct calls / tests),
// in which case rate limiting is skipped — you cannot fairly bucket an unknown client,
// and Cloudflare always sets this header for real edge traffic.
function getClientIp(request) {
  return request.headers.get('cf-connecting-ip') || '';
}

// Token-bucket-ish rate limit stored in KV (the RATELIMIT namespace). Degrades to
// "allow" when the namespace is unbound or on any error, so a KV blip never 503s the
// proxy/paste/contact paths. Window is a fixed 60s (or 3600s) bucket derived from now.
async function rateAllow(kv, scope, ip, max, windowSec) {
  if (!kv || !ip) return true;
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const key = `rl:${scope}:${ip}:${bucket}`;
  try {
    const raw = await kv.get(key);
    const count = parseInt(raw, 10) || 0;
    if (count >= max) return false;
    await kv.put(key, String(count + 1), { expirationTtl: windowSec + 60 });
    return true;
  } catch {
    return true;
  }
}

// Read a request body as text with a hard byte cap (returns null on overflow/empty-GET).
async function readCapped(request, max) {
  const len = parseInt(request.headers.get('content-length') || '0', 10);
  if (len > max) return null;
  const buf = await request.arrayBuffer();
  if (buf.byteLength > max) return null;
  return new TextDecoder().decode(buf);
}

// Read an upstream response body as text with a hard byte cap (null on overflow).
async function readResponseCapped(response, max) {
  const len = parseInt(response.headers.get('content-length') || '0', 10);
  if (len > max) return null;
  const buf = await response.arrayBuffer();
  if (buf.byteLength > max) return null;
  return new TextDecoder().decode(buf);
}

const NO_STORE = { 'Cache-Control': 'no-store' };

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
]);

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH']);

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
  // Public read endpoints (paste retrieval /t/, proxy GETs) are fetched by
  // OTHER origins' web apps (any public AIOStreams host importing a template).
  // Echoing only allowlisted origins breaks that (browser CORS rejects when the
  // echoed origin != the requesting origin -> "Load failed" on import). For
  // these, allow any origin. Mutating/private endpoints keep the strict echo.
  let allowed;
  if (publicRead) allowed = '*';
  else allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://brevitya.github.io';
  return {
    'Access-Control-Allow-Origin': allowed,
    ...(publicRead ? {} : {}),
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

const PASTE_TTL = 30 * 24 * 60 * 60; // 30 days
const PASTE_MAX_SIZE = 512 * 1024; // 512 KB

const SECURE_DOC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
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

function hostLabel(hostUrl) {
  try { return new URL(hostUrl).hostname; } catch { return 'unknown'; }
}

// get→modify→put increment with bounded retry on TRANSIENT write failures only.
// KV has no atomic counter, so genuine concurrent-increment collisions cannot be
// eliminated without an external primitive; this at least retries on network/timeout
// errors instead of silently dropping the write. Analytics tolerance makes the
// residual lost-update rate acceptable.
async function increment(kv, key) {
  const MAX_TRIES = 4;
  for (let i = 0; i < MAX_TRIES; i++) {
    try {
      const raw = await kv.get(key);
      const val = (parseInt(raw, 10) || 0) + 1;
      await kv.put(key, val.toString());
      return val;
    } catch {
      if (i === MAX_TRIES - 1) break;
    }
  }
  // last-resort non-throwing attempt so the caller always gets a number
  try {
    const raw = await kv.get(key);
    const val = (parseInt(raw, 10) || 0) + 1;
    await kv.put(key, val.toString());
    return val;
  } catch {
    return 0;
  }
}

function bgIncrement(ctx, kv, key) {
  ctx.waitUntil(increment(kv, key));
}

function bgIncrementMulti(ctx, kv, keys) {
  ctx.waitUntil(Promise.all(keys.map(k => increment(kv, k))));
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

export default {
  async fetch(request, env, ctx) {
    // Keep CORS headers request-local. A module-global header object can be
    // overwritten while an earlier async request is awaiting KV/upstream I/O.
    const cors = corsHeaders(request);
    const respond = (status, payload) => json(status, payload, cors);
    // Public read endpoints (paste retrieval + proxy GETs) must be fetchable by
    // ANY origin's web app (public AIOStreams hosts importing a template), so
    // they get Access-Control-Allow-Origin: *. Computed per request.
    const url = new URL(request.url);
    const isPublicRead = request.method === 'GET' &&
      (url.pathname.startsWith('/t/') || url.pathname.startsWith('/proxy'));
    const publicCors = isPublicRead ? corsHeaders(request, true) : null;
    const respondPublic = (status, payload, hdrs = {}) =>
      json(status, payload, publicCors || cors, hdrs);
    if (request.method === 'OPTIONS') {
      // Preflight must mirror what the actual request would get.
      return new Response(null, { headers: isPublicRead ? publicCors : cors });
    }

    // --- Counter: return all stats ---
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const statsIp = getClientIp(request);
      if (!(await rateAllow(env.RATELIMIT, 'stats', statsIp, STATS_PER_MIN, 60))) {
        return respond(429, { error: 'rate limit exceeded' });
      }
      if (!env.STATS) return respond(200, {});
      const keys = ['visits', 'generates', 'proxy_calls', 'proxy_errors', 'pastes_created', 'pastes_viewed'];
      const vals = await Promise.all(keys.map(k => env.STATS.get(k)));
      const totals = {};
      keys.forEach((k, i) => { totals[k] = parseInt(vals[i], 10) || 0; });

      const [byHost, byHostErrors, byService, byDevice, byResolution, daily] = await Promise.all([
        listByPrefix(env.STATS, 'proxy:'),
        listByPrefix(env.STATS, 'proxy_err:'),
        listByPrefix(env.STATS, 'gen:service:'),
        listByPrefix(env.STATS, 'gen:device:'),
        listByPrefix(env.STATS, 'gen:res:'),
        listByPrefix(env.STATS, 'daily:'),
      ]);

      return respond(200, { ...totals, by_host: byHost, by_host_errors: byHostErrors, by_service: byService, by_device: byDevice, by_resolution: byResolution, daily, headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    // --- Counter: increment visit ---
    if (url.pathname === '/api/visit' && request.method === 'POST') {
      const visitIp = getClientIp(request);
      if (!(await rateAllow(env.RATELIMIT, 'visit', visitIp, ANALYTICS_PER_MIN, 60))) {
        return respond(429, { error: 'rate limit exceeded' });
      }
      if (env.STATS) {
        const d = today();
        const v = await increment(env.STATS, 'visits');
        bgIncrement(ctx, env.STATS, `daily:visits:${d}`);
        return respond(200, { visits: v });
      }
      return respond(200, { visits: 0 });
    }

    // --- Counter: increment generate ---
    if (url.pathname === '/api/generate' && request.method === 'POST') {
      const genIp = getClientIp(request);
      if (!(await rateAllow(env.RATELIMIT, 'generate', genIp, ANALYTICS_PER_MIN, 60))) {
        return respond(429, { error: 'rate limit exceeded' });
      }
      if (env.STATS) {
        const d = today();
        const v = await increment(env.STATS, 'generates');
        const extra = [`daily:generates:${d}`];

        try {
          const body = await readCapped(request, 64 * 1024); // telemetry payloads are tiny
          if (body) {
            const data = JSON.parse(body);
            if (data.service) extra.push(`gen:service:${data.service}`);
            if (data.device) extra.push(`gen:device:${data.device}`);
            if (data.resolution) extra.push(`gen:res:${data.resolution}`);
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

      // Rate limit check (edge-wide via KV; in-memory map was per-isolate and useless at the edge)
      const contactIp = getClientIp(request) || 'unknown';
      if (!(await rateAllow(env.RATELIMIT, 'contact', contactIp, CONTACT_PER_HOUR, 3600))) {
        return respond(429, { error: 'Rate limit exceeded. Try again later.' });
      }

      let body;
      try { body = await request.json(); } catch { return respond(400, { error: 'Invalid JSON' }); }

      const { name, email, category, message, setup } = body;
      if (!name || name.length < 1 || name.length > 100) return respond(400, { error: 'Name must be 1-100 characters' });
      if (!message) return respond(400, { error: 'Message required' });
      if (message.length > 2000) return respond(400, { error: 'Message too long' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond(400, { error: 'Invalid email format' });

      const safe = s => (s || '').replace(/[<>]/g, '').slice(0, 2000);
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
        });
        if (res.ok || res.status === 204) {
          if (env.STATS) bgIncrement(ctx, env.STATS, 'contact_messages');
          return respond(200, { ok: true });
        }
        return respond(502, { error: 'Discord rejected the message' });
      } catch (e) {
        return respond(502, { error: 'Failed to reach Discord' });
      }
    }

    // --- Paste: store template ---
    if (url.pathname === '/paste' && request.method === 'POST') {
      if (!env.TEMPLATES) return respond(500, { error: 'KV not configured' });
      const pasteIp = getClientIp(request);
      if (!(await rateAllow(env.RATELIMIT, 'paste', pasteIp, PASTE_CREATE_PER_MIN, 60))) {
        return respond(429, { error: 'rate limit exceeded', headers: NO_STORE });
      }
      const body = await readCapped(request, PASTE_MAX_SIZE);
      if (!body) {
        return respond(400, { error: body === null ? 'too large' : 'empty body' });
      }
      let parsed;
      try { parsed = JSON.parse(body); } catch { return respond(400, { error: 'invalid JSON' }); }
      // Only accept template-shaped objects so the KV store isn't used as a generic dump.
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return respond(400, { error: 'expected a JSON object' });
      }
      const id = randomId();
      await env.TEMPLATES.put(`t:${id}`, body, { expirationTtl: PASTE_TTL });
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['pastes_created', `daily:pastes:${today()}`]);
      const pasteUrl = `${url.origin}/t/${id}`;
      return respond(200, { url: pasteUrl, headers: NO_STORE });
    }

    // --- Paste: retrieve template ---
    if (url.pathname.startsWith('/t/') && request.method === 'GET') {
      if (!env.TEMPLATES) return respond(500, { error: 'KV not configured' });
      const id = url.pathname.slice(3);
      if (!/^[a-z0-9]{6,20}$/.test(id)) return respond(400, { error: 'invalid id' });
      const readIp = getClientIp(request);
      if (!(await rateAllow(env.RATELIMIT, 'paste_read', readIp, PASTE_READ_PER_MIN, 60))) {
        return respond(429, { error: 'rate limit exceeded', headers: NO_STORE });
      }
      const val = await env.TEMPLATES.get(`t:${id}`);
      if (!val) return respond(404, { error: 'not found or expired' });
      if (env.STATS) bgIncrement(ctx, env.STATS, 'pastes_viewed');
      // no-store: pastes can carry a user's config — never let a shared CDN cache them.
      return new Response(val, {
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
    if (!host || !ALLOWED_HOSTS.has(host)) {
      return respond(403, { error: 'host not allowed' });
    }

    // Per-IP rate limit on the proxy (open relays to allowed hosts are an amplification risk).
    const proxyIp = getClientIp(request);
    if (!(await rateAllow(env.RATELIMIT, 'proxy', proxyIp, ANALYTICS_PER_MIN * 2, 60))) {
      return respond(429, { error: 'rate limit exceeded', headers: NO_STORE });
    }

    const upstreamSearch = url.searchParams.toString();
    const upstreamUrl = new URL(host + upstreamPath);
    if (upstreamSearch) {
      const cleanedSearch = upstreamSearch.replace(/(^|&)host=[^&]*/, '').replace(/^&+|&+$/g, '');
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
    if (auth) fwdHeaders['Authorization'] = auth;   // forward-pass only when caller set it (WuPlay device tokens)
    const upstreamReq = new Request(upstreamUrl, {
      method: request.method,
      headers: fwdHeaders,
      body: reqBody,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });

    const hostname = hostLabel(host);

    let upstreamRes;
    try {
      upstreamRes = await fetch(upstreamReq);
    } catch (e) {
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['proxy_errors', `proxy_err:${hostname}`]);
      return respond(502, { error: 'upstream unreachable' });
    }

    if (env.STATS) {
      const d = today();
      bgIncrementMulti(ctx, env.STATS, [
        'proxy_calls',
        `proxy:${hostname}`,
        `daily:proxy:${d}`,
      ]);
      if (upstreamRes.status >= 400) {
        bgIncrementMulti(ctx, env.STATS, ['proxy_errors', `proxy_err:${hostname}`]);
      }
    }

    // Capped response body — protects the worker from an oversized/malicious upstream.
    const resBody = await readResponseCapped(upstreamRes, PROXY_RESP_MAX_SIZE);
    if (resBody === null) {
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['proxy_errors', `proxy_err:${hostname}`]);
      return respond(502, { error: 'upstream response too large' });
    }
    return new Response(resBody, {
      status: upstreamRes.status,
      headers: {
        ...SECURE_DOC_HEADERS,
        'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json',
        ...(publicCors || cors),
        ...NO_STORE,
      },
    });
  },
};
