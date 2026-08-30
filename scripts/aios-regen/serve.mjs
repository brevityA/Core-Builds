#!/usr/bin/env node
/**
 * Local UI + API for aios-regen.
 * Binds 0.0.0.0 so the Arena live preview works.
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import {
  ROOT,
  extractSource,
  extractHost,
  compact,
  diffContracts,
  loadSnapshot,
  saveSnapshot,
  mergeContracts,
  DEFAULT_HOST,
  assertPublicHttps,
} from './contract.mjs';
import { generateTemplate, healTemplate, defaultRecipe, STACKS, DEVICE_PROFILES } from './generate.mjs';

const PORT = Number(process.env.PORT || 3333);
const HOST = '0.0.0.0';

const DEFAULT_HOST_ORIGIN = assertPublicHttps(DEFAULT_HOST).origin;
const ALLOWED_HOST_ORIGINS = new Set(
  (process.env.AIOS_ALLOWED_HOSTS || DEFAULT_HOST_ORIGIN)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => assertPublicHttps(s).origin),
);
ALLOWED_HOST_ORIGINS.add(DEFAULT_HOST_ORIGIN);

function normalizeAndAuthorizeHost(url) {
  const candidate = String(url || DEFAULT_HOST_ORIGIN).trim();
  const origin = assertPublicHttps(candidate).origin;
  if (!ALLOWED_HOST_ORIGINS.has(origin)) {
    throw new Error('host not allowed');
  }
  return origin;
}

let sourceCache = { at: 0, value: null };
let hostCache = new Map();
const CACHE_MS = 10 * 60 * 1000;

async function getSource({ force = false } = {}) {
  if (!force && sourceCache.value && Date.now() - sourceCache.at < CACHE_MS) return sourceCache.value;
  const value = await extractSource();
  sourceCache = { at: Date.now(), value };
  return value;
}

async function getHost(url, { force = false } = {}) {
  const key = normalizeAndAuthorizeHost(url);
  const hit = hostCache.get(key);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = await extractHost(key);
  hostCache.set(key, { at: Date.now(), value });
  return value;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > 2_000_000) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolveBody({});
      try {
        resolveBody(JSON.parse(raw));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  const path = url.pathname;
  const q = url.searchParams;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    res.end();
    return;
  }

  try {
    if (path === '/api/health') {
      return send(res, 200, { ok: true });
    }

    if (path === '/api/meta') {
      return send(res, 200, {
        defaultHost: DEFAULT_HOST,
        stacks: STACKS,
        devices: Object.keys(DEVICE_PROFILES),
        hasSnapshot: !!loadSnapshot(),
        snapshot: loadSnapshot()
          ? {
              fingerprint: loadSnapshot().fingerprint,
              extractedAt: loadSnapshot().extractedAt,
              counts: loadSnapshot().counts,
              commit: loadSnapshot().commit,
            }
          : null,
      });
    }

    if (path === '/api/extract/source' && req.method === 'GET') {
      const full = await getSource({ force: q.get('force') === '1' });
      return send(res, 200, compact(full));
    }

    if (path === '/api/extract/host' && req.method === 'GET') {
      const host = q.get('url') || DEFAULT_HOST;
      assertPublicHttps(host);
      const full = await getHost(host, { force: q.get('force') === '1' });
      return send(res, 200, compact(full));
    }

    if (path === '/api/diff' && req.method === 'GET') {
      const pinned = loadSnapshot();
      if (!pinned) return send(res, 404, { error: 'No snapshot. Extract source and pin first.' });
      const live = compact(await getSource({ force: q.get('force') === '1' }));
      return send(res, 200, diffContracts(pinned, live));
    }

    if (path === '/api/pin' && req.method === 'POST') {
      const full = await getSource({ force: true });
      const saved = saveSnapshot(full);
      return send(res, 200, { path: saved, fingerprint: full.fingerprint, counts: compact(full).counts });
    }

    if (path === '/api/generate' && req.method === 'POST') {
      const body = await readBody(req);
      const recipe = { ...defaultRecipe(), ...(body.recipe || body) };
      let source = loadSnapshot();
      let host = null;
      if (body.includeSource !== false) {
        try {
          source = source || compact(await getSource());
        } catch (err) {
          /* host can still generate */
        }
      }
      const hostUrl = body.host || DEFAULT_HOST;
      try {
        host = await getHost(hostUrl);
      } catch (err) {
        if (!source) throw err;
      }
      const contract = mergeContracts(source, host);
      const result = generateTemplate(recipe, contract);
      return send(res, 200, result);
    }

    if (path === '/api/heal' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.template) return send(res, 400, { error: 'template required' });
      let source = loadSnapshot();
      let host = null;
      try {
        host = await getHost(body.host || DEFAULT_HOST);
      } catch { /* optional */ }
      if (!source) {
        try { source = compact(await getSource()); } catch { /* optional */ }
      }
      const contract = mergeContracts(source, host);
      return send(res, 200, healTemplate(body.template, contract));
    }

    send(res, 404, { error: 'not found' });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
}

const webRoot = resolve(ROOT, 'web');

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);

  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  const abs = resolve(webRoot, '.' + file);
  if (!abs.startsWith(webRoot) || !existsSync(abs)) {
    return send(res, 404, 'Not found', 'text/plain');
  }
  const type = MIME[extname(abs)] || 'application/octet-stream';
  send(res, 200, readFileSync(abs), type);
});

server.listen(PORT, HOST, () => {
  console.log(`aios-regen listening on http://${HOST}:${PORT}`);
});
