/**
 * Turn RSS / Atom / JSON / free-text listings into ticker events.
 * Built for the format the living-room crowd actually uses:
 *   "Team vs Team  epn, tsn4, sn 3"
 */

import { extractChannels, splitChannelsBlob, normalizeChannel, peelChannels } from './channels.mjs';
import { abbreviate } from './teams.mjs';

const VS_RE = /\s+(?:vs\.?|v\.|versus|@|at)\s+/i;
const SEP_RE = /\s*[-–—|:]\s*/;
const LEAGUE_PREFIX = /^(nhl|nba|nfl|mlb|wnba|mls|epl|ufc|f1|ncaaf|ncaab|cfb|cbb|soccer|football|hockey|baseball|basketball)\s*[-–—:|]\s*/i;
const LIVE_PREFIX = /^(?:\[?live\]?|in progress|now playing)\s*[-–—:|]?\s*/i;
const TIME_RE = /\b((?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm)|(?:[01]?\d|2[0-3]):[0-5]\d)\b/i;

export function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .trim();
}

export function stripTags(html) {
  return decodeXmlEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function parseListing(title, extra = '') {
  const rawTitle = stripTags(title);
  const rawExtra = stripTags(extra);
  const combined = [rawTitle, rawExtra].filter(Boolean).join(' — ');

  let working = rawTitle.replace(LIVE_PREFIX, '');
  let league = null;
  const leagueMatch = working.match(LEAGUE_PREFIX);
  if (leagueMatch) {
    league = leagueMatch[1].toUpperCase();
    if (league === 'CFB') league = 'NCAAF';
    if (league === 'CBB') league = 'NCAAB';
    working = working.slice(leagueMatch[0].length);
  }

  let away = null;
  let home = null;
  let remainder = '';

  const vsParts = working.split(VS_RE);
  if (vsParts.length >= 2) {
    away = cleanTeam(vsParts[0]);
    const right = vsParts.slice(1).join(' vs ');
    const cut = right.split(SEP_RE);
    if (cut.length > 1) {
      home = cleanTeam(cut[0]);
      remainder = cut.slice(1).join(' ');
    } else {
      const peeled = peelChannels(right);
      home = cleanTeam(peeled.text || right);
      remainder = peeled.channels.join(', ');
    }
  }

  const channelPool = [remainder, rawExtra].filter(Boolean).join(' , ');
  let channels = splitChannelsBlob(channelPool);
  if (!channels.length) channels = extractChannels([remainder, rawExtra, rawTitle].filter(Boolean).join(' , '));

  // If the extra blob is "just" channels, don't also treat it as a headline.
  const extraLooksLikeChannels = rawExtra && splitChannelsBlob(rawExtra).length > 0
    && !VS_RE.test(rawExtra);

  const timeMatch = combined.match(TIME_RE);
  const isLive = LIVE_PREFIX.test(rawTitle) || /\blive\b/i.test(rawTitle);

  const event = {
    id: slugId(rawTitle || combined),
    source: 'rss',
    league: league || guessLeague(combined, channels),
    status: isLive ? 'live' : 'upcoming',
    start: null,
    detail: timeMatch ? timeMatch[1].toUpperCase() : '',
    away: away ? teamFromName(away) : null,
    home: home ? teamFromName(home) : null,
    channels,
    headline: away && home ? null : rawTitle,
    rawTitle,
    rawExtra: extraLooksLikeChannels ? '' : rawExtra,
  };

  return event;
}

export function parseFeed(xmlOrJson, meta = {}) {
  const text = String(xmlOrJson || '').trim();
  if (!text) return [];

  if (text.startsWith('{') || text.startsWith('[')) {
    return parseJsonFeed(text, meta);
  }

  const items = [];
  const itemBlocks = [...text.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  for (const block of itemBlocks) {
    const body = block[2];
    const title = firstTag(body, 'title');
    const description = firstTag(body, 'description')
      || firstTag(body, 'summary')
      || firstTag(body, 'content')
      || firstTag(body, 'content:encoded');
    const category = allTags(body, 'category').join(', ');
    const pub = firstTag(body, 'pubDate') || firstTag(body, 'updated') || firstTag(body, 'published');
    const event = parseListing(title, [description, category].filter(Boolean).join(', '));
    event.source = meta.source || 'rss';
    event.feed = meta.label || meta.source || 'RSS';
    if (pub) {
      const ms = Date.parse(pub);
      if (!Number.isNaN(ms)) event.start = new Date(ms).toISOString();
    }
    items.push(event);
  }
  return items;
}

export function parseJsonFeed(text, meta = {}) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const rows = Array.isArray(data)
    ? data
    : data.items || data.events || data.games || data.entries || data.results || [];
  if (!Array.isArray(rows)) return [];

  return rows.map((row, index) => {
    if (typeof row === 'string') {
      const event = parseListing(row);
      event.source = meta.source || 'rss';
      event.feed = meta.label || 'RSS';
      event.id = event.id || `json-${index}`;
      return event;
    }
    const title = row.title || row.name || row.headline || row.event || '';
    const extra = row.channels
      ? (Array.isArray(row.channels) ? row.channels.join(', ') : String(row.channels))
      : row.description || row.summary || row.networks || row.tv || '';
    const event = parseListing(title, extra);
    if (Array.isArray(row.channels)) {
      event.channels = unique([
        ...row.channels.map(normalizeChannel),
        ...event.channels,
      ]);
    }
    if (row.home || row.away) {
      event.home = teamFromName(row.home?.name || row.home || event.home?.name);
      event.away = teamFromName(row.away?.name || row.away || event.away?.name);
      if (row.home?.score != null) event.home.score = String(row.home.score);
      if (row.away?.score != null) event.away.score = String(row.away.score);
    }
    if (row.league) event.league = String(row.league).toUpperCase();
    if (row.status) event.status = normalizeStatus(row.status);
    if (row.start || row.date || row.time) {
      const ms = Date.parse(row.start || row.date || row.time);
      if (!Number.isNaN(ms)) event.start = new Date(ms).toISOString();
    }
    event.source = meta.source || 'rss';
    event.feed = meta.label || row.feed || 'RSS';
    event.id = row.id || event.id || `json-${index}`;
    return event;
  });
}

export function toTickerText(event) {
  const channels = (event.channels || []).join(', ');
  const status = (event.status || '').toUpperCase();
  const prefix = status === 'LIVE' ? 'LIVE ' : status === 'FINAL' ? 'FINAL ' : '';
  if (event.away && event.home) {
    const away = event.away.abbr || event.away.name;
    const home = event.home.abbr || event.home.name;
    const hasScore = event.away.score != null && event.home.score != null && event.status !== 'upcoming';
    const matchup = hasScore
      ? `${away} ${event.away.score}-${event.home.score} ${home}`
      : `${away} vs ${home}`;
    const when = event.status === 'upcoming' ? (event.detail || '') : (event.detail || '');
    return [prefix + matchup, when, channels].filter(Boolean).join('  ·  ').replace(/\s+/g, ' ').trim();
  }
  return [prefix + (event.headline || event.rawTitle || ''), channels].filter(Boolean).join('  ·  ');
}

export function guessLeague(text, channels = []) {
  const blob = `${text} ${channels.join(' ')}`.toLowerCase();
  if (/\bnhl|hockey|maple leafs|canadiens|oilers\b/.test(blob)) return 'NHL';
  if (/\bnba|lakers|celtics|knicks|warriors\b/.test(blob)) return 'NBA';
  if (/\bnfl|chiefs|bills|cowboys|super bowl\b/.test(blob)) return 'NFL';
  if (/\bmlb|yankees|dodgers|blue jays|world series\b/.test(blob)) return 'MLB';
  if (/\bwnba\b/.test(blob)) return 'WNBA';
  if (/\bepl|premier league|arsenal|chelsea|liverpool\b/.test(blob)) return 'EPL';
  if (/\bmls|inter miami\b/.test(blob)) return 'MLS';
  if (/\bufc|mma\b/.test(blob)) return 'UFC';
  if (/\bf1|formula 1|grand prix\b/.test(blob)) return 'F1';
  if (channels.some((c) => /^TSN|^SN/.test(c))) return 'SN';
  return 'RSS';
}

function firstTag(xml, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const match = xml.match(re);
  return match ? stripTags(match[1]) : '';
}

function allTags(xml, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi');
  return [...xml.matchAll(re)].map((m) => stripTags(m[1])).filter(Boolean);
}

function cleanTeam(value) {
  return String(value || '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function teamFromName(name) {
  if (!name) return null;
  if (typeof name === 'object') return name;
  const trimmed = cleanTeam(name);
  if (!trimmed) return null;
  return { name: trimmed, abbr: abbreviate(trimmed), score: null, logo: null, winner: false };
}

function normalizeStatus(value) {
  const v = String(value || '').toLowerCase();
  if (['in', 'live', 'inprogress', 'in_progress'].includes(v)) return 'live';
  if (['post', 'final', 'ended', 'complete'].includes(v)) return 'final';
  return 'upcoming';
}

function slugId(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || `item-${Math.random().toString(36).slice(2, 8)}`;
}

function unique(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}
