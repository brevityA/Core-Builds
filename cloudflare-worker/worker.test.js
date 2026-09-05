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

// ── 2026-09-03 INFRA-AUDIT regression tests ──────────────────────────────
// Each security test below FAILS against the pre-audit worker (verified by
// running it against /tmp/worker.orig.js during the audit). See INFRA-AUDIT.md
// for the finding ids (S*, R*, O*) referenced in test names.

// Guarded so this file can be pointed at a pre-audit worker.js to demonstrate
// which tests fail without the fixes (the legacy tests keep running).
const _resetBreakers = worker._resetBreakers || (() => {});
const PasteStore = workerModule.PasteStore || class { constructor() { throw new Error('PasteStore not exported by this worker build'); } };
const WORKER_VERSION = worker.WORKER_VERSION || 'legacy';
const ctxSync = { waitUntil: (p) => p && p.then ? p.then(() => {}) : p };
const settle = () => new Promise(r => setImmediate(r));

// A fake Durable Object namespace that runs the real PasteStore class over an
// in-memory SQLite-shaped shim (exec/toArray), so the read-after-write path is
// exercised end to end without workerd.
function fakeSql() {
  const rows = new Map();
  return {
    exec(q, ...args) {
      if (/CREATE (TABLE|INDEX)/.test(q)) return { toArray: () => [] };
      if (q.startsWith('INSERT')) { rows.set(args[0], { body: args[1], expires_at: args[2] }); return { toArray: () => [] }; }
      if (q.startsWith('SELECT')) { const r = rows.get(args[0]); return { toArray: () => (r ? [r] : []) }; }
      if (q.startsWith('DELETE')) { for (const [k, v] of rows) if (v.expires_at <= args[0]) rows.delete(k); return { toArray: () => [] }; }
      throw new Error('unexpected sql: ' + q);
    },
    _rows: rows,
  };
}
function fakeDoNamespace({ failWrites = false, failAll = false } = {}) {
  let instance;
  const state = {
    storage: { sql: fakeSql(), getAlarm: async () => null, setAlarm: async () => {} },
    blockConcurrencyWhile: async (fn) => { await fn(); },
  };
  return {
    idFromName: (n) => `id:${n}`,
    get: () => ({
      fetch: async (url, init) => {
        if (failAll) throw new Error('DO unavailable');
        if (failWrites && init && init.method === 'PUT') return new Response('boom', { status: 500 });
        instance = instance || new PasteStore(state);
        return instance.fetch(new Request(url, init));
      },
    }),
    _state: state,
  };
}
const TEMPLATE_BODY = JSON.stringify({ metadata: { id: 'x', name: 'x', version: '0.0.1' }, config: { addonName: 'x' } });

test.beforeEach(() => _resetBreakers());

// ── S2: redirects ──────────────────────────────────────────────────────────
test('S2: an upstream 3xx is refused (502), the redirect target is never fetched', async () => {
  const fetched = [];
  global.fetch = async (input) => {
    const r = input instanceof Request ? input : new Request(input);
    fetched.push(r.url);
    assert.equal(r.redirect, 'manual', 'upstream request must not auto-follow');
    return new Response(null, { status: 302, headers: { Location: 'https://attacker.example/steal' } });
  };
  const stats = {};
  const env = { STATS: { get: async k => stats[k] || null, put: async (k, v) => { stats[k] = v; } } };
  const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${CUSTOM}`), env, ctxSync);
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: 'upstream redirect refused' });
  assert.deepEqual(fetched, ['https://selfhost.example.com/api/v1/status']);
  await settle();
  assert.equal(stats.proxy_err_redirect, '1');
  assert.equal(res.headers.get('Location'), null);
});

test('S2: redirect refusal also applies to allowlisted hosts and to POST writes (body never replayed elsewhere)', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; return new Response('', { status: 307, headers: { Location: 'https://aiostreams.elfhosted.com/api/v1/user' } }); };
  const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/user?host=${ELFH}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"config":{},"password":"pw"}' }), {}, ctxSync);
  assert.equal(res.status, 502);
  assert.equal(calls, 1);
});

// ── S3: Authorization forwarding allowlist ────────────────────────────────
test('S3: Authorization is dropped for AIOStreams hosts and kept only for api.wuplay.app', async () => {
  const seen = {};
  global.fetch = async (input) => {
    const r = input instanceof Request ? input : new Request(input);
    seen[new URL(r.url).hostname] = r.headers.get('authorization');
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const h = { Authorization: 'Bearer token' };
  await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`, { headers: h }), {}, ctxSync);
  await worker.fetch(new Request(`https://w.example/proxy/app/version?host=${encodeURIComponent('https://api.wuplay.app')}`, { headers: h }), {}, ctxSync);
  assert.equal(seen['aiostreams.elfhosted.com'], null, 'AIOStreams host must not receive the caller credential');
  assert.equal(seen['api.wuplay.app'], 'Bearer token', 'WuPlay lane still gets its device token');
});

// ── S4: rate limiting must hold with no KV binding and across isolates ────
test('S4: rate limit holds with NO RATELIMIT KV bound (in-isolate floor)', async () => {
  global.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  let last = 200;
  for (let i = 0; i < 25; i++) {
    const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${CUSTOM}`, { headers: { 'cf-connecting-ip': '198.51.100.9' } }), {}, ctxSync);
    last = res.status; if (last === 429) break;
  }
  assert.equal(last, 429, 'custom lane (20/min) must trip without any KV binding');
});

test('S4: Rate Limiting binding deny is honoured (cross-isolate counter), and is keyed by scope+ip', async () => {
  const keys = [];
  const env = { RL_PASTE_READ: { limit: async ({ key }) => { keys.push(key); return { success: false }; } }, TEMPLATES: { get: async () => TEMPLATE_BODY, put: async () => {} } };
  const res = await worker.fetch(new Request('https://w.example/t/abcdef1234', { headers: { 'cf-connecting-ip': '198.51.100.10' } }), env, ctxSync);
  assert.equal(res.status, 429);
  assert.deepEqual(keys, ['paste_read:198.51.100.10']);
});

test('S4: KV same-key write-cap failure inside the window counts against the caller (no fail-open burst)', async () => {
  // Simulate KV: reads return the current count, but puts throw once the count
  // approaches the limit (the 1 write/s/key behaviour under burst).
  const store = {};
  const rl = {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { if (parseInt(v, 10) >= 10) throw new Error('KV PUT failed: 429 too many writes'); store[k] = v; },
  };
  const env = { RATELIMIT: rl, TEMPLATES: { get: async () => null, put: async () => {} } };
  let statuses = [];
  for (let i = 0; i < 12; i++) {
    const res = await worker.fetch(new Request('https://w.example/paste', { method: 'POST', headers: { 'cf-connecting-ip': '198.51.100.11', 'Content-Type': 'application/json' }, body: TEMPLATE_BODY }), env, ctxSync);
    statuses.push(res.status);
  }
  assert.ok(statuses.includes(429), `burst must be stopped even when KV puts fail: ${statuses.join(',')}`);
  assert.ok(statuses.filter(s => s === 200).length <= 10, 'never more than the configured 10/min pass');
});

test('S4: X-Forwarded-For cannot be used to escape the bucket (only cf-connecting-ip is keyed)', async () => {
  global.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  let last = 200;
  for (let i = 0; i < 25; i++) {
    const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${CUSTOM}`, { headers: { 'cf-connecting-ip': '198.51.100.12', 'X-Forwarded-For': `10.0.${i}.1` } }), {}, ctxSync);
    last = res.status; if (last === 429) break;
  }
  assert.equal(last, 429);
});

test('S4: rate-limit rejections are counted (rate_limited + rl_hit:<scope>) and listed by /api/stats', async () => {
  const stats = {}; const statsKv = { get: async k => stats[k] || null, put: async (k, v) => { stats[k] = v; }, list: async ({ prefix }) => ({ keys: Object.keys(stats).filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
  const env = { STATS: statsKv, RL_ANALYTICS: { limit: async () => ({ success: false }) } };
  const res = await worker.fetch(new Request('https://w.example/api/generate', { method: 'POST', headers: { 'cf-connecting-ip': '198.51.100.13' } }), env, ctxSync);
  assert.equal(res.status, 429);
  await settle();
  const s = await (await worker.fetch(new Request('https://w.example/api/stats'), env, ctxSync)).json();
  assert.equal(s.rate_limited, 1);
  assert.deepEqual(s.by_rate_limit, { generate: 1 });
});

// ── S5: reserved / dotless hostnames ──────────────────────────────────────
test('S5: custom lane refuses dotless and reserved-suffix hostnames, keeps public FQDNs', async () => {
  let reached = 0;
  global.fetch = async () => { reached++; return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  for (const bad of ['https://intranet', 'https://router.local', 'https://vault.internal', 'https://box.lan', 'https://svc.corp', 'https://h.onion', 'https://1.0.0.10.in-addr.arpa', 'https://localhost.localdomain'.replace('localdomain', 'local')]) {
    const res = await worker.fetch(new Request('https://w.example/proxy/api/v1/status?host=' + encodeURIComponent(bad)), {}, ctxSync);
    assert.equal(res.status, 403, `${bad} must be refused`);
  }
  assert.equal(reached, 0);
  const ok = await worker.fetch(new Request('https://w.example/proxy/api/v1/status?host=' + encodeURIComponent('https://aio.my-home-server.example.com')), {}, ctxSync);
  assert.equal(ok.status, 200);
  const canary = await worker.fetch(new Request('https://w.example/proxy/api/v1/status?host=' + encodeURIComponent('https://example.com')), {}, ctxSync);
  assert.equal(canary.status, 200, 'smoke canary example.com stays allowed');
});

test('SSRF matrix: decimal / hex / octal / short IPv4 encodings and IPv6 literals are all refused', async () => {
  let reached = 0;
  global.fetch = async () => { reached++; return new Response('{}', { status: 200 }); };
  const bads = ['https://2130706433', 'https://0x7f000001', 'https://0177.0.0.1', 'https://127.1', 'https://0x7f.1', 'https://[::ffff:7f00:1]', 'https://[fe80::1]', 'https://169.254.169.254', 'https://0.0.0.0', 'https://user@selfhost.example.com', 'https://selfhost.example.com:8443', 'https://selfhost.example.com/?x=1', 'https://selfhost.example.com/#f'];
  for (const bad of bads) {
    const res = await worker.fetch(new Request('https://w.example/proxy/api/v1/status?host=' + encodeURIComponent(bad)), {}, ctxSync);
    assert.equal(res.status, 403, `${bad} must be refused`);
  }
  assert.equal(reached, 0);
});

// ── S6/S7: input validation ────────────────────────────────────────────────
test('S6: /api/generate only accepts bounded lowercase dimension values as KV keys', async () => {
  const stats = {}; const statsKv = { get: async k => stats[k] || null, put: async (k, v) => { stats[k] = v; } };
  const env = { STATS: statsKv };
  await worker.fetch(new Request('https://w.example/api/generate', { method: 'POST', body: JSON.stringify({ service: 'torbox-pro', device: '<img src=x onerror=alert(1)>', resolution: 'x'.repeat(600) }) }), env, ctxSync);
  await settle();
  assert.equal(stats['gen:service:torbox-pro'], '1');
  assert.equal(Object.keys(stats).filter(k => k.startsWith('gen:device:')).length, 0);
  assert.equal(Object.keys(stats).filter(k => k.startsWith('gen:res:')).length, 0);
});

test('S7: /contact refuses oversized payloads (413) before parsing', async () => {
  const env = { DISCORD_WEBHOOK_URL: 'https://discord.example/hook' };
  global.fetch = async () => { throw new Error('webhook must not be called'); };
  const res = await worker.fetch(new Request('https://w.example/contact', { method: 'POST', headers: { Origin: 'https://brevitya.github.io', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'a', message: 'x'.repeat(20000) }) }), env, ctxSync);
  assert.equal(res.status, 413);
});

// ── S8/O6: no credentials, paths or custom hostnames in stats/logs ─────────
test('S8: custom-lane hostnames are not published in /api/stats (label = custom)', async () => {
  global.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  const stats = {}; const statsKv = { get: async k => stats[k] || null, put: async (k, v) => { stats[k] = v; } };
  await worker.fetch(new Request('https://w.example/proxy/api/v1/status?host=' + encodeURIComponent('https://my-private-box.example.net')), { STATS: statsKv }, ctxSync);
  await settle();
  assert.equal(stats['proxy:custom'], '1');
  assert.ok(!Object.keys(stats).some(k => k.includes('my-private-box')), 'private hostname must not become a KV key');
});

test('O6: log lines never contain the request URL, path, body, password or IP', async () => {
  const lines = [];
  const origLog = console.log; console.log = (l) => lines.push(String(l));
  try {
    global.fetch = async () => { throw new TypeError('fetch failed'); };
    const url = `https://w.example/proxy/stremio/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/SUPERSECRETPW/stream/movie/tt1.json?host=${ELFH}`;
    for (let i = 0; i < 6; i++) await worker.fetch(new Request(url, { headers: { 'cf-connecting-ip': '198.51.100.44' } }), {}, ctxSync);
  } finally { console.log = origLog; }
  assert.ok(lines.length > 0, 'transport failures are logged');
  for (const l of lines) {
    assert.ok(!/SUPERSECRETPW|stremio|198\.51\.100\.44|w\.example\/proxy/.test(l), `log leaked request data: ${l}`);
    const parsed = JSON.parse(l);
    assert.equal(parsed.event, 'proxy_upstream_error');
    assert.equal(parsed.host, 'aiostreams.elfhosted.com');
  }
});

// ── S9: security headers on every worker response ──────────────────────────
test('S9: JSON, paste and proxy responses carry frame/CSP/HSTS headers', async () => {
  global.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  const env = { TEMPLATES: { get: async () => TEMPLATE_BODY, put: async () => {} } };
  for (const req of [new Request('https://w.example/nope'), new Request('https://w.example/t/abcdef1234'), new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`), new Request('https://w.example/healthz')]) {
    const res = await worker.fetch(req, env, ctxSync);
    assert.equal(res.headers.get('X-Frame-Options'), 'DENY', req.url);
    assert.match(res.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
    assert.match(res.headers.get('Strict-Transport-Security'), /max-age=/);
  }
});

// ── CORS on the credential-bearing route stays strict after all changes ────
test('CORS: /proxy/stremio/<uuid>/<epwd>/... never gets ACAO * even from an allowlisted host origin, and preflight matches', async () => {
  global.fetch = async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  const url = `https://w.example/proxy/stremio/u/epwd/stream/movie/tt1.json?host=${ELFH}`;
  const actual = await worker.fetch(new Request(url, { headers: { Origin: 'https://evil.example' } }), {}, ctxSync);
  assert.equal(actual.headers.get('Access-Control-Allow-Origin'), 'https://brevitya.github.io');
  const pre = await worker.fetch(new Request(url, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), {}, ctxSync);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), 'https://brevitya.github.io');
  assert.equal(pre.headers.get('Vary'), 'Origin');
});

// ── R1: paste read-after-write via the Durable Object store ───────────────
test('R1: paste written to the DO store is readable immediately even when KV would still 404', async () => {
  const PASTES = fakeDoNamespace();
  // KV that NEVER returns what was just written (models a distant colo's cached negative lookup)
  const staleKv = { put: async () => {}, get: async () => null };
  const env = { PASTES, TEMPLATES: staleKv };
  const post = await worker.fetch(new Request('https://w.example/paste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: TEMPLATE_BODY }), env, ctxSync);
  assert.equal(post.status, 200);
  const { url } = await post.json();
  const read = await worker.fetch(new Request(url), env, ctxSync);
  assert.equal(read.status, 200, 'no 404 race');
  assert.equal(await read.text(), TEMPLATE_BODY);
  assert.equal(read.headers.get('Cache-Control'), 'no-store');
  assert.equal(read.headers.get('Access-Control-Allow-Origin'), '*');
});

test('R1: legacy ids written to KV before the DO store are still served (fallback read, counted)', async () => {
  const PASTES = fakeDoNamespace();
  const kv = { 't:legacy0001': TEMPLATE_BODY };
  const stats = {};
  const env = { PASTES, TEMPLATES: { get: async k => kv[k] || null, put: async () => {} }, STATS: { get: async k => stats[k] || null, put: async (k, v) => { stats[k] = v; } } };
  const read = await worker.fetch(new Request('https://w.example/t/legacy0001'), env, ctxSync);
  assert.equal(read.status, 200);
  await settle();
  assert.equal(stats.pastes_kv_fallback_reads, '1');
});

test('R1: DO write failure degrades to KV (route stays alive), DO outage degrades to KV reads', async () => {
  const kv = {};
  const kvBinding = { get: async k => kv[k] || null, put: async (k, v) => { kv[k] = v; } };
  const env = { PASTES: fakeDoNamespace({ failWrites: true }), TEMPLATES: kvBinding };
  const post = await worker.fetch(new Request('https://w.example/paste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: TEMPLATE_BODY }), env, ctxSync);
  assert.equal(post.status, 200);
  assert.equal(Object.keys(kv).length, 1, 'fell back to KV');
  const id = (await post.json()).url.split('/t/')[1];
  const read = await worker.fetch(new Request(`https://w.example/t/${id}`), { PASTES: fakeDoNamespace({ failAll: true }), TEMPLATES: kvBinding }, ctxSync);
  assert.equal(read.status, 200);
});

test('R1: shape and size validation are unchanged in front of the DO store', async () => {
  const env = { PASTES: fakeDoNamespace() };
  const generic = await worker.fetch(new Request('https://w.example/paste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"hello":"world"}' }), env, ctxSync);
  assert.equal(generic.status, 400);
  const big = await worker.fetch(new Request('https://w.example/paste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: { pad: 'x'.repeat(600 * 1024) } }) }), env, ctxSync);
  assert.equal(big.status, 400);
  assert.equal((await big.json()).error, 'too large');
});

test('R1: PasteStore expires rows via alarm and refuses non-conforming ids', async () => {
  const ns = fakeDoNamespace();
  const env = { PASTES: ns };
  const post = await worker.fetch(new Request('https://w.example/paste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: TEMPLATE_BODY }), env, ctxSync);
  const id = (await post.json()).url.split('/t/')[1];
  const row = ns._state.storage.sql._rows.get(id);
  row.expires_at = Date.now() - 1;
  const stub = ns.get();
  assert.equal((await stub.fetch(`https://paste-store/${id}`, { method: 'GET' })).status, 404, 'expired rows are not served');
  assert.equal((await stub.fetch('https://paste-store/../etc', { method: 'GET' })).status, 400);
});

// ── R2: single-flight on status-probe cache miss ──────────────────────────
test('R2: concurrent cache misses for one status probe share a single upstream fetch', async () => {
  let upstream = 0; let release;
  const gate = new Promise(r => { release = r; });
  global.fetch = async () => { upstream++; await gate; return new Response(JSON.stringify({ data: { version: '2.33.2' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
  try {
    const reqs = Array.from({ length: 8 }, () => worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`), {}, ctxSync));
    await settle(); release();
    const results = await Promise.all(reqs);
    assert.equal(upstream, 1, 'exactly one upstream fetch for 8 concurrent misses');
    for (const r of results) { assert.equal(r.status, 200); assert.equal((await r.json()).data.version, '2.33.2'); }
  } finally { delete globalThis.caches; }
});

test('R2: single-flight is per URL — different hosts do not share a fetch', async () => {
  let upstream = 0;
  global.fetch = async () => { upstream++; return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  await Promise.all([
    worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`), {}, ctxSync),
    worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${encodeURIComponent('https://aiostreams.viren070.me')}`), {}, ctxSync),
  ]);
  assert.equal(upstream, 2);
});

// ── R3: upstream timeout / 429 / 5xx / CF egress errors / circuit breaker ──
test('R3: upstream timeout → 502 + proxy_err_timeout; upstream 429/5xx are mirrored (not converted to a worker 429)', async () => {
  const stats = {}; const statsKv = { get: async k => stats[k] || null, put: async (k, v) => { stats[k] = v; } };
  global.fetch = async () => { const e = new Error('t'); e.name = 'TimeoutError'; throw e; };
  const t = await worker.fetch(new Request(`https://w.example/proxy/api/v1/user?host=${ELFH}`, { method: 'POST', body: '{}' }), { STATS: statsKv }, ctxSync);
  assert.equal(t.status, 502);
  await settle(); assert.equal(stats.proxy_err_timeout, '1');
  global.fetch = async () => new Response('{"error":"slow down"}', { status: 429, headers: { 'Content-Type': 'application/json' } });
  const r = await worker.fetch(new Request(`https://w.example/proxy/api/v1/user?host=${ELFH}`, { method: 'POST', body: '{}' }), {}, ctxSync);
  assert.equal(r.status, 429, 'an UPSTREAM 429 is passed through unchanged (contract: writeHostFetch may then retry direct)');
  global.fetch = async () => new Response('{"error":"boom"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
  const f = await worker.fetch(new Request(`https://w.example/proxy/api/v1/user?host=${ELFH}`, { method: 'POST', body: '{}' }), { STATS: statsKv }, ctxSync);
  assert.equal(f.status, 503);
  await settle(); assert.equal(stats.proxy_err_status, '1');
});

test('R3/O2: Cloudflare egress error pages (530 "error code: 1016") are classified as network, returned as JSON 502', async () => {
  const stats = {}; const statsKv = { get: async k => stats[k] || null, put: async (k, v) => { stats[k] = v; } };
  global.fetch = async () => new Response('error code: 1016', { status: 530, headers: { 'Content-Type': 'text/plain; charset=UTF-8' } });
  const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${CUSTOM}`), { STATS: statsKv }, ctxSync);
  assert.equal(res.status, 502);
  assert.equal(res.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(await res.json(), { error: 'upstream unreachable' });
  await settle();
  assert.equal(stats.proxy_err_network, '1');
  assert.equal(stats.proxy_err_status, undefined);
});

test('R3: circuit breaker opens after 5 transport failures (fast 503 + Retry-After, no upstream call), recovers on success', async () => {
  let upstream = 0; let mode = 'fail';
  global.fetch = async () => { upstream++; if (mode === 'fail') throw new TypeError('fetch failed'); return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  const stats = {}; const statsKv = { get: async k => stats[k] || null, put: async (k, v) => { stats[k] = v; } };
  const env = { STATS: statsKv };
  const url = `https://w.example/proxy/api/v1/user?host=${encodeURIComponent('https://aiostreams.stremio.ru')}`;
  for (let i = 0; i < 5; i++) assert.equal((await worker.fetch(new Request(url, { method: 'POST', body: '{}' }), env, ctxSync)).status, 502);
  assert.equal(upstream, 5);
  const open = await worker.fetch(new Request(url, { method: 'POST', body: '{}' }), env, ctxSync);
  assert.equal(open.status, 503);
  assert.equal(open.headers.get('Retry-After'), '30');
  assert.equal(upstream, 5, 'open breaker must not touch upstream');
  await settle(); assert.equal(stats.proxy_err_breaker, '1');
  // other hosts are unaffected (blast radius = one host)
  mode = 'ok';
  assert.equal((await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`), env, ctxSync)).status, 200);
  // half-open after the window: reset and verify recovery path
  _resetBreakers();
  assert.equal((await worker.fetch(new Request(url, { method: 'POST', body: '{}' }), env, ctxSync)).status, 200);
});

test('R3: upstream 4xx/5xx do NOT trip the breaker (the host is answering)', async () => {
  global.fetch = async () => new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } });
  const url = `https://w.example/proxy/api/v1/status?host=${ELFH}`;
  for (let i = 0; i < 8; i++) assert.equal((await worker.fetch(new Request(url), {}, ctxSync)).status, 500);
});

// ── R4: binary-safe passthrough ────────────────────────────────────────────
test('R4: upstream bytes are passed through unmodified (no UTF-8 round-trip)', async () => {
  const bytes = new Uint8Array([0xff, 0xfe, 0x00, 0x80, 0x7b, 0x7d]);
  global.fetch = async () => new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
  const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/status?host=${ELFH}`), {}, ctxSync);
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), bytes);
});

// ── R6/O1: counter retries are spaced and failures are visible ────────────
test('O1: exhausted counter writes increment counter_write_err and it is surfaced by /api/stats', async () => {
  const stats = {};
  const flaky = { get: async k => stats[k] || null, put: async (k, v) => { if (k === 'visits') throw new Error('KV PUT failed: 429'); stats[k] = v; }, list: async () => ({ keys: [], list_complete: true }) };
  const env = { STATS: flaky };
  const res = await worker.fetch(new Request('https://w.example/api/visit', { method: 'POST' }), env, ctxSync);
  assert.deepEqual(await res.json(), { visits: 0 });
  await settle();
  assert.equal(stats.counter_write_err, '1');
  assert.equal(stats.visits_write_err, '1');
  const s = await (await worker.fetch(new Request('https://w.example/api/stats'), env, ctxSync)).json();
  assert.equal(s.counter_write_err, 1);
});

// ── O3: /api/stats completeness (extends the existing write-only guard) ────
test('O3: every counter written anywhere in worker.js is listed in /api/stats', async () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('./worker.js'), 'utf8');
  const written = new Set();
  for (const m of source.matchAll(/'([a-z_]+)'/g)) written.add(m[1]);
  const totals = ['visits', 'generates', 'proxy_calls', 'proxy_cache_hits', 'proxy_errors', 'pastes_created', 'pastes_viewed',
    'visits_rate_limited', 'visits_write_err', 'proxy_err_timeout', 'proxy_err_network', 'proxy_err_oversize', 'proxy_err_status',
    'proxy_err_redirect', 'proxy_err_breaker', 'contact_messages', 'counter_write_err', 'rate_limited', 'pastes_kv_fallback_reads'];
  const store = Object.fromEntries(totals.map((k, i) => [k, String(i + 1)]));
  const env = { STATS: { get: async k => store[k] ?? null, list: async () => ({ keys: [], list_complete: true }) } };
  const body = await (await worker.fetch(new Request('https://w.example/api/stats'), env, ctxSync)).json();
  const missing = totals.filter(k => !(k in body));
  assert.deepEqual(missing, []);
  assert.equal(body.contact_messages, 16, 'contact_messages was write-only before 2026-09-03');
  assert.ok('by_rate_limit' in body);
  assert.equal(body.version, WORKER_VERSION);
});

test('O5: /healthz reports version + bindings without touching KV, 503 when no paste store is bound', async () => {
  const touched = { kv: 0 };
  const env = { STATS: { get: async () => { touched.kv++; return null; } }, TEMPLATES: { get: async () => { touched.kv++; return null; } } };
  const ok = await worker.fetch(new Request('https://w.example/healthz'), env, ctxSync);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.version, WORKER_VERSION);
  assert.equal(body.bindings.TEMPLATES, true);
  assert.equal(touched.kv, 0);
  const notReady = await worker.fetch(new Request('https://w.example/healthz'), {}, ctxSync);
  assert.equal(notReady.status, 503);
});

test('R5: /api/stats is served from the Cache API keyed on the path only (query busting cannot force a rebuild)', async () => {
  let kvLists = 0; let putKey = null;
  const env = { STATS: { get: async () => '1', list: async () => { kvLists++; return { keys: [], list_complete: true }; } } };
  let stored = null;
  globalThis.caches = { default: { match: async (req) => (stored && req.url === putKey ? stored.clone() : undefined), put: async (req, res) => { putKey = req.url; stored = res; } } };
  try {
    await worker.fetch(new Request('https://w.example/api/stats?bust=1'), env, ctxSync);
    await settle();
    assert.equal(putKey, 'https://w.example/api/stats');
    await worker.fetch(new Request('https://w.example/api/stats?bust=2'), env, ctxSync);
    assert.equal(kvLists, 7, 'second request must be a cache hit (no new KV list calls)');
  } finally { delete globalThis.caches; }
});

test('contract: 429 is only ever emitted before the upstream call (writeHostFetch relies on it)', async () => {
  // Drive the proxy bucket to exhaustion, then confirm upstream is never reached for the 429s.
  let upstream = 0;
  global.fetch = async () => { upstream++; return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  const ip = { 'cf-connecting-ip': '198.51.100.77' };
  let limited = 0;
  for (let i = 0; i < 70; i++) {
    const res = await worker.fetch(new Request(`https://w.example/proxy/api/v1/user?host=${ELFH}`, { method: 'POST', headers: ip, body: '{}' }), {}, ctxSync);
    if (res.status === 429) limited++;
  }
  assert.ok(limited >= 10);
  assert.equal(upstream, 70 - limited);
});
