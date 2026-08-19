import test from 'node:test';
import assert from 'node:assert/strict';

import { eventsFromEspn, eventsFromNhl, eventsFromMlb, buildDemoSlate, mergeEvents } from '../lib/scoreboard.mjs';

test('eventsFromEspn maps broadcasts and scores', () => {
  const payload = {
    events: [{
      id: '401',
      name: 'Toronto Maple Leafs at Montreal Canadiens',
      shortName: 'TOR @ MTL',
      date: '2026-08-19T23:00:00Z',
      status: { type: { state: 'in', shortDetail: '2nd 8:14' } },
      competitions: [{
        broadcasts: [{ names: ['ESPN', 'TSN4'] }],
        geoBroadcasts: [{ media: { shortName: 'SN 3' } }],
        competitors: [
          { homeAway: 'away', score: '3', team: { abbreviation: 'TOR', displayName: 'Toronto Maple Leafs' } },
          { homeAway: 'home', score: '2', winner: false, team: { abbreviation: 'MTL', displayName: 'Montreal Canadiens' } },
        ],
      }],
    }],
  };
  const [event] = eventsFromEspn(payload, 'nhl');
  assert.equal(event.status, 'live');
  assert.equal(event.away.abbr, 'TOR');
  assert.equal(event.home.score, '2');
  assert.deepEqual(event.channels, ['ESPN', 'TSN4', 'SN 3']);
});

test('eventsFromNhl reads tvBroadcasts.network', () => {
  const payload = {
    games: [{
      id: 9,
      gameState: 'LIVE',
      startTimeUTC: '2026-08-19T23:00:00Z',
      awayTeam: { abbrev: 'TOR', score: 1, placeName: { default: 'Toronto' }, commonName: { default: 'Maple Leafs' } },
      homeTeam: { abbrev: 'MTL', score: 1, placeName: { default: 'Montréal' }, commonName: { default: 'Canadiens' } },
      tvBroadcasts: [{ network: 'TSN4' }, { network: 'SN' }],
    }],
  };
  const [event] = eventsFromNhl(payload);
  assert.equal(event.league, 'NHL');
  assert.equal(event.status, 'live');
  assert.ok(event.channels.includes('TSN4'));
});

test('eventsFromMlb maps national TV', () => {
  const payload = {
    dates: [{
      games: [{
        gamePk: 123,
        gameDate: '2026-08-19T23:05:00Z',
        status: { abstractGameState: 'Preview', detailedState: 'Scheduled' },
        teams: {
          away: { team: { name: 'Toronto Blue Jays', abbreviation: 'TOR' } },
          home: { team: { name: 'New York Yankees', abbreviation: 'NYY' } },
        },
        broadcasts: [{ name: 'ESPN', type: 'TV' }, { name: 'SN 1', type: 'TV' }],
      }],
    }],
  };
  const [event] = eventsFromMlb(payload);
  assert.equal(event.away.abbr, 'TOR');
  assert.ok(event.channels.includes('ESPN'));
  assert.ok(event.channels.includes('SN 1'));
});

test('demo slate always has a Canadian hockey listing on TSN4 / SN 3', () => {
  const slate = buildDemoSlate(new Date('2026-08-19T20:00:00Z'));
  const hockey = slate.find((e) => e.league === 'NHL');
  assert.ok(hockey);
  assert.deepEqual(hockey.channels, ['TSN4', 'SN 3', 'RDS']);
});

test('mergeEvents prefers live, then upcoming', () => {
  const merged = mergeEvents([
    [{ id: 'a', status: 'final', start: '2026-08-19T01:00:00Z' }, { id: 'b', status: 'live', start: '2026-08-19T02:00:00Z' }],
    [{ id: 'c', status: 'upcoming', start: '2026-08-19T03:00:00Z' }],
  ]);
  assert.equal(merged[0].id, 'b');
  assert.equal(merged[1].id, 'c');
});
