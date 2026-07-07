// Core Builds — CORS proxy for the configurator's "Create & Install" flow.
//
// Most public AIOStreams instances don't send Access-Control-Allow-Origin, so a
// browser POST/PATCH to their /api/v1/user endpoint fails before the configurator
// ever sees a response. This Worker re-issues that same request server-to-server
// (no CORS restriction applies there) and hands the result back with permissive
// CORS headers, so the browser's Promise.any() race can pick it up.
//
// Nothing is logged, stored, or inspected — the request body (which may contain
// the user's debrid credentials) is streamed through unchanged to the upstream host.

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

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
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

    const body = await upstreamRes.text();
    return new Response(body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json',
        ...CORS_HEADERS,
      },
    });
  },
};
