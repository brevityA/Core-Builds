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

test('paste: rejects non-JSON body', async () => {
  const env = makeEnv();
  const req = new Request('https://example.com/paste', {
    method: 'POST',
    body: 'not json',
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 400);
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
  const post = new Request('https://example.com/paste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
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
  const create = await worker.fetch(new Request('https://w.example/paste', { method:'POST', headers:{ 'Content-Type':'application/json', Origin:'https://brevitya.github.io' }, body:'{"a":1}' }), env, { waitUntil: ()=>{} });
  assert.equal(create.headers.get('X-Content-Type-Options'), 'nosniff');
  const { url } = await create.json();
  const read = await worker.fetch(new Request(url, { method:'GET' }), env, { waitUntil: ()=>{} });
  assert.equal(read.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(read.headers.get('Referrer-Policy'), 'no-referrer');
});
