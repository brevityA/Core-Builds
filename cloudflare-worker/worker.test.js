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
