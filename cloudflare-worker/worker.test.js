const test = require('node:test');
const assert = require('node:assert/strict');
const workerModule = require('./worker.js');

const worker = workerModule.default;

function makeEnv(kvStore = {}) {
  return {
    TEMPLATES: {
      put: async (key, val, opts) => { kvStore[key] = val; },
      get: async (key) => kvStore[key] || null,
    },
  };
}

test('forwards non-host query parameters to the upstream host', async () => {
  let upstreamUrl;
  let upstreamMethod;

  global.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    upstreamUrl = request.url;
    upstreamMethod = request.method;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const request = new Request('https://example.com/proxy/api/v1/status?host=https%3A%2F%2Faiostreams.elfhosted.com&foo=bar', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const response = await worker.fetch(request, {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true });
  assert.equal(upstreamUrl, 'https://aiostreams.elfhosted.com/api/v1/status?foo=bar');
  assert.equal(upstreamMethod, 'GET');
});

test('paste: stores and retrieves template JSON', async () => {
  const kvStore = {};
  const env = makeEnv(kvStore);
  const tmpl = JSON.stringify({ config: { test: true } });

  const postReq = new Request('https://example.com/paste', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: tmpl,
  });
  const postRes = await worker.fetch(postReq, env);
  assert.equal(postRes.status, 200);
  const { url } = await postRes.json();
  assert.ok(url.startsWith('https://example.com/t/'));

  const id = url.split('/t/')[1];
  const getReq = new Request(`https://example.com/t/${id}`, { method: 'GET' });
  const getRes = await worker.fetch(getReq, env);
  assert.equal(getRes.status, 200);
  const retrieved = await getRes.text();
  assert.equal(retrieved, tmpl);
});

test('paste: accepts and retrieves a Nuvio badge pack', async () => {
  const env = makeEnv();
  const pack = JSON.stringify({
    groups: [{ id: 'resolution', name: 'Resolution' }],
    filters: [{ id: 'res-4k', groupId: 'resolution', name: '4K', pattern: '(?i)4k', imageURL: 'https://example.com/4k.svg' }],
  });
  const post = new Request('https://example.com/paste', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: pack,
  });
  const posted = await worker.fetch(post, env);
  assert.equal(posted.status, 200);
  const { url } = await posted.json();
  const fetched = await worker.fetch(new Request(url), env);
  assert.equal(await fetched.text(), pack);
});

test('paste: rejects non-JSON and unsupported generic JSON bodies', async () => {
  const env = makeEnv();
  const req = new Request('https://example.com/paste', {
    method: 'POST',
    body: 'not json',
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
  const generic = await worker.fetch(new Request('https://example.com/paste', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }), env);
  assert.equal(generic.status, 400);
});

test('paste: returns 404 for missing id', async () => {
  const env = makeEnv();
  const req = new Request('https://example.com/t/nonexistent', { method: 'GET' });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 404);
});

// ── Hardening regression tests (2026-07-27 worker hardening) ──

function makeFullEnv(kvStore = {}, rlStore = {}) {
  const mk = (store) => ({
    put: async (k, v) => { store[k] = v; },
    get: async (k) => (k in store ? store[k] : null),
  });
  return { TEMPLATES: mk(kvStore), RATELIMIT: mk(rlStore) };
}

test('proxy: path guard rejects an empty upstream path (/proxy with no path)', async () => {
  let fetchCalled = false;
  global.fetch = async () => { fetchCalled = true; return new Response('{}'); };
  const req = new Request(
    'https://example.com/proxy?host=' + encodeURIComponent('https://aiostreams.elfhosted.com'),
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 403);
  assert.equal(fetchCalled, false);
});

test('proxy: host allowlist is the SSRF control (non-allowed host rejected, upstream untouched)', async () => {
  let fetchCalled = false;
  global.fetch = async () => { fetchCalled = true; return new Response('{}'); };
  const req = new Request(
    'https://example.com/proxy/api/v1/user?host=' + encodeURIComponent('https://attacker.example.com'),
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 403);
  assert.equal(fetchCalled, false, 'a non-allowlisted host must never be proxied');
});

test('proxy: rejects oversized request body (413)', async () => {
  let fetchCalled = false;
  global.fetch = async () => { fetchCalled = true; return new Response('{}'); };
  const big = 'x'.repeat(3 * 1024 * 1024); // 3 MB > 2 MB cap
  const req = new Request(
    'https://example.com/proxy/api/v1/user?host=' + encodeURIComponent('https://aiostreams.elfhosted.com'),
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'content-length': String(big.length) }, body: big }
  );
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 413);
  assert.equal(fetchCalled, false);
});

test('paste: retrieval sets Cache-Control: no-store (pastes may carry config)', async () => {
  const env = makeFullEnv();
  const tmpl = JSON.stringify({ config: { secret: 'torbox-key-xyz' } });
  const post = new Request('https://example.com/paste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: tmpl });
  const { url } = await (await worker.fetch(post, env)).json();
  const id = url.split('/t/')[1];
  const get = new Request(`https://example.com/t/${id}`, { method: 'GET' });
  const res = await worker.fetch(get, env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('rate limit: 31st /api/visit from one IP within a minute is rejected (429)', async () => {
  const env = makeFullEnv();
  const ip = '203.0.113.42';
  let last = 200;
  for (let i = 0; i < 31; i++) {
    const req = new Request('https://example.com/api/visit', { method: 'POST', headers: { 'cf-connecting-ip': ip } });
    const res = await worker.fetch(req, env);
    last = res.status;
    if (res.status === 429) break;
  }
  assert.equal(last, 429, 'expected the per-IP analytics bucket to trip within 31 requests');
});

test('randomId: produces a 10-char id from the allowed alphabet', async () => {
  // exercised indirectly via /paste; assert shape of the returned id
  const env = makeFullEnv();
  const post = new Request('https://example.com/paste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"config":{}}' });
  const { url } = await (await worker.fetch(post, env)).json();
  const id = url.split('/t/')[1];
  assert.match(id, /^[a-z0-9]{10}$/);
});

test('concurrent requests retain their own allowed CORS origin', async () => {
  let unblockFirst;
  const firstBlocked = new Promise(resolve => { unblockFirst = resolve; });
  let firstReachedRateLimit;
  const firstReached = new Promise(resolve => { firstReachedRateLimit = resolve; });

  const slowEnv = {
    RATELIMIT: {
      get: async () => { firstReachedRateLimit(); await firstBlocked; return null; },
      put: async () => {},
    },
  };
  const fastEnv = {
    RATELIMIT: { get: async () => null, put: async () => {} },
  };
  const ctx = { waitUntil: () => {} };

  const first = worker.fetch(new Request('https://example.com/api/visit', {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000', 'cf-connecting-ip': '203.0.113.1' },
  }), slowEnv, ctx);
  await firstReached;

  const second = await worker.fetch(new Request('https://example.com/api/visit', {
    method: 'POST',
    headers: { Origin: 'http://localhost:8080', 'cf-connecting-ip': '203.0.113.2' },
  }), fastEnv, ctx);
  unblockFirst();
  const firstResponse = await first;

  assert.equal(firstResponse.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  assert.equal(second.headers.get('access-control-allow-origin'), 'http://localhost:8080');
});

test('paste retrieval (/t/) allows any origin (Access-Control-Allow-Origin: *)', async () => {
  let upstream;
  global.fetch = async (input, init) => {
    upstream = input;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const env = makeEnv();
  await env.TEMPLATES.put('t:abc123', JSON.stringify({ metadata: { id: 'x', name: 'x', version: '0.0.1' }, config: { addonName: 'x' } }));
  const request = new Request('https://proxy.example/t/abc123', {
    method: 'GET',
    headers: { 'Origin': 'https://aio.atbphosting.com' },
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
});

test('proxy GET allows any origin (Access-Control-Allow-Origin: *)', async () => {
  global.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const request = new Request('https://proxy.example/proxy/api/v1/status?host=https%3A%2F%2Faiostreams.elfhosted.com', {
    method: 'GET',
    headers: { 'Origin': 'https://aio.atbphosting.com' },
  });
  const response = await worker.fetch(request, {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
});

test('contact POST keeps strict CORS echo (no wildcard)', async () => {
  const request = new Request('https://proxy.example/contact', {
    method: 'POST',
    headers: { 'Origin': 'https://aio.atbphosting.com', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', email: 'a@b.c', category: 'Feedback', message: 'hello' }),
  });
  // contact not configured -> 500, but the CORS header must NOT be '*'
  const response = await worker.fetch(request, {});
  assert.notEqual(response.headers.get('Access-Control-Allow-Origin'), '*');
});


test('proxy: api.wuplay.app is allowlisted and forwards Authorization when set (genie lane)', async () => {
  let upstreamUrl; let upstreamHeaders;
  global.fetch = async (input, init) => {
    upstreamUrl = String(input.url || input);
    upstreamHeaders = (input && input.headers) ? { Authorization: input.headers.get('Authorization') } : (init?.headers || {});
    return new Response('{"latestVersionName":"0.8.1"}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const res = await worker.fetch(new Request(
    'https://w.example/proxy/app/version?host=' + encodeURIComponent('https://api.wuplay.app'),
    { method: 'GET', headers: { Authorization: 'Bearer tok-123' } }
  ), { }, {}); // no env needed on the happy path
  assert.equal(res.status, 200);
  assert.ok(upstreamUrl.startsWith('https://api.wuplay.app/'), 'upstream targets api.wuplay.app');
  assert.equal(upstreamHeaders['Authorization'], 'Bearer tok-123', 'device token forwarded untouched');
});

test('proxy: must not invent an Authorization header when the caller sent none', async () => {
  let upstreamHeaders;
  global.fetch = async (input, init) => {
    upstreamHeaders = (input && input.headers) ? { Authorization: input.headers.get('Authorization') } : (init?.headers || {});
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const res = await worker.fetch(new Request(
    'https://w.example/proxy/api/v1/status?host=' + encodeURIComponent('https://aiostreams.elfhosted.com'),
    { method: 'GET' }
  ), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, {});
  assert.equal(res.status, 200);
  assert.equal(upstreamHeaders?.Authorization, null, 'no auth header invented');
});

test('proxy OPTIONS preflight advertises Authorization in Allow-Headers', async () => {
  const res = await worker.fetch(new Request(
    'https://w.example/proxy/app/version?host=' + encodeURIComponent('https://api.wuplay.app'),
    { method: 'OPTIONS', headers: { Origin: 'https://example.com' } }
  ), {}, {});
  assert.equal(res.status, 200);
  const allow = res.headers.get('Access-Control-Allow-Headers');
  assert.ok(allow && allow.includes('Authorization'), 'preflight must advertise Authorization');
});

test('all JSON/paste/proxy responses carry nosniff + no-referrer', async () => {
  const pastes = {};
  const env = { TEMPLATES: { put: async (k,v)=>{pastes[k]=v;}, get: async (k)=>pastes[k]||null }, STATS: undefined, RATELIMIT: undefined };
  const create = await worker.fetch(new Request('https://w.example/paste', { method:'POST', headers:{ 'Content-Type':'application/json', Origin:'https://brevitya.github.io' }, body:'{"config":{"test":true}}' }), env, { waitUntil: ()=>{} });
  assert.equal(create.headers.get('X-Content-Type-Options'), 'nosniff');
  const { url } = await create.json();
  const read = await worker.fetch(new Request(url, { method:'GET' }), env, { waitUntil: ()=>{} });
  assert.equal(read.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(read.headers.get('Referrer-Policy'), 'no-referrer');
});

// --- CoreSpeed lane: api.torbox.app is narrowed to one public read ---------
//
// Allowlisting a host normally opens GET/POST/PATCH on any path with the
// caller's Authorization forwarded. api.torbox.app is a third-party API where
// users hold account keys, so it is scoped to GET /v1/api/speedtest with no
// credential. These four tests are the reason that scoping cannot quietly
// regress: one proves the door opens, three prove it stays shut.

const TORBOX = encodeURIComponent('https://api.torbox.app');

test('CoreSpeed: GET /v1/api/speedtest reaches api.torbox.app', async () => {
  let upstreamUrl;
  global.fetch = async (input, init) => {
    const r = input instanceof Request ? input : new Request(input, init);
    upstreamUrl = r.url;
    return new Response('{"data":[]}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const res = await worker.fetch(new Request(
    `https://w.example/proxy/v1/api/speedtest?host=${TORBOX}&test_length=short`
  ), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, {});
  assert.equal(res.status, 200);
  assert.match(upstreamUrl, /^https:\/\/api\.torbox\.app\/v1\/api\/speedtest/);
});

test('CoreSpeed: a non-speedtest path on api.torbox.app is refused', async () => {
  let reached = false;
  global.fetch = async () => { reached = true; return new Response('{}', { status: 200 }); };
  const res = await worker.fetch(new Request(
    `https://w.example/proxy/v1/api/torrents/mylist?host=${TORBOX}`
  ), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, {});
  assert.equal(res.status, 403);
  assert.equal(reached, false, 'the request must not reach TorBox at all');
});

test('CoreSpeed: a write method on api.torbox.app is refused', async () => {
  let reached = false;
  global.fetch = async () => { reached = true; return new Response('{}', { status: 200 }); };
  for (const method of ['POST', 'PATCH']) {
    const res = await worker.fetch(new Request(
      `https://w.example/proxy/v1/api/speedtest?host=${TORBOX}`,
      { method, headers: { 'Content-Type': 'application/json' }, body: '{}' }
    ), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, {});
    assert.equal(res.status, 405, `${method} must be refused`);
  }
  assert.equal(reached, false, 'no write may reach TorBox');
});

test('CoreSpeed: an Authorization header is never relayed to api.torbox.app', async () => {
  let upstreamHeaders;
  global.fetch = async (input, init) => {
    const r = input instanceof Request ? input : new Request(input, init);
    upstreamHeaders = Object.fromEntries(r.headers);
    return new Response('{"data":[]}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const res = await worker.fetch(new Request(
    `https://w.example/proxy/v1/api/speedtest?host=${TORBOX}`,
    { headers: { Authorization: 'Bearer user-torbox-key' } }
  ), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, {});
  assert.equal(res.status, 200);
  assert.equal(upstreamHeaders.authorization, undefined, 'the key must be dropped, not relayed');
});

// ── 2026-08-21 infra audit regression tests ──────────────────────────────
// Covers: status-probe CDN caching, public-read CORS narrowing, and the
// scoped custom/self-hosted host lane (F1/F4/F6 in AUDIT-CONFIGURATOR-INFRA).

const ELFH = encodeURIComponent('https://aiostreams.elfhosted.com');
const CUSTOM = encodeURIComponent('https://selfhost.example.com');

test('status probe: GET /proxy/api/v1/status is CDN-cacheable (max-age + s-maxage 30)', async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: true, data: { version: '2.33.2' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, { waitUntil: () => {} });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=30, s-maxage=30');
});

test('proxy: non-status proxy GET stays no-store', async () => {
  global.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/user?host=${ELFH}`, { method: 'GET' }), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, { waitUntil: () => {} });
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('proxy: only /proxy/api/v1/status and /t/ get ACAO * (stream probes echo strict origin)', async () => {
  global.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  // status probe — public read
  const status = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`, { headers: { Origin: 'https://aio.atbphosting.com' } }), {}, { waitUntil: () => {} });
  assert.equal(status.headers.get('Access-Control-Allow-Origin'), '*');
  // stream probe — strict echo, NOT wildcard (URL embeds the config password)
  const stream = await worker.fetch(new Request(`https://w.example/proxy/stremio/uuid/pw/stream/movie/tt123.json?host=${ELFH}`, { headers: { Origin: 'https://aio.atbphosting.com' } }), {}, { waitUntil: () => {} });
  assert.notEqual(stream.headers.get('Access-Control-Allow-Origin'), '*');
});

test('custom lane: GET /api/v1/status on a non-allowlisted https host is proxied', async () => {
  let upstreamUrl; let upstreamHeaders;
  global.fetch = async (input, init) => {
    const r = input instanceof Request ? input : new Request(input, init);
    upstreamUrl = r.url; upstreamHeaders = Object.fromEntries(r.headers);
    return new Response(JSON.stringify({ success: true, data: { version: '2.33.2' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${CUSTOM}`, { headers: { Authorization: 'Bearer sekrit' } }), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, { waitUntil: () => {} });
  assert.equal(res.status, 200);
  assert.equal(upstreamUrl, 'https://selfhost.example.com/api/v1/status');
  assert.equal(upstreamHeaders.authorization, undefined, 'custom lane never forwards Authorization');
});

test('custom lane: POST /api/v1/user is proxied (direct install to self-hosted)', async () => {
  let reached = false;
  global.fetch = async () => { reached = true; return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/user?host=${CUSTOM}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"config":{}}' }), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, { waitUntil: () => {} });
  assert.equal(res.status, 200);
  assert.equal(reached, true);
});

test('custom lane: non-AIOStreams paths are refused (403, upstream untouched)', async () => {
  let reached = false;
  global.fetch = async () => { reached = true; return new Response('{}', { status: 200 }); };
  const res = await worker.fetch(new Request(`https://w.example/proxy/admin/delete-all?host=${CUSTOM}`, { method: 'GET' }), {}, { waitUntil: () => {} });
  assert.equal(res.status, 403);
  assert.equal(reached, false);
});

test('custom lane: http:// schemes are refused', async () => {
  let reached = false;
  global.fetch = async () => { reached = true; return new Response('{}', { status: 200 }); };
  const res = await worker.fetch(new Request('https://w.example/proxy/api/v1/status?host=' + encodeURIComponent('http://selfhost.example.com')), {}, { waitUntil: () => {} });
  assert.equal(res.status, 403);
  assert.equal(reached, false);
});

test('custom lane: hosts with a path, port, or userinfo are refused', async () => {
  let reached = false;
  global.fetch = async () => { reached = true; return new Response('{}', { status: 200 }); };
  for (const bad of ['https://selfhost.example.com/evil', 'https://selfhost.example.com:8443', 'https://user:pass@selfhost.example.com']) {
    const res = await worker.fetch(new Request('https://w.example/proxy/api/v1/status?host=' + encodeURIComponent(bad)), {}, { waitUntil: () => {} });
    assert.equal(res.status, 403, `${bad} must be refused`);
  }
  assert.equal(reached, false);
});

test('custom lane: rate limited separately and tighter than the allowlisted lane', async () => {
  const rlStore = {};
  const rl = { put: async (k, v) => { rlStore[k] = v; }, get: async (k) => (k in rlStore ? rlStore[k] : null) };
  const env = { TEMPLATES: undefined, STATS: undefined, RATELIMIT: rl };
  global.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  let last = 200;
  for (let i = 0; i < 21; i++) {
    const req = new Request(`https://w.example/proxy/api/v1/status?host=${CUSTOM}`, { headers: { 'cf-connecting-ip': '203.0.113.77' } });
    const res = await worker.fetch(req, env, { waitUntil: () => {} });
    last = res.status;
    if (res.status === 429) break;
  }
  assert.equal(last, 429, 'custom proxy bucket (20/min) must trip by the 21st request');
});

test('custom lane: Test Streams probe (host = manifest base + GET /stream/...) is proxied', async () => {
  let upstreamUrl;
  global.fetch = async (input, init) => {
    const r = input instanceof Request ? input : new Request(input, init);
    upstreamUrl = r.url;
    return new Response('{"streams":[]}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const manifestBase = encodeURIComponent('https://selfhost.example.com/stremio/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/pw123');
  const res = await worker.fetch(new Request(`https://w.example/proxy/stream/movie/tt1375666.json?host=${manifestBase}`, { method: 'GET' }), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, { waitUntil: () => {} });
  assert.equal(res.status, 200);
  assert.equal(upstreamUrl, 'https://selfhost.example.com/stremio/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/pw123/stream/movie/tt1375666.json');
});

test('custom lane: manifest base host with an overly deep path is refused', async () => {
  let reached = false;
  global.fetch = async () => { reached = true; return new Response('{}', { status: 200 }); };
  const deep = encodeURIComponent('https://selfhost.example.com/stremio/uuid/pw/extra/deeper');
  const res = await worker.fetch(new Request(`https://w.example/proxy/stream/movie/tt1375666.json?host=${deep}`, { method: 'GET' }), {}, { waitUntil: () => {} });
  assert.equal(res.status, 403);
  assert.equal(reached, false);
});

test('status probe: cache HIT serves the cached body without touching upstream or rate limit', async () => {
  let upstreamCalled = 0; let rlTouched = false;
  global.fetch = async () => { upstreamCalled++; return new Response(JSON.stringify({ success: true, data: { version: '2.33.2' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  const cachedBody = JSON.stringify({ success: true, data: { version: '2.33.2-cached' } });
  globalThis.caches = {
    default: {
      match: async () => new Response(cachedBody, { status: 200, headers: { 'Content-Type': 'application/json' } }),
      put: async () => {},
    },
  };
  try {
    const rl = { get: async () => { rlTouched = true; return null; }, put: async () => {} };
    const env = { TEMPLATES: undefined, STATS: undefined, RATELIMIT: rl };
    const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`), env, { waitUntil: () => {} });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).data.version, '2.33.2-cached');
    assert.equal(upstreamCalled, 0, 'cache hit must not fetch upstream');
    assert.equal(rlTouched, false, 'cache hit must not burn the rate-limit bucket');
  } finally {
    delete globalThis.caches;
  }
});

test('status probe: cache HIT counts a proxy_cache_hits increment (stats stay interpretable)', async () => {
  const stats = {};
  const env = {
    TEMPLATES: undefined,
    STATS: { get: async (k) => stats[k] || null, put: async (k, v) => { stats[k] = v; } },
    RATELIMIT: undefined,
  };
  global.fetch = async () => { throw new Error('upstream must not be reached on cache hit'); };
  globalThis.caches = {
    default: {
      match: async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      put: async () => {},
    },
  };
  try {
    const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`), env, { waitUntil: (p) => p && p.then ? p.then(() => {}) : p });
    assert.equal(res.status, 200);
    await new Promise(r => setImmediate(r));
    assert.equal(stats.proxy_cache_hits, '1', 'cache hit must increment proxy_cache_hits');
  } finally {
    delete globalThis.caches;
  }
});

test('status probe: cache MISS stores a 200 for later (put called with cacheable headers)', async () => {
  let putArgs = null;
  global.fetch = async () => new Response(JSON.stringify({ success: true, data: { version: '2.33.2' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  globalThis.caches = {
    default: {
      match: async () => null,
      put: async (key, value) => { putArgs = { key: String(key.url), cc: value.headers.get('Cache-Control') }; },
    },
  };
  try {
    const ctx = { waitUntil: (p) => p.then ? p.then(() => {}) : p };
    const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, ctx);
    assert.equal(res.status, 200);
    await new Promise(r => setImmediate(r)); // let waitUntil settle
    assert.ok(putArgs, '200 status probe must be stored in the Cache API');
    assert.ok(putArgs.key.includes('/proxy/api/v1/status'));
    assert.match(putArgs.cc, /s-maxage=30/);
  } finally {
    delete globalThis.caches;
  }
});

test('status probe: non-status paths are never stored in the cache', async () => {
  let putCalled = false;
  global.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  globalThis.caches = {
    default: {
      match: async () => null,
      put: async () => { putCalled = true; },
    },
  };
  try {
    const ctx = { waitUntil: (p) => p.then ? p.then(() => {}) : p };
    await worker.fetch(new Request(`https://w.example/proxy/api/v1/user?host=${ELFH}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), { TEMPLATES: undefined, STATS: undefined, RATELIMIT: undefined }, ctx);
    await new Promise(r => setImmediate(r));
    assert.equal(putCalled, false, 'mutating/non-status responses must not be cached');
  } finally {
    delete globalThis.caches;
  }
});

test('custom lane: IP literals and IPv4-mapped loopback are refused (defense in depth)', async () => {
  let reached = false;
  global.fetch = async () => { reached = true; return new Response('{}', { status: 200 }); };
  const bads = [
    'https://[::ffff:127.0.0.1]',            // IPv4-mapped IPv6 loopback
    'https://[::1]',                         // IPv6 loopback
    'https://127.0.0.1',                     // IPv4 loopback literal
    'https://192.168.1.10',                  // private IPv4 literal
    'https://10.0.0.5',                      // private IPv4 literal
  ];
  for (const bad of bads) {
    const res = await worker.fetch(new Request('https://w.example/proxy/api/v1/status?host=' + encodeURIComponent(bad)), {}, { waitUntil: () => {} });
    assert.equal(res.status, 403, `${bad} must be refused`);
  }
  assert.equal(reached, false);
});

test('custom lane: 3-segment /stremio/<uuid> (missing password) is refused for stream probes', async () => {
  let reached = false;
  global.fetch = async () => { reached = true; return new Response('{}', { status: 200 }); };
  const noPwd = encodeURIComponent('https://selfhost.example.com/stremio/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  const res = await worker.fetch(new Request(`https://w.example/proxy/stream/movie/tt1375666.json?host=${noPwd}`, { method: 'GET' }), {}, { waitUntil: () => {} });
  assert.equal(res.status, 403);
  assert.equal(reached, false);
});

test('visit: rate-limited visits are counted in visits_rate_limited (never silent)', async () => {
  const stats = {}; const rlStore = {};
  const statsKv = { get: async (k) => stats[k] || null, put: async (k, v) => { stats[k] = v; } };
  const rl = { get: async (k) => (k in rlStore ? rlStore[k] : null), put: async (k, v) => { rlStore[k] = v; } };
  const env = { STATS: statsKv, RATELIMIT: rl };
  const ctx = { waitUntil: (p) => p && p.then ? p.then(() => {}) : p };
  const ip = '203.0.113.99';
  let last = 200;
  for (let i = 0; i < 31; i++) {
    const res = await worker.fetch(new Request('https://w.example/api/visit', { method: 'POST', headers: { 'cf-connecting-ip': ip } }), env, ctx);
    last = res.status;
    if (res.status === 429) break;
  }
  assert.equal(last, 429, 'bucket must trip within 31 requests');
  await new Promise(r => setImmediate(r));
  assert.ok(Number(stats.visits_rate_limited) > 0, 'rate-limited visits must be surfaced in stats');
  assert.ok(Number(stats.visits) <= 30, 'only non-rate-limited visits count toward visits');
});

// A counter that is written but not listed in the /api/stats `keys` array is
// write-only: it accumulates in KV and no one can ever read it. That happened to
// proxy_err_timeout/network/oversize/status — they are incremented as
// `proxy_err_${cls}` (underscore) while listByPrefix scans `proxy_err:` (colon),
// so the prefix scan never covered them and the explicit list omitted them.
// smoke.mjs checked for them and reported a WARN blaming a stale deploy.
test('/api/stats surfaces every counter the worker writes', async () => {
  const written = [
    'visits', 'generates', 'proxy_calls', 'proxy_cache_hits', 'proxy_errors',
    'pastes_created', 'pastes_viewed', 'visits_rate_limited', 'visits_write_err',
    'proxy_err_timeout', 'proxy_err_network', 'proxy_err_oversize', 'proxy_err_status',
  ];
  const store = Object.fromEntries(written.map((k, i) => [k, String(i + 1)]));
  const env = {
    STATS: { get: async k => store[k] ?? null, list: async () => ({ keys: [] }) },
  };
  const res = await worker.fetch(new Request('https://w.example/api/stats'), env, { waitUntil() {} });
  assert.equal(res.status, 200);
  const body = await res.json();
  const missing = written.filter(k => !(k in body));
  assert.deepEqual(missing, [], `counters written to KV but absent from /api/stats: ${missing.join(', ')}`);
  // and the values must be the real ones, not zeros from a default
  assert.equal(body.proxy_err_timeout, 10);
  assert.equal(body.proxy_err_status, 13);
});
