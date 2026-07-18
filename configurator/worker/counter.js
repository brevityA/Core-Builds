// Core Builds Configurator — Usage Counter Worker
// Deploy to Cloudflare Workers with a KV namespace bound as STATS
//
// Setup:
//   1. Create a KV namespace called "CB_STATS"
//   2. Create a Worker and paste this file
//   3. Bind the KV namespace as STATS in Worker settings
//   4. Set ALLOWED_ORIGIN to your configurator's domain
//   5. Update USAGE_BEACON_URL in index_src.html to: https://<worker>.workers.dev
//
// Endpoints:
//   GET  /api/stats     → { visits, generates }
//   POST /api/visit     → increments visit counter
//   POST /api/generate  → increments generate counter (accepts JSON body with metadata)

const ALLOWED_ORIGINS = [
  'https://core-builds-configurator.pages.dev',
  'https://configurator.corebuilds.app',
  'https://core-builds-cors-proxy.tlorenzato26.workers.dev',
  'http://localhost:8787',
  'null',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

async function increment(kv, key) {
  const raw = await kv.get(key);
  const val = (parseInt(raw, 10) || 0) + 1;
  await kv.put(key, val.toString());
  return val;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const [visits, generates] = await Promise.all([
        env.STATS.get('visits'),
        env.STATS.get('generates'),
      ]);
      return Response.json(
        { visits: parseInt(visits, 10) || 0, generates: parseInt(generates, 10) || 0 },
        { headers: cors }
      );
    }

    if (url.pathname === '/api/visit' && request.method === 'POST') {
      const val = await increment(env.STATS, 'visits');
      return Response.json({ visits: val }, { headers: cors });
    }

    if (url.pathname === '/api/generate' && request.method === 'POST') {
      const val = await increment(env.STATS, 'generates');
      return Response.json({ generates: val }, { headers: cors });
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
};
