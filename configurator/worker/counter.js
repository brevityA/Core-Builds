// Core Builds Configurator — Usage Counter Worker
//
// ⚠️  DEPRECATED — do not deploy or extend this worker.
// Its endpoints (/api/stats, /api/visit, /api/generate) are now served by the
// consolidated worker in ../../cloudflare-worker/worker.js, which the configurator
// points at (COUNTER_URL / CORS_PROXY). This legacy worker also writes a DIFFERENT
// KV key schema (stat_service_*, stat_res_*, stat_device_*) into the SAME STATS
// namespace, so those keys are dead writes that nothing reads. It is kept here only
// for reference; the hardening (rate limits, size caps, no-store, edge-wide counters)
// lives in the consolidated worker. If you still run this worker, repoint the
// configurator at the consolidated worker and delete this one.
//
// Deploy to Cloudflare Workers with a KV namespace bound as STATS
//
// Setup:
//   1. Create a KV namespace called "CB_STATS"
//   2. Create a Worker and paste this file
//   3. Bind the KV namespace as STATS in Worker settings
//   4. Set ALLOWED_ORIGIN in your wrangler.toml [vars] to your configurator's domain
//   5. Update USAGE_BEACON_URL in index_src.html to: https://<worker>.workers.dev
//
// Endpoints:
//   GET  /api/stats     → { visits, generates, service: {}, res: {}, device: {} }
//   POST /api/visit     → increments visit counter
//   POST /api/generate  → increments generate counter (accepts JSON body with metadata)

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '*';
  const allowed = env?.ALLOWED_ORIGIN || '*';
  let corsOrigin = '*';
  
  if (allowed === '*' || origin === allowed || allowed.split(',').map(x => x.trim()).includes(origin)) {
    corsOrigin = origin;
  }
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
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
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const keys = ['visits', 'generates'];
      const svcKeys = ['torbox-pro','torbox-ess','realdebrid','alldebrid','easynews','premiumize','debridlink','offcloud','debridio','easydebrid','pikpak','seedr','p2p','http'];
      const resKeys = ['4k','1080p','720p','ultrawide'];
      const deviceKeys = ['generic','samsung','shield','firestick-hd','firestick-4kmax','lgtv','appletv-new','appletv-old','windows','googletv','roku','chromecast','sony','ipad','projector','onn','xiaomi','xiaomi-3rd'];
      
      const allKeys = [
        ...keys,
        ...svcKeys.map(k => `stat_service_${k}`),
        ...resKeys.map(k => `stat_res_${k}`),
        ...deviceKeys.map(k => `stat_device_${k}`)
      ];

      // Cache API / TTL read optimization to preserve KV read quotas!
      const vals = await Promise.all(
        allKeys.map(k => env.STATS.get(k, { cacheTtl: 60 }))
      );

      const stats = {};
      allKeys.forEach((k, i) => {
        const v = parseInt(vals[i], 10) || 0;
        if (k === 'visits' || k === 'generates') {
          stats[k] = v;
        } else {
          const parts = k.split('_');
          const cat = parts[1]; // 'service', 'res', or 'device'
          const name = parts.slice(2).join('_');
          if (!stats[cat]) stats[cat] = {};
          stats[cat][name] = v;
        }
      });

      return Response.json(stats, { headers: cors });
    }

    if (url.pathname === '/api/visit' && request.method === 'POST') {
      const val = await increment(env.STATS, 'visits');
      return Response.json({ visits: val }, { headers: cors });
    }

    if (url.pathname === '/api/generate' && request.method === 'POST') {
      const val = await increment(env.STATS, 'generates');
      
      // Parse optional telemetry body to track aggregate analytics safely & anonymously!
      try {
        const body = await request.json();
        if (body && typeof body === 'object') {
          const service = body.service;
          const device = body.device;
          const res = body.resolution;
          const p = [];
          if (service) p.push(increment(env.STATS, `stat_service_${service}`));
          if (device) p.push(increment(env.STATS, `stat_device_${device}`));
          if (res) p.push(increment(env.STATS, `stat_res_${res}`));
          if (p.length) await Promise.all(p);
        }
      } catch(err) {
        // Fallback gracefully if no body or invalid JSON
      }

      return Response.json({ generates: val }, { headers: cors });
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
};
