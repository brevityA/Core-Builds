import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import net from 'node:net';

import { classifyFeedUrl } from '../lib/lan.mjs';
import { parseClock, parseShot, projectClock, projectShot } from '../lib/clock.mjs';
import { buildPacket, checksumHex, createRtdDecoder, framePacket, parsePacket } from '../lib/rtd.mjs';
import { createBoard, createVenue } from '../lib/board.mjs';
import { toCoreLineJson, toCoreLineRss } from '../lib/feed.mjs';
import { buildStreamCommand, createFrameParser, parseAuthFrame } from '../lib/sportzcast.mjs';
import { pushFeedToCoreLine } from '../lib/pair.mjs';
import { createStadiumServer } from '../server.mjs';

const RUST_PACKET = Buffer.from(
  '00000000\x010042100000\x0216:0916:09   16:0916:09    s   \x0449',
  'latin1',
);

test('daktronics packet matches the published decoder vector', () => {
  const packet = parsePacket(RUST_PACKET);
  assert.equal(packet.ok, true);
  assert.equal(packet.startIndex, 0);
  assert.equal(packet.data.toString('latin1'), '16:0916:09   16:0916:09    s   ');
  assert.equal(checksumHex(RUST_PACKET, RUST_PACKET.indexOf(0x04)), '49');
});

test('framed RTD bytes land on the one-based basketball fields', () => {
  const decoder = createRtdDecoder();
  let raw = ' '.repeat(250);
  const put = (docStart, value) => {
    const at = docStart - 1;
    raw = raw.slice(0, at) + value + raw.slice(at + value.length);
  };
  put(1, ' 3:12');
  put(28, ' ');
  put(48, 'Oak Hill'.padEnd(20, ' '));
  put(68, 'Riverside'.padEnd(20, ' '));
  put(108, '  21');
  put(112, '  18');
  put(142, ' 2');
  put(144, '2nd ');
  const packet = buildPacket(0, raw);
  const parsed = parsePacket(packet);
  assert.equal(parsed.ok, true, parsed.reason);
  decoder.push(Buffer.from([0x00, 0x11]));
  const framed = framePacket(packet);
  decoder.push(framed.subarray(0, 40));
  decoder.push(framed.subarray(40));
  assert.equal(decoder.stats().packets, 1);
  assert.equal(decoder.field(108, 4).trim(), '21');
  const board = createBoard({ id: 'court-1', sport: 'basketball', league: 'GYM', channels: ['GYM'] });
  assert.equal(board.ingest(framePacket(packet), 'rtd', 1_000), true);
  const event = board.events(1_000)[0];
  assert.equal(event.away.name, 'Riverside');
  assert.equal(event.home.name, 'Oak Hill');
  assert.equal(event.away.score, '18');
  assert.equal(event.home.score, '21');
  assert.match(event.detail, /Q2|2nd/);
  assert.match(event.detail, /3:12/);
  assert.equal(event.status, 'live');
});

test('a bad checksum does not move the score', () => {
  const decoder = createRtdDecoder();
  const bad = Buffer.from(RUST_PACKET);
  bad[bad.length - 1] = 0x30;
  decoder.push(framePacket(bad));
  assert.equal(decoder.stats().packets, 0);
  assert.equal(decoder.stats().errors, 1);
});

test('sportzcast basketball digits become a core line event', () => {
  const board = createBoard({ id: 'bot-23', sport: 'basketball', venue: 'Main Arena' });
  const ok = board.ingest({
    EventId: 3,
    HomeTeamName: 'HOME',
    GuestTeamName: 'GUEST',
    HomeScoreHundreds: '0',
    HomeScoreTens: '2',
    HomeScoreOnes: '1',
    GuestScore: '018',
    Clock: '3:12',
    PeriodOrdinal: '2nd',
    ClockStatus: 'R',
    VenueName: 'Main Arena',
  }, 'sportzcast', 5_000);
  assert.equal(ok, true);
  const event = board.events(5_000)[0];
  assert.equal(event.home.score, '21');
  assert.equal(event.away.score, '18');
  assert.equal(event.venue, 'Main Arena');
  assert.equal(event.running, true);
  const later = board.events(7_000)[0];
  assert.equal(later.clock, '3:10');
});

test('football down and distance survive the shared prefix', () => {
  const board = createBoard({ id: 'field', sport: 'football', home: 'Riverside', guest: 'Lincoln' });
  let raw = ' '.repeat(240);
  const put = (docStart, value) => {
    const at = docStart - 1;
    raw = raw.slice(0, at) + value + raw.slice(at + value.length);
  };
  put(1, ' 8:04');
  put(108, '  14');
  put(112, '   7');
  put(142, ' 3');
  put(222, '2nd');
  put(225, ' 7');
  assert.equal(board.ingest(buildPacket(0, raw), 'rtd', 50), true);
  const event = board.events(50)[0];
  assert.equal(event.home.score, '14');
  assert.equal(event.away.score, '7');
  assert.match(event.detail, /2nd & 7/);
});

test('held console stops pretending the clock is moving', () => {
  const board = createBoard({ id: 'main', guest: 'Riverside', home: 'Oak Hill' });
  board.ingest({
    guest: 'Riverside', home: 'Oak Hill', guestScore: 1, homeScore: 0,
    clock: '1:00', period: 'Q4', running: true, status: 'live',
  }, 'venue', 0);
  const held = board.events(25_000)[0];
  assert.equal(held.signal, 'held');
  assert.match(held.detail, /HELD/);
  assert.equal(held.clock, '1:00');
});

test('json feed keeps a clock token the shipping parser can see', () => {
  const venue = createVenue({ venue: 'Riverside Gym', boards: [{ id: 'main' }] });
  venue.board('main').ingest({
    guest: 'Riverside', home: 'Oak Hill', guestScore: 18, homeScore: 21,
    clock: '3:12', period: 'Q2', status: 'live', channels: ['GYM'],
  }, 'venue', 10);
  const feed = toCoreLineJson(venue.events(10), { venue: venue.name, now: 10 });
  assert.equal(feed.events[0].status, 'live');
  assert.equal(feed.events[0].away.score, '18');
  assert.equal(feed.events[0].away.abbr, 'RIVE');
  assert.equal(feed.events[0].home.abbr, 'OAK');
  assert.match(feed.events[0].description, /3:12/);
  const rss = toCoreLineRss(venue.events(10), { venue: venue.name });
  assert.match(rss, /Riverside vs Oak Hill/);
  assert.match(rss, /3:12/);
  assert.doesNotMatch(rss, /<script/);
});

test('sportzcast frames and the stream command', () => {
  const frames = [];
  const parser = createFrameParser((payload) => frames.push(payload));
  parser.push(Buffer.from('\x02{"HomeScore":"1"}\x03tail\x02{"GuestScore"', 'latin1'));
  parser.push(Buffer.from(':"2"}\x03', 'latin1'));
  assert.deepEqual(frames, ['{"HomeScore":"1"}', '{"GuestScore":"2"}']);
  assert.equal(buildStreamCommand({ bot: 23, token: 'ABC' }), 'JB00023000000~ABC');
  assert.equal(parseAuthFrame('1|ok|TOKEN9').token, 'TOKEN9');
});

test('stadium allowlist does not open metadata or arbitrary LAN hosts', () => {
  assert.equal(classifyFeedUrl('http://192.168.1.20:8792/coreline.json').ok, false);
  assert.equal(classifyFeedUrl('http://192.168.1.20:8792/coreline.json', ['192.168.1.20']).lane, 'stadium');
  assert.equal(classifyFeedUrl('http://169.254.169.254/latest', ['169.254.169.254']).ok, false);
  assert.equal(classifyFeedUrl('https://scores.example/coreline.json').lane, 'public');
  assert.equal(classifyFeedUrl('file:///etc/passwd').ok, false);
});

test('pair client posts the form the TV already accepts', async () => {
  let body = '';
  const result = await pushFeedToCoreLine({
    host: 'tv.local',
    code: 'AB23CD',
    url: 'https://scores.example/coreline.json',
    label: 'Stadium',
    fetchImpl: async (_url, init) => {
      body = init.body;
      return { status: 200, text: async () => '<h1>Sent</h1><p>Look at the TV</p>' };
    },
  });
  assert.equal(result.ok, true);
  assert.match(body, /code=AB23CD/);
  assert.match(body, /url=https%3A%2F%2Fscores\.example%2Fcoreline\.json/);
});

test('clock projection counts down and refuses to invent time when the console is quiet', () => {
  assert.equal(parseClock('12:01').seconds, 721);
  assert.equal(projectClock('1:00', { running: true, direction: 'down', receivedAt: 0, now: 5_000 }), '0:55');
  assert.equal(projectClock('1:00', { running: true, direction: 'down', receivedAt: 0, now: 5_000, stale: true }), '1:00');
});

test('shot clock counts down, stops when held, and snaps on a new packet', () => {
  assert.equal(parseShot('14'), 14);
  assert.equal(parseShot('36'), null);
  assert.equal(projectShot('14', { running: true, receivedAt: 0, now: 5_000 }), '9');
  assert.equal(projectShot('14', { running: true, receivedAt: 0, now: 5_000, stale: true }), '14');
  assert.equal(projectShot('14', { running: false, receivedAt: 0, now: 5_000 }), '14');
  assert.equal(projectShot('2', { running: true, receivedAt: 0, now: 9_000 }), '0');

  const board = createBoard({ id: 'main', sport: 'basketball' });
  board.ingest({
    guest: 'Riverside', home: 'Oak Hill', guestScore: 18, homeScore: 21,
    clock: '3:12', period: 'Q2', detail: 'Q2 3:12 shot 14',
    running: true, status: 'live',
  }, 'venue', 0);
  const later = board.events(5_000)[0];
  assert.match(later.detail, /3:07/);
  assert.match(later.detail, /shot 9/);
  const held = board.events(25_000)[0];
  assert.equal(held.signal, 'held');
  assert.match(held.detail, /^HELD /);
  assert.match(held.detail, /shot 14/);
  assert.doesNotMatch(held.detail, /shot 9/);

  board.ingest({
    guest: 'Riverside', home: 'Oak Hill', guestScore: 18, homeScore: 21,
    clock: '3:12', detail: 'Q2 3:12 shot 14', running: false, status: 'live',
  }, 'venue', 30_000);
  assert.match(board.events(34_000)[0].detail, /shot 14/);

  board.ingest({
    guest: 'Riverside', home: 'Oak Hill', guestScore: 18, homeScore: 21,
    clock: '0:40', detail: 'Q2 0:40 shot 24', running: true, status: 'live',
  }, 'venue', 40_000);
  assert.match(board.events(40_000)[0].detail, /shot 24/);
  assert.doesNotMatch(board.events(40_000)[0].detail, /shot 14/);
});

test('http ingest serves a feed and refuses a public score push without a token', async () => {
  const app = createStadiumServer({ venue: 'Test Gym', boards: [{ id: 'main', sport: 'basketball' }] });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const { port } = app.server.address();
  const base = `http://127.0.0.1:${port}`;
  const posted = await fetch(`${base}/api/ingest/main`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      guest: 'Riverside', home: 'Oak Hill', guestScore: 4, homeScore: 6,
      clock: '9:10', period: 'Q1', status: 'live',
    }),
  });
  assert.equal(posted.status, 200);
  const feed = await (await fetch(`${base}/coreline.json`)).json();
  assert.equal(feed.events[0].home.score, '6');
  assert.equal(feed.venue, 'Test Gym');
  await app.close();

  const publicApp = createStadiumServer({
    venue: 'Closed',
    token: 'secret',
    boards: [{ id: 'main' }],
  });
  publicApp.server.listen(0, '127.0.0.1');
  await once(publicApp.server, 'listening');
  const closed = publicApp.server.address().port;
  const denied = await fetch(`http://127.0.0.1:${closed}/api/ingest/main`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(denied.status, 403);
  const allowed = await fetch(`http://127.0.0.1:${closed}/api/ingest/main`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
    body: JSON.stringify({ guest: 'A', home: 'B', guestScore: 1, homeScore: 2, status: 'live' }),
  });
  assert.equal(allowed.status, 200);
  await publicApp.close();
});

test('local sportzcast socket can be read by the frame parser through a server', async () => {
  const server = net.createServer((socket) => {
    socket.on('data', (buf) => {
      const text = buf.toString('utf8');
      if (text.startsWith('JB')) {
        socket.write(Buffer.from('\x02{"EventId":3,"HomeTeamName":"Oak Hill","GuestTeamName":"Riverside","HomeScore":"9","GuestScore":"7","Clock":"1:02","ClockStatus":"S","PeriodOrdinal":"4th"}\x03', 'utf8'));
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  const { startSportzcastClient } = await import('../lib/sportzcast-client.mjs');
  const seen = [];
  const client = startSportzcastClient({ host: '127.0.0.1', port, bot: 7, token: 'T' }, (json) => seen.push(json));
  await new Promise((resolve) => setTimeout(resolve, 200));
  client.stop();
  server.close();
  assert.equal(seen[0]?.HomeScore, '9');
  assert.equal(seen[0]?.GuestScore, '7');
});
