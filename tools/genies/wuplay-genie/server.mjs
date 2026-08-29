import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8000);
const API_ORIGIN = 'https://api.wuplay.app';
const MAX_BODY_BYTES = 1024 * 1024;
const PROFILE_KEY = '[A-Za-z0-9]{6}';
const RESOURCE_ID = '[A-Za-z0-9._~-]+';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8'
};

function securityHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}

function send(res, status, body, contentType = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, { ...securityHeaders(contentType), ...extra });
  res.end(body);
}

function isAllowedProxyRoute(method, pathname) {
  if (method === 'GET' && (pathname === '/app/version' || new RegExp(`^/sync/${PROFILE_KEY}$`).test(pathname))) return true;
  if (method === 'POST' && pathname === '/devices/register') return true;
  if (method === 'PATCH' && new RegExp(`^/sync/${PROFILE_KEY}/(?:hubs|screens)/${RESOURCE_ID}$`).test(pathname)) return true;
  if (method === 'PATCH' && new RegExp(`^/sync/${PROFILE_KEY}/profile$`).test(pathname)) return true;
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function proxyWuplay(req, res, parsed) {
  const upstreamQuery = new URLSearchParams(parsed.searchParams);
  upstreamQuery.delete('host');
  const upstreamPathname = parsed.pathname.slice('/api/proxy'.length) || '/';

  if (!isAllowedProxyRoute(req.method, upstreamPathname)) return send(res, 405, 'WuPlay route or method is not allowlisted.');

  const upstreamUrl = new URL(upstreamPathname, API_ORIGIN);
  if (upstreamUrl.origin !== new URL(API_ORIGIN).origin) return send(res, 403, 'Proxy target outside allowed origin.');
  upstreamUrl.search = upstreamQuery.toString();

  let body;
  try {
    body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
  } catch (error) {
    return send(res, 413, error.message);
  }

  const headers = {};
  for (const name of ['authorization', 'x-wuplay-profile-key', 'content-type', 'accept']) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const upstream = await fetch(upstreamUrl.href, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
      redirect: 'error'
    });
    const data = Buffer.from(await upstream.arrayBuffer());
    const responseType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.writeHead(upstream.status, {
      ...securityHeaders(responseType),
      'Content-Length': data.length
    });
    res.end(data);
  } catch (error) {
    send(res, error.name === 'AbortError' ? 504 : 502, 'WuPlay API bridge failed.');
  } finally {
    clearTimeout(timer);
  }
}

async function serveStatic(req, res, pathname) {
  let relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (relative.includes('..') || relative.includes('\\')) return send(res, 400, 'Bad path.');

  let filePath = path.resolve(ROOT, relative);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) return send(res, 403, 'Forbidden.');

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME[ext] || 'application/octet-stream');
  } catch (error) {
    if (error.code === 'ENOENT' && req.headers.accept?.includes('text/html')) {
      try {
        const data = await readFile(path.join(ROOT, 'index.html'));
        send(res, 200, data, MIME['.html']);
      } catch {
        send(res, 404, 'Not found.');
      }
    } else {
      send(res, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found.' : 'Server error.');
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return send(res, 400, 'Bad request.');
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS' && parsed.pathname.startsWith('/api/proxy/')) {
    return send(res, 204, '', 'text/plain; charset=utf-8', {
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,X-Wuplay-Profile-Key,Content-Type,Accept'
    });
  }

  if (parsed.pathname.startsWith('/api/proxy/')) return proxyWuplay(req, res, parsed);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed.');
  return serveStatic(req, res, parsed.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`WuPlay Genie listening on http://0.0.0.0:${PORT}`);
  console.log('Optional same-origin WuPlay bridge: /api/proxy/* (allowlisted, no request logging)');
});
