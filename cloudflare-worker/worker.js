// Core Builds — CORS proxy + template paste for the configurator.
//
// /proxy/* — re-issues AIOStreams API requests server-to-server to bypass CORS.
// /paste   — stores a template JSON in KV and returns a URL that serves it back.
//            Templates expire after 30 days. Nothing is logged or inspected.

const ALLOWED_HOSTS = new Set([
  'https://aiostreams.elfhosted.com',
  'https://aiostreams.fortheweak.cloud',
  'https://aiostreamsfortheweebsstable.midnightignite.me',
  'https://aiostreams.viren070.me',
  'https://aiostreams.stremio.ru',
  'https://aio.atbphosting.com',
  'https://aiostreams.12312023.xyz',
]);

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const PASTE_TTL = 30 * 24 * 60 * 60; // 30 days
const PASTE_MAX_SIZE = 512 * 1024; // 512 KB

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

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
      return new Response(val, {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
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

    let upstreamRes;
    try {
      upstreamRes = await fetch(upstreamReq);
    } catch (e) {
      return json(502, { error: 'upstream unreachable' });
    }

    const resBody = await upstreamRes.text();
    return new Response(resBody, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json',
        ...CORS_HEADERS,
      },
    });
  },
};
