/**
 * Turn venue payloads into one canonical board snapshot.
 * Guest/visitor is `away` so the crawl matches Core Line (away score-score home).
 */

import { clockDirection } from './clock.mjs';
import {
  abbreviate,
  cleanScore,
  cleanText,
  clockRunningFromFields,
  detailFromFields,
  namesFromFields,
} from './sports.mjs';

export const SPORTZCAST_SPORTS = {
  1: 'baseball',
  2: 'football',
  3: 'basketball',
  4: 'softball',
  5: 'hockey',
  6: 'volleyball',
  7: 'lacrosse',
  8: 'soccer',
  12: 'wrestling',
  24: 'waterpolo',
  28: 'generic',
  29: 'futsal',
  30: 'handball',
};

export function detectFormat(payload) {
  if (Buffer.isBuffer(payload)) return 'rtd';
  if (!payload || typeof payload !== 'object') return 'venue';
  if (Array.isArray(payload)) return 'slate';
  if (Array.isArray(payload.games) || Array.isArray(payload.events) || Array.isArray(payload.items)) {
    return 'slate';
  }
  if (
    payload.HomeTeamName != null
    || payload.GuestTeamName != null
    || payload.EventId != null
    || payload.HomeScoreHundreds != null
    || payload.BotNumber != null
  ) return 'sportzcast';
  return 'venue';
}

export function snapshotFromRtd(fields, profile = {}, now = Date.now()) {
  const names = namesFromFields(fields, profile);
  const homeScore = cleanScore(fields.homeScore);
  const guestScore = cleanScore(fields.guestScore);
  if (homeScore == null && guestScore == null && !cleanText(fields.clock) && !cleanText(fields.homeName)) {
    return null;
  }
  return baseSnapshot({
    profile,
    now,
    sport: fields.sport || profile.sport || 'basketball',
    awayName: names.guestName,
    homeName: names.homeName,
    awayAbbr: names.guestAbbr,
    homeAbbr: names.homeAbbr,
    awayScore: guestScore ?? '0',
    homeScore: homeScore ?? '0',
    detail: detailFromFields(fields),
    clock: cleanText(fields.clock),
    running: clockRunningFromFields(fields),
    status: 'live',
  });
}

export function snapshotFromSportzcast(raw, profile = {}, now = Date.now()) {
  const obj = unwrap(raw);
  if (!obj) return null;
  const sport = profile.sport
    || SPORTZCAST_SPORTS[Number(obj.EventId)]
    || 'generic';
  const awayName = firstText(obj.GuestTeamName, obj.AwayTeamName, profile.guest, 'Guest');
  const homeName = firstText(obj.HomeTeamName, profile.home, 'Home');
  const awayScore = sideScore(obj, 'Guest') ?? sideScore(obj, 'Away');
  const homeScore = sideScore(obj, 'Home');
  if (awayScore == null && homeScore == null && !cleanText(obj.Clock)) return null;
  const clock = cleanText(obj.Clock || obj.FullClock);
  const period = cleanText(obj.PeriodOrdinal || obj.Period || obj.HalfOrdinal || obj.Inning);
  const half = cleanText(obj.InningHalf || obj.TopBottom || obj.InningIndicator);
  const detail = [half, period, clock].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const running = String(obj.ClockStatus || '').toUpperCase() === 'R';
  const status = /final|complete|ended/i.test(String(obj.Status || obj.GameStatus || ''))
    ? 'final'
    : 'live';
  return baseSnapshot({
    profile,
    now,
    sport,
    awayName,
    homeName,
    awayAbbr: profile.guestAbbr,
    homeAbbr: profile.homeAbbr,
    awayScore: awayScore ?? '0',
    homeScore: homeScore ?? '0',
    detail: detail || clock,
    clock,
    running: status === 'live' && running,
    status,
    venue: cleanText(obj.VenueName) || profile.venue,
  });
}

export function snapshotFromVenue(raw, profile = {}, now = Date.now()) {
  const obj = unwrap(raw) || {};
  const sport = String(obj.sport || profile.sport || 'basketball').toLowerCase();
  const awayName = firstText(obj.guest, obj.away, obj.visitor, obj.guestName, obj.awayName, profile.guest, 'Guest');
  const homeName = firstText(obj.home, obj.homeName, profile.home, 'Home');
  const awayScore = scoreish(obj.guestScore ?? obj.awayScore ?? obj.visitorScore);
  const homeScore = scoreish(obj.homeScore);
  const clock = cleanText(obj.clock);
  const period = cleanText(obj.period || obj.quarter || obj.half);
  const detail = cleanText(obj.detail) || [period, clock].filter(Boolean).join(' ');
  const status = normalizeStatus(obj.status) || (clock || awayScore != null ? 'live' : 'upcoming');
  if (status === 'upcoming' && awayScore == null && homeScore == null && !clock && awayName === 'Guest') {
    return null;
  }
  const running = obj.running === true || obj.clockRunning === true;
  return baseSnapshot({
    profile,
    now,
    sport,
    awayName,
    homeName,
    awayAbbr: obj.guestAbbr || obj.awayAbbr || profile.guestAbbr,
    homeAbbr: obj.homeAbbr || profile.homeAbbr,
    awayScore: awayScore ?? (status === 'upcoming' ? null : '0'),
    homeScore: homeScore ?? (status === 'upcoming' ? null : '0'),
    detail,
    clock,
    running: status === 'live' && running,
    status,
    venue: cleanText(obj.venue) || profile.venue,
    channels: obj.channels || profile.channels,
  });
}

export function eventsFromSlate(raw, profile = {}, now = Date.now()) {
  const rows = Array.isArray(raw)
    ? raw
    : raw?.games || raw?.events || raw?.items || [];
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 100).map((row, index) => {
    if (!row || typeof row !== 'object') return null;
    if (row.away && row.home && (row.status || row.league)) {
      return coreLineRow(row, profile, now, index);
    }
    const snap = snapshotFromSportzcast(row, profile, now) || snapshotFromVenue(row, profile, now);
    if (!snap) return null;
    snap.id = `${profile.id || 'slate'}-${index}`;
    return snap;
  }).filter(Boolean);
}

function coreLineRow(row, profile, now, index) {
  const away = teamish(row.away);
  const home = teamish(row.home);
  return baseSnapshot({
    profile,
    now,
    sport: profile.sport || 'generic',
    awayName: away.name,
    homeName: home.name,
    awayAbbr: away.abbr,
    homeAbbr: home.abbr,
    awayScore: away.score,
    homeScore: home.score,
    detail: cleanText(row.detail),
    clock: '',
    running: false,
    status: normalizeStatus(row.status) || 'live',
    venue: cleanText(row.venue) || profile.venue,
    channels: row.channels || profile.channels,
    id: row.id || `${profile.id || 'slate'}-${index}`,
    league: row.league || profile.league,
  });
}

function teamish(value) {
  if (!value) return { name: 'TBD', abbr: 'TBD', score: null };
  if (typeof value === 'string') return { name: value, abbr: '', score: null };
  return {
    name: value.name || value.abbr || 'TBD',
    abbr: value.abbr || '',
    score: value.score == null ? null : String(value.score),
  };
}

function baseSnapshot(input) {
  const sport = input.sport || 'generic';
  const status = input.status || 'live';
  const awayScore = input.awayScore == null ? null : String(input.awayScore);
  const homeScore = input.homeScore == null ? null : String(input.homeScore);
  let awayWinner = false;
  let homeWinner = false;
  if (status === 'final' && awayScore != null && homeScore != null) {
    const a = Number(awayScore);
    const h = Number(homeScore);
    if (a > h) awayWinner = true;
    if (h > a) homeWinner = true;
  }
  const league = cleanText(input.league || input.profile.league) || defaultLeague(sport);
  return {
    id: input.id || `stadium:${input.profile.id || 'main'}`,
    boardId: input.profile.id || 'main',
    source: 'stadium',
    sport,
    league,
    status,
    detail: input.detail || '',
    clock: input.clock || '',
    running: Boolean(input.running),
    direction: clockDirection(sport),
    receivedAt: input.now,
    away: {
      name: input.awayName,
      abbr: abbreviate(input.awayName, input.awayAbbr),
      score: awayScore,
      logo: null,
      winner: awayWinner,
    },
    home: {
      name: input.homeName,
      abbr: abbreviate(input.homeName, input.homeAbbr),
      score: homeScore,
      logo: null,
      winner: homeWinner,
    },
    channels: asList(input.channels),
    venue: cleanText(input.venue || input.profile.venue),
    feed: cleanText(input.profile.feed || input.profile.label || input.venue || 'Stadium'),
    signal: 'ok',
  };
}

function defaultLeague(sport) {
  return {
    basketball: 'BASKETBALL',
    football: 'FOOTBALL',
    hockey: 'HOCKEY',
    lacrosse: 'LACROSSE',
    volleyball: 'VOLLEYBALL',
    soccer: 'SOCCER',
    baseball: 'BASEBALL',
    softball: 'SOFTBALL',
  }[sport] || 'STADIUM';
}

function sideScore(obj, side) {
  const direct = obj[`${side}Score`] ?? obj[`${side}Runs`] ?? obj[`${side}Points`];
  if (direct != null && cleanText(direct) !== '') return trimZeros(direct);
  const hundreds = obj[`${side}ScoreHundreds`];
  const tens = obj[`${side}ScoreTens`];
  const ones = obj[`${side}ScoreOnes`];
  if (tens == null && ones == null && hundreds == null) return null;
  return trimZeros(`${hundreds ?? ''}${tens ?? ''}${ones ?? ''}`);
}

function trimZeros(value) {
  const text = cleanText(value);
  if (!text) return null;
  const stripped = text.replace(/^[\s0]+/, '');
  if (!stripped) return '0';
  if (!/^\d+$/.test(stripped)) return cleanScore(text);
  return stripped;
}

function scoreish(value) {
  if (value == null || value === '') return null;
  return trimZeros(value) ?? cleanScore(value);
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return '';
}

function unwrap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.payload && typeof raw.payload === 'object') return raw.payload;
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data;
  return raw;
}

function normalizeStatus(value) {
  const v = String(value || '').toLowerCase();
  if (!v) return '';
  if (['in', 'live', 'inprogress', 'in_progress', 'running'].includes(v)) return 'live';
  if (['post', 'final', 'ended', 'complete', 'finished'].includes(v)) return 'final';
  if (['pre', 'upcoming', 'scheduled'].includes(v)) return 'upcoming';
  return '';
}

function asList(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(/[,/|]/);
  return list.map((item) => cleanText(item)).filter(Boolean).slice(0, 8);
}
