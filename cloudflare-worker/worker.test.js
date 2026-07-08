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
