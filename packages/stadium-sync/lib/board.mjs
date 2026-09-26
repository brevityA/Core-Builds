import { projectClock, projectShot } from './clock.mjs';
import { createRtdDecoder } from './rtd.mjs';
import { readFields } from './sports.mjs';
import {
  detectFormat,
  eventsFromSlate,
  snapshotFromRtd,
  snapshotFromSportzcast,
  snapshotFromVenue,
} from './normalize.mjs';

const HOLD_MS = 20_000;
const LOST_MS = 10 * 60_000;

export function createBoard(config = {}) {
  const id = String(config.id || 'main').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'main';
  const profile = {
    id,
    label: config.label || config.name || id,
    sport: config.sport || 'basketball',
    league: config.league || '',
    home: config.home || config.homeName || '',
    guest: config.guest || config.away || config.guestName || '',
    homeAbbr: config.homeAbbr || '',
    guestAbbr: config.guestAbbr || '',
    venue: config.venue || '',
    channels: config.channels || [],
    feed: config.label || config.venue || 'Stadium',
  };
  const decoder = createRtdDecoder();
  let snapshot = null;
  let slate = [];
  let kind = 'controller';
  let lastError = '';

  function remember(next, format) {
    if (!next) return false;
    snapshot = next;
    kind = format === 'slate' ? 'slate' : 'controller';
    lastError = '';
    return true;
  }

  return {
    id,
    profile,
    decoder,
    get kind() { return kind; },
    get lastError() { return lastError; },
    ingest(payload, format, now = Date.now()) {
      const use = format && format !== 'auto' ? format : detectFormat(payload);
      try {
        if (use === 'rtd') {
          decoder.push(payload);
          const fields = readFields(decoder, profile.sport);
          return remember(snapshotFromRtd(fields, profile, now), 'rtd');
        }
        if (use === 'sportzcast') {
          return remember(snapshotFromSportzcast(payload, profile, now), 'sportzcast');
        }
        if (use === 'slate') {
          const events = eventsFromSlate(payload, profile, now);
          if (!events.length) {
            lastError = 'no games in slate';
            return false;
          }
          slate = events;
          snapshot = events[0];
          kind = 'slate';
          lastError = '';
          return true;
        }
        return remember(snapshotFromVenue(payload, profile, now), 'venue');
      } catch (err) {
        lastError = err?.message || 'ingest failed';
        return false;
      }
    },
    events(now = Date.now()) {
      if (kind === 'slate') {
        return slate.map((event) => present(event, now)).filter(Boolean);
      }
      const event = present(snapshot, now);
      return event ? [event] : [];
    },
    view(now = Date.now()) {
      return {
        id,
        label: profile.label,
        sport: profile.sport,
        kind,
        lastError,
        packets: decoder.stats().packets,
        events: this.events(now),
      };
    },
  };
}

function present(snapshot, now) {
  if (!snapshot) return null;
  const received = snapshot.receivedAt ?? now;
  const age = now - received;
  const stale = age > HOLD_MS;
  const lost = age > LOST_MS;
  const clock = projectClock(snapshot.clock, {
    running: snapshot.running,
    direction: snapshot.direction,
    receivedAt: snapshot.receivedAt,
    now,
    stale,
  });
  let detail = snapshot.detail || '';
  if (snapshot.clock && clock && clock !== snapshot.clock) {
    detail = detail.replace(snapshot.clock, clock);
  }
  detail = detail.replace(/\bshot\s+(\d{1,2})\b/i, (token, num) => {
    const next = projectShot(num, {
      running: snapshot.running,
      receivedAt: snapshot.receivedAt,
      now,
      stale,
    });
    return next === '' ? token : `shot ${next}`;
  });
  if (lost) detail = detail ? `NO SIGNAL · ${detail}` : 'NO SIGNAL';
  else if (stale) detail = detail ? `HELD ${detail}` : 'HELD';
  return {
    ...snapshot,
    clock,
    detail,
    signal: lost ? 'lost' : stale ? 'held' : 'ok',
    ageMs: age,
  };
}

export function createVenue(config = {}) {
  const boards = new Map();
  const list = Array.isArray(config.boards) && config.boards.length
    ? config.boards
    : [{ id: 'main', sport: config.sport || 'basketball' }];
  for (const boardConfig of list) {
    const board = createBoard({ ...boardConfig, venue: boardConfig.venue || config.venue || '' });
    boards.set(board.id, board);
  }
  return {
    name: config.venue || config.name || 'Stadium',
    token: config.token || '',
    board(id) {
      return boards.get(id) || null;
    },
    ensure(id, extra = {}) {
      const key = String(id || 'main').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'main';
      if (boards.has(key)) return boards.get(key);
      if (boards.size >= 24) return null;
      const board = createBoard({ id: key, venue: config.venue || '', ...extra });
      boards.set(key, board);
      return board;
    },
    boards() {
      return [...boards.values()];
    },
    events(now = Date.now()) {
      return this.boards().flatMap((board) => board.events(now));
    },
  };
}
