import http from 'node:http';
import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createVenue } from './lib/board.mjs';
import { toCoreLineJson, toCoreLineRss } from './lib/feed.mjs';
import { isLanPeer } from './lib/lan.mjs';
import { pushFeedToCoreLine } from './lib/pair.mjs';
import { startSportzcastClient } from './lib/sportzcast-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 8792);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_BODY = 256_000;

const FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/display': 'display.html',
  '/display.html': 'display.html',
  '/mocks': 'mocks.html',
  '/mocks.html': 'mocks.html',
  '/css/app.css': 'css/app.css',
  '/fonts/barlow-condensed-600.woff2': 'fonts/barlow-condensed-600.woff2',
  '/fonts/barlow-condensed-700.woff2': 'fonts/barlow-condensed-700.woff2',
  '/fonts/barlow-condensed-800.woff2': 'fonts/barlow-condensed-800.woff2',
  '/fonts/outfit-var.woff2': 'fonts/outfit-var.woff2',
};

const FILE_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
};

export async function loadConfig(file = process.env.STADIUM_CONFIG) {
  if (!file) {
    return {
      venue: process.env.STADIUM_VENUE || 'Stadium',
      token: process.env.STADIUM_TOKEN || '',
      boards: [{ id: 'main', sport: 'basketball', label: 'Main board' }],
    };
  }
  const raw = JSON.parse(await readFile(file, 'utf8'));
  if (process.env.STADIUM_TOKEN) raw.token = process.env.STADIUM_TOKEN;
  return raw;
}

export function createStadiumServer(config = {}) {
  const venue = createVenue(config);
  const listeners = [];
  const clients = [];

  function authorized(req) {
    if (venue.token) {
      const header = req.headers.authorization || '';
      const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
      const alt = String(req.headers['x-stadium-token'] || '');
      return bearer === venue.token || alt === venue.token;
    }
    if (config.openIngest) return true;
    return isLanPeer(req.socket.remoteAddress);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (req.method === 'OPTIONS') {
        send(res, 204, '', cors());
        return;
      }
      if (url.pathname === '/api/health') {
        json(res, {
          ok: true,
          name: 'core-line-stadium-sync',
          venue: venue.name,
          boards: venue.boards().map((board) => board.id),
          feed: feedUrl(req),
        });
        return;
      }
      if (url.pathname === '/api/boards' && req.method === 'GET') {
        json(res, {
          ok: true,
          venue: venue.name,
          generatedAt: new Date().toISOString(),
          boards: venue.boards().map((board) => board.view()),
        });
        return;
      }
      if (url.pathname === '/coreline.json' && req.method === 'GET') {
        json(res, toCoreLineJson(venue.events(), { venue: venue.name }));
        return;
      }
      if (url.pathname === '/coreline.xml' && req.method === 'GET') {
        send(res, 200, toCoreLineRss(venue.events(), { venue: venue.name }), {
          'content-type': 'application/rss+xml; charset=utf-8',
          'cache-control': 'no-store',
          ...cors(),
        });
        return;
      }
      if (url.pathname === '/api/pair' && req.method === 'POST') {
        if (!authorized(req)) {
          json(res, { ok: false, reason: 'score pushes are LAN-only until a token is set' }, 403);
          return;
        }
        const body = await readBody(req);
        const payload = JSON.parse(body || '{}');
        const result = await pushFeedToCoreLine({
          host: payload.host,
          port: Number(payload.port || 8791),
          code: payload.code,
          url: payload.url || feedUrl(req),
          label: payload.label || venue.name,
        });
        json(res, result, result.ok ? 200 : 400);
        return;
      }
      const ingest = url.pathname.match(/^\/api\/ingest\/([a-z0-9-]{1,32})(?:\/(rtd))?$/);
      if (ingest && (req.method === 'POST' || req.method === 'PUT')) {
        if (!authorized(req)) {
          json(res, { ok: false, reason: 'score pushes are LAN-only until a token is set' }, 403);
          return;
        }
        const board = venue.ensure(ingest[1]);
        if (!board) {
          json(res, { ok: false, reason: 'too many boards' }, 400);
          return;
        }
        const raw = await readBody(req);
        const format = ingest[2] === 'rtd' ? 'rtd' : (url.searchParams.get('format') || 'auto');
        const payload = format === 'rtd' || looksBinary(req)
          ? Buffer.from(raw, 'latin1')
          : JSON.parse(raw || '{}');
        const ok = board.ingest(payload, format);
        json(res, { ok, error: board.lastError || null, events: board.events() }, ok ? 200 : 400);
        return;
      }
      if (req.method === 'GET' && FILES[url.pathname]) {
        const rel = FILES[url.pathname];
        const file = await readFile(path.join(PUBLIC_DIR, rel));
        const ext = path.extname(rel);
        send(res, 200, file, {
          'content-type': FILE_TYPES[ext] || 'application/octet-stream',
          'cache-control': ext === '.woff2' ? 'public, max-age=86400' : 'no-store',
        });
        return;
      }
      send(res, 404, 'Not found');
    } catch (err) {
      json(res, { ok: false, reason: err?.message || 'bad request' }, 400);
    }
  });

  function bindListeners() {
    for (const boardConfig of config.boards || []) {
      const board = venue.board(boardConfig.id);
      if (!board) continue;
      if (boardConfig.udpPort) listeners.push(bindUdp(board, Number(boardConfig.udpPort)));
      if (boardConfig.tcpPort) listeners.push(bindTcp(board, Number(boardConfig.tcpPort)));
      if (boardConfig.sportzcast?.host || boardConfig.sportzcast?.cloud) {
        clients.push(startSportzcastClient(boardConfig.sportzcast, (payload) => {
          board.ingest(payload, 'sportzcast');
        }));
      }
    }
  }

  function close() {
    for (const stop of listeners) stop();
    for (const client of clients) client.stop();
    return new Promise((resolve) => server.close(() => resolve()));
  }

  return { server, venue, bindListeners, close, feedUrl };
}

function bindUdp(board, port) {
  const socket = dgram.createSocket('udp4');
  socket.on('message', (msg) => board.ingest(msg, 'rtd'));
  socket.on('error', () => {});
  socket.bind(port);
  return () => socket.close();
}

function bindTcp(board, port) {
  const socket = net.createServer((conn) => {
    conn.on('data', (chunk) => board.ingest(chunk, 'rtd'));
  });
  socket.listen(port);
  return () => socket.close();
}

function feedUrl(req) {
  const host = advertisedHost(req);
  return `http://${host}/coreline.json`;
}

function advertisedHost(req) {
  const header = req?.headers?.host;
  if (header && !header.startsWith('0.0.0.0')) return header;
  return `${lanIpv4() || '127.0.0.1'}:${PORT}`;
}

export function lanIpv4() {
  const nets = os.networkInterfaces();
  const found = [];
  for (const addrs of Object.values(nets)) {
    for (const addr of addrs || []) {
      const v4 = addr.family === 'IPv4' || addr.family === 4;
      if (!v4 || addr.internal) continue;
      if (!isLanPeer(addr.address)) continue;
      if (addr.address.startsWith('169.254.')) continue;
      found.push(addr.address);
    }
  }
  return found[0] || null;
}

function looksBinary(req) {
  const type = String(req.headers['content-type'] || '');
  return type.includes('octet-stream');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
    req.on('error', reject);
  });
}

function cors() {
  return { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization, x-stadium-token', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' };
}

function json(res, payload, status = 200) {
  send(res, status, JSON.stringify(payload), {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...cors(),
  });
}

function send(res, status, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, { 'content-length': buf.length, ...headers });
  res.end(buf);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const config = await loadConfig();
  if (process.env.STADIUM_OPEN_INGEST === '1') config.openIngest = true;
  const app = createStadiumServer(config);
  if (process.env.STADIUM_DEMO === '1') {
    seedDemoBoard(app.venue);
    setInterval(() => refreshDemo(app.venue), 1000);
  }
  app.bindListeners();
  app.server.listen(PORT, HOST, () => {
    const ip = lanIpv4();
    console.log(`Stadium sync on http://${HOST}:${PORT}`);
    if (ip) console.log(`Core Line feed  http://${ip}:${PORT}/coreline.json`);
    if (ip) console.log(`Venue display   http://${ip}:${PORT}/display`);
    if (ip) console.log(`Layout mocks    http://${ip}:${PORT}/mocks`);
  });
}

function seedDemoBoard(venue) {
  demoIngest(venue, 'main', {
    sport: 'basketball',
    label: 'Court 1',
    guest: 'Riverside',
    home: 'Oak Hill',
    guestScore: 18,
    homeScore: 21,
    clock: '3:12',
    period: 'Q2',
    detail: 'Q2 3:12 shot 14',
    running: true,
  });
  demoIngest(venue, 'court2', {
    sport: 'basketball',
    label: 'Court 2',
    guest: 'Lincoln',
    home: 'Cedar',
    guestScore: 12,
    homeScore: 9,
    clock: '6:40',
    period: 'Q1',
    detail: 'Q1 6:40',
    running: true,
  });
  demoIngest(venue, 'field', {
    sport: 'football',
    label: 'Field',
    guest: 'Riverside',
    home: 'Lincoln',
    guestScore: 14,
    homeScore: 7,
    clock: '8:04',
    period: 'Q3',
    detail: 'Q3 8:04 2nd & 7',
    running: false,
  });
}

function demoIngest(venue, id, game) {
  const board = venue.ensure(id, { sport: game.sport, label: game.label, home: game.home, guest: game.guest });
  board.profile.label = game.label;
  board.profile.league = 'GYM';
  board.profile.channels = ['GYM'];
  board.profile.home = game.home;
  board.profile.guest = game.guest;
  board.ingest({ ...game, status: 'live', channels: ['GYM'] }, 'venue');
}

function refreshDemo(venue) {
  for (const id of ['main', 'court2']) {
    const board = venue.board(id);
    const current = board?.events()[0];
    if (!current) continue;
    board.ingest({
      sport: current.sport,
      guest: current.away.name,
      home: current.home.name,
      guestScore: current.away.score,
      homeScore: current.home.score,
      clock: current.clock,
      period: (current.detail || '').replace(/^(HELD |NO SIGNAL · )/, '').split(' ')[0] || 'Q2',
      detail: current.detail.replace(/^(HELD |NO SIGNAL · )/, ''),
      running: true,
      status: 'live',
      channels: current.channels,
    }, 'venue');
  }
}
