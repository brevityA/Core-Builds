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

// ── Rate limiting for contact endpoint ──
const RATE_LIMIT = new Map(); // ip -> { count, resetAt }
const RATE_MAX = 5;
const RATE_WINDOW = 3600000; // 1 hour

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
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
]);

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH']);

const ALLOWED_ORIGINS = new Set([
  'https://brevitya.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500',
]);

function corsHeaders(request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://brevitya.github.io';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

const PASTE_TTL = 30 * 24 * 60 * 60; // 30 days
const PASTE_MAX_SIZE = 512 * 1024; // 512 KB

let _cors = {};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ..._cors },
  });
}

function randomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  for (const b of bytes) id += chars[b % chars.length];
  return id;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function hostLabel(hostUrl) {
  try { return new URL(hostUrl).hostname; } catch { return 'unknown'; }
}

async function increment(kv, key) {
  const raw = await kv.get(key);
  const val = (parseInt(raw, 10) || 0) + 1;
  await kv.put(key, val.toString());
  return val;
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
    _cors = corsHeaders(request);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: _cors });
    }

    const url = new URL(request.url);

    // --- Counter: return all stats ---
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      if (!env.STATS) return json(200, {});
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

      return json(200, { ...totals, by_host: byHost, by_host_errors: byHostErrors, by_service: byService, by_device: byDevice, by_resolution: byResolution, daily });
    }

    // --- Counter: increment visit ---
    if (url.pathname === '/api/visit' && request.method === 'POST') {
      if (env.STATS) {
        const d = today();
        const v = await increment(env.STATS, 'visits');
        bgIncrement(ctx, env.STATS, `daily:visits:${d}`);
        return json(200, { visits: v });
      }
      return json(200, { visits: 0 });
    }

    // --- Counter: increment generate ---
    if (url.pathname === '/api/generate' && request.method === 'POST') {
      if (env.STATS) {
        const d = today();
        const v = await increment(env.STATS, 'generates');
        const extra = [`daily:generates:${d}`];

        try {
          const body = await request.text();
          if (body) {
            const data = JSON.parse(body);
            if (data.service) extra.push(`gen:service:${data.service}`);
            if (data.device) extra.push(`gen:device:${data.device}`);
            if (data.resolution) extra.push(`gen:res:${data.resolution}`);
          }
        } catch {}

        bgIncrementMulti(ctx, env.STATS, extra);
        return json(200, { generates: v });
      }
      return json(200, { generates: 0 });
    }

    // --- Contact: send message to Discord via webhook ---
    if (url.pathname === '/contact' && request.method === 'POST') {
      const webhookUrl = env.DISCORD_WEBHOOK_URL;
      if (!webhookUrl) return json(500, { error: 'Contact not configured' });

      // Origin check (CSRF protection)
      const reqOrigin = request.headers.get('Origin') || '';
      if (!ALLOWED_ORIGINS.has(reqOrigin)) return json(403, { error: 'Origin not allowed' });

      // Rate limit check
      const contactIp = request.headers.get('cf-connecting-ip') || 'unknown';
      if (!checkRateLimit(contactIp)) return json(429, { error: 'Rate limit exceeded. Try again later.' });

      let body;
      try { body = await request.json(); } catch { return json(400, { error: 'Invalid JSON' }); }

      const { name, email, category, message, setup } = body;
      if (!name || name.length < 1 || name.length > 100) return json(400, { error: 'Name must be 1-100 characters' });
      if (!message) return json(400, { error: 'Message required' });
      if (message.length > 2000) return json(400, { error: 'Message too long' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Invalid email format' });

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
          return json(200, { ok: true });
        }
        return json(502, { error: 'Discord rejected the message' });
      } catch (e) {
        return json(502, { error: 'Failed to reach Discord' });
      }
    }

    // --- Paste: store template ---
    if (url.pathname === '/paste' && request.method === 'POST') {
      if (!env.TEMPLATES) return json(500, { error: 'KV not configured' });
      const body = await request.text();
      if (!body || body.length > PASTE_MAX_SIZE) {
        return json(400, { error: body ? 'too large' : 'empty body' });
      }
      try { JSON.parse(body); } catch { return json(400, { error: 'invalid JSON' }); }
      const id = randomId();
      await env.TEMPLATES.put(`t:${id}`, body, { expirationTtl: PASTE_TTL });
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['pastes_created', `daily:pastes:${today()}`]);
      const pasteUrl = `${url.origin}/t/${id}`;
      return json(200, { url: pasteUrl });
    }

    // --- Paste: retrieve template ---
    if (url.pathname.startsWith('/t/') && request.method === 'GET') {
      if (!env.TEMPLATES) return json(500, { error: 'KV not configured' });
      const id = url.pathname.slice(3);
      if (!/^[a-z0-9]{6,20}$/.test(id)) return json(400, { error: 'invalid id' });
      const val = await env.TEMPLATES.get(`t:${id}`);
      if (!val) return json(404, { error: 'not found or expired' });
      if (env.STATS) bgIncrement(ctx, env.STATS, 'pastes_viewed');
      return new Response(val, {
        headers: { 'Content-Type': 'application/json', ..._cors },
      });
    }

    // --- Proxy: forward to AIOStreams ---
    if (!url.pathname.startsWith('/proxy/')) {
      return json(404, { error: 'not found' });
    }
    if (!ALLOWED_METHODS.has(request.method)) {
      return json(405, { error: 'method not allowed' });
    }

    const host = url.searchParams.get('host');
    if (!host || !ALLOWED_HOSTS.has(host)) {
      return json(403, { error: 'host not allowed' });
    }

    const upstreamPath = url.pathname.slice('/proxy'.length);
    const upstreamSearch = url.searchParams.toString();
    const upstreamUrl = new URL(host + upstreamPath);
    if (upstreamSearch) {
      const cleanedSearch = upstreamSearch.replace(/(^|&)host=[^&]*/, '').replace(/^&+|&+$/g, '');
      if (cleanedSearch) upstreamUrl.search = cleanedSearch;
    }

    const upstreamReq = new Request(upstreamUrl, {
      method: request.method,
      headers: { 'Content-Type': request.headers.get('Content-Type') || 'application/json' },
      body: request.method === 'GET' ? undefined : await request.text(),
    });

    const hostname = hostLabel(host);

    let upstreamRes;
    try {
      upstreamRes = await fetch(upstreamReq);
    } catch (e) {
      if (env.STATS) bgIncrementMulti(ctx, env.STATS, ['proxy_errors', `proxy_err:${hostname}`]);
      return json(502, { error: 'upstream unreachable' });
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

    const resBody = await upstreamRes.text();
    return new Response(resBody, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json',
        ..._cors,
      },
    });
  },
};
