/**
 * Normalize ESPN / NHL / MLB scoreboards into ticker events.
 * Also builds a labeled demo slate so the chyron is never empty.
 */

import { normalizeChannel, extractChannels } from './channels.mjs';
import { teamFromName } from './parser.mjs';

export const LEAGUES = {
  nfl: { id: 'nfl', label: 'NFL', sport: 'football', espn: 'football/nfl', accent: '#013369' },
  nba: { id: 'nba', label: 'NBA', sport: 'basketball', espn: 'basketball/nba', accent: '#c8102e' },
  mlb: { id: 'mlb', label: 'MLB', sport: 'baseball', espn: 'baseball/mlb', accent: '#002d72' },
  nhl: { id: 'nhl', label: 'NHL', sport: 'hockey', espn: 'hockey/nhl', accent: '#a2aaad' },
  ncaaf: { id: 'ncaaf', label: 'NCAAF', sport: 'football', espn: 'football/college-football', accent: '#9e7c0c' },
  ncaab: { id: 'ncaab', label: 'NCAAB', sport: 'basketball', espn: 'basketball/mens-college-basketball', accent: '#7c3aed' },
  wnba: { id: 'wnba', label: 'WNBA', sport: 'basketball', espn: 'basketball/wnba', accent: '#f472b6' },
  epl: { id: 'epl', label: 'EPL', sport: 'soccer', espn: 'soccer/eng.1', accent: '#38003c' },
  mls: { id: 'mls', label: 'MLS', sport: 'soccer', espn: 'soccer/usa.1', accent: '#c8102e' },
  ucl: { id: 'ucl', label: 'UCL', sport: 'soccer', espn: 'soccer/uefa.champions', accent: '#0e1a4a' },
  ufc: { id: 'ufc', label: 'UFC', sport: 'mma', espn: 'mma/ufc', accent: '#d20a0a' },
  f1: { id: 'f1', label: 'F1', sport: 'racing', espn: 'racing/f1', accent: '#e10600' },
};

export function espnScoreboardUrl(leagueId) {
  const league = LEAGUES[leagueId];
  if (!league) return null;
  return `https://site.api.espn.com/apis/site/v2/sports/${league.espn}/scoreboard`;
}

export function eventsFromEspn(payload, leagueId) {
  const events = payload?.events || [];
  return events.map((event) => {
    const comp = event.competitions?.[0] || {};
    const competitors = comp.competitors || [];
    const homeRaw = competitors.find((c) => c.homeAway === 'home') || competitors[1];
    const awayRaw = competitors.find((c) => c.homeAway === 'away') || competitors[0];
    const state = event.status?.type?.state;
    const status = state === 'in' ? 'live' : state === 'post' ? 'final' : 'upcoming';
    return {
      id: String(event.id || `${leagueId}-${event.shortName || event.name}`),
      source: 'espn',
      league: (LEAGUES[leagueId]?.label) || leagueId.toUpperCase(),
      status,
      start: event.date || null,
      detail: event.status?.type?.shortDetail || event.status?.type?.detail || '',
      away: competitorFromEspn(awayRaw),
      home: competitorFromEspn(homeRaw),
      channels: channelsFromEspn(comp),
      headline: null,
      venue: comp.venue?.fullName || '',
      rawTitle: event.name || event.shortName || '',
    };
  });
}

export function eventsFromNhl(payload) {
  const games = payload?.games || payload?.score?.games || [];
  return games.map((game) => {
    const state = String(game.gameState || game.gameScheduleState || '').toUpperCase();
    const status = ['LIVE', 'CRIT', 'OFF'].includes(state)
      ? (state === 'OFF' ? 'final' : 'live')
      : 'upcoming';
    const broadcasts = game.tvBroadcasts || game.broadcasts || [];
    const channels = unique(
      broadcasts
        .map((b) => normalizeChannel(b.network || b.name || b.broadcastNetwork))
        .filter(Boolean),
    );
    return {
      id: String(game.id || game.gameId || `${game.awayTeam?.abbrev}-${game.homeTeam?.abbrev}`),
      source: 'nhl',
      league: 'NHL',
      status,
      start: game.startTimeUTC || game.gameDate || null,
      detail: game.clock?.timeRemaining
        ? `P${game.period || ''} ${game.clock.timeRemaining}`.trim()
        : (game.gameState || ''),
      away: {
        name: game.awayTeam?.placeName?.default
          ? `${game.awayTeam.placeName.default} ${game.awayTeam.commonName?.default || ''}`.trim()
          : game.awayTeam?.abbrev || 'AWAY',
        abbr: game.awayTeam?.abbrev || 'AWAY',
        score: game.awayTeam?.score ?? null,
        logo: game.awayTeam?.logo || null,
        winner: false,
      },
      home: {
        name: game.homeTeam?.placeName?.default
          ? `${game.homeTeam.placeName.default} ${game.homeTeam.commonName?.default || ''}`.trim()
          : game.homeTeam?.abbrev || 'HOME',
        abbr: game.homeTeam?.abbrev || 'HOME',
        score: game.homeTeam?.score ?? null,
        logo: game.homeTeam?.logo || null,
        winner: false,
      },
      channels,
      headline: null,
      venue: game.venue?.default || '',
      rawTitle: `${game.awayTeam?.abbrev || ''} vs ${game.homeTeam?.abbrev || ''}`,
    };
  });
}

export function eventsFromMlb(payload) {
  const dates = payload?.dates || [];
  const games = dates.flatMap((d) => d.games || []);
  return games.map((game) => {
    const state = game.status?.abstractGameState;
    const status = state === 'Live' ? 'live' : state === 'Final' ? 'final' : 'upcoming';
    const broadcasts = (game.broadcasts || [])
      .filter((b) => !b.type || /tv|stream|national/i.test(b.type) || /tv|stream/i.test(b.name || ''))
      .map((b) => normalizeChannel(b.name || b.callSign || ''));
    return {
      id: String(game.gamePk),
      source: 'mlb',
      league: 'MLB',
      status,
      start: game.gameDate || null,
      detail: game.status?.detailedState || game.status?.abstractGameState || '',
      away: {
        name: game.teams?.away?.team?.name || 'Away',
        abbr: game.teams?.away?.team?.abbreviation || teamFromName(game.teams?.away?.team?.name)?.abbr,
        score: game.teams?.away?.score ?? null,
        logo: null,
        winner: Boolean(game.teams?.away?.isWinner),
      },
      home: {
        name: game.teams?.home?.team?.name || 'Home',
        abbr: game.teams?.home?.team?.abbreviation || teamFromName(game.teams?.home?.team?.name)?.abbr,
        score: game.teams?.home?.score ?? null,
        logo: null,
        winner: Boolean(game.teams?.home?.isWinner),
      },
      channels: unique(broadcasts.filter(Boolean)),
      headline: null,
      venue: game.venue?.name || '',
      rawTitle: game.teams?.away?.team?.name && game.teams?.home?.team?.name
        ? `${game.teams.away.team.name} vs ${game.teams.home.team.name}`
        : '',
    };
  });
}

export function buildDemoSlate(now = new Date()) {
  const t = now.getTime();
  const iso = (offsetMin) => new Date(t + offsetMin * 60_000).toISOString();
  return [
    event({
      id: 'demo-mlb-tor-nyy',
      league: 'MLB',
      status: 'live',
      start: iso(-95),
      detail: '7th 1 out',
      away: { name: 'Toronto Blue Jays', abbr: 'TOR', score: '4' },
      home: { name: 'New York Yankees', abbr: 'NYY', score: '3' },
      channels: ['ESPN', 'SN 1', 'TVA'],
    }),
    event({
      id: 'demo-epl-ars-che',
      league: 'EPL',
      status: 'live',
      start: iso(-62),
      detail: '2H 71\'',
      away: { name: 'Arsenal', abbr: 'ARS', score: '1' },
      home: { name: 'Chelsea', abbr: 'CHE', score: '1' },
      channels: ['PEACOCK', 'NBC', 'DAZN'],
    }),
    event({
      id: 'demo-nfl-kc-buf',
      league: 'NFL',
      status: 'upcoming',
      start: iso(75),
      detail: formatClock(new Date(t + 75 * 60_000)),
      away: { name: 'Kansas City Chiefs', abbr: 'KC', score: null },
      home: { name: 'Buffalo Bills', abbr: 'BUF', score: null },
      channels: ['CBS', 'NFLN'],
    }),
    event({
      id: 'demo-nba-lal-bos',
      league: 'NBA',
      status: 'upcoming',
      start: iso(140),
      detail: formatClock(new Date(t + 140 * 60_000)),
      away: { name: 'Los Angeles Lakers', abbr: 'LAL', score: null },
      home: { name: 'Boston Celtics', abbr: 'BOS', score: null },
      channels: ['ESPN', 'NBA TV'],
    }),
    event({
      id: 'demo-nhl-tor-mtl',
      league: 'NHL',
      status: 'upcoming',
      start: iso(185),
      detail: formatClock(new Date(t + 185 * 60_000)),
      away: { name: 'Toronto Maple Leafs', abbr: 'TOR', score: null },
      home: { name: 'Montreal Canadiens', abbr: 'MTL', score: null },
      channels: ['TSN4', 'SN 3', 'RDS'],
    }),
    event({
      id: 'demo-mls-mia-lafc',
      league: 'MLS',
      status: 'upcoming',
      start: iso(210),
      detail: formatClock(new Date(t + 210 * 60_000)),
      away: { name: 'Inter Miami', abbr: 'MIA', score: null },
      home: { name: 'LAFC', abbr: 'LAFC', score: null },
      channels: ['APPLE', 'TSN1'],
    }),
    event({
      id: 'demo-wnba-ny-lv',
      league: 'WNBA',
      status: 'final',
      start: iso(-220),
      detail: 'Final',
      away: { name: 'New York Liberty', abbr: 'NY', score: '88', winner: true },
      home: { name: 'Las Vegas Aces', abbr: 'LV', score: '81' },
      channels: ['ESPN', 'SN 1'],
    }),
    event({
      id: 'demo-ufc-main',
      league: 'UFC',
      status: 'upcoming',
      start: iso(320),
      detail: formatClock(new Date(t + 320 * 60_000)),
      away: null,
      home: null,
      channels: ['ESPN+', 'PRIME'],
      headline: 'UFC Main Card',
    }),
  ];
}

export function mergeEvents(groups) {
  const byId = new Map();
  for (const event of groups.flat()) {
    if (!event) continue;
    const key = matchupKey(event) || event.id || `${event.league}-${event.rawTitle}`;
    const prev = byId.get(key);
    if (!prev) {
      byId.set(key, event);
      continue;
    }
    byId.set(key, preferEvent(prev, event));
  }
  return [...byId.values()].sort(compareEvents);
}

function matchupKey(event) {
  if (!event.away?.abbr || !event.home?.abbr) return null;
  return `${event.league || ''}::${event.away.abbr}::${event.home.abbr}`.toUpperCase();
}

function preferEvent(a, b) {
  const rank = { live: 0, upcoming: 1, final: 2 };
  if ((rank[a.status] ?? 3) !== (rank[b.status] ?? 3)) {
    return (rank[a.status] ?? 3) < (rank[b.status] ?? 3) ? a : b;
  }
  const ac = (a.channels || []).length;
  const bc = (b.channels || []).length;
  if (bc !== ac) return bc > ac ? b : a;
  if (a.source === 'demo' && b.source !== 'demo') return b;
  if (b.source === 'demo' && a.source !== 'demo') return a;
  return a;
}

export function compareEvents(a, b) {
  const rank = { live: 0, upcoming: 1, final: 2 };
  const ra = rank[a.status] ?? 3;
  const rb = rank[b.status] ?? 3;
  if (ra !== rb) return ra - rb;
  const ta = Date.parse(a.start || '') || 0;
  const tb = Date.parse(b.start || '') || 0;
  return ta - tb;
}

function competitorFromEspn(raw) {
  if (!raw) return { name: 'TBD', abbr: 'TBD', score: null, logo: null, winner: false };
  return {
    name: raw.team?.displayName || raw.team?.name || 'TBD',
    abbr: raw.team?.abbreviation || teamFromName(raw.team?.displayName)?.abbr || 'TBD',
    score: raw.score ?? null,
    logo: raw.team?.logo || null,
    winner: Boolean(raw.winner),
  };
}

function channelsFromEspn(comp) {
  const names = [];
  for (const b of comp.broadcasts || []) {
    for (const n of b.names || []) names.push(n);
    if (b.station) names.push(b.station);
  }
  for (const b of comp.geoBroadcasts || []) {
    const n = b.media?.shortName || b.media?.name || b.station;
    if (n) names.push(n);
  }
  const out = [];
  const seen = new Set();
  for (const name of names) {
    const label = normalizeChannel(name);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  if (!out.length && comp.notes) {
    for (const note of comp.notes) {
      for (const ch of extractChannels(note.headline || note.text || '')) {
        if (!seen.has(ch)) {
          seen.add(ch);
          out.push(ch);
        }
      }
    }
  }
  return out;
}

function event(partial) {
  return {
    source: 'demo',
    headline: null,
    venue: '',
    rawTitle: partial.away && partial.home
      ? `${partial.away.name} vs ${partial.home.name}`
      : (partial.headline || ''),
    feed: 'Demo',
    ...partial,
    away: partial.away ? { logo: null, winner: false, ...partial.away } : null,
    home: partial.home ? { logo: null, winner: false, ...partial.home } : null,
  };
}

function formatClock(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}
