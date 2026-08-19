import test from 'node:test';
import assert from 'node:assert/strict';

import { parseListing, parseFeed, toTickerText } from '../lib/parser.mjs';
import { extractChannels, normalizeChannel, splitChannelsBlob } from '../lib/channels.mjs';

test('supporter line: Team vs team epn, tsn4, sn 3', () => {
  const event = parseListing('Team vs team epn, tsn4, sn 3');
  assert.equal(event.away.name.toLowerCase(), 'team');
  assert.equal(event.home.name.toLowerCase(), 'team');
  assert.deepEqual(event.channels, ['ESPN', 'TSN4', 'SN 3']);
  assert.match(toTickerText(event), /vs/i);
  assert.match(toTickerText(event), /ESPN/);
  assert.match(toTickerText(event), /TSN4/);
  assert.match(toTickerText(event), /SN 3/);
});

test('Maple Leafs vs Canadiens with Canadian bugs', () => {
  const event = parseListing('Maple Leafs vs Canadiens — TSN4, SN 3', 'RDS, SN ONT');
  assert.equal(event.away.name, 'Maple Leafs');
  assert.equal(event.home.name, 'Canadiens');
  assert.ok(event.channels.includes('TSN4'));
  assert.ok(event.channels.includes('SN 3'));
  assert.ok(event.channels.includes('RDS'));
  assert.ok(event.channels.includes('SN ONT'));
});

test('Lakers vs Celtics channels in description', () => {
  const event = parseListing('Lakers vs Celtics', 'ESPN, NBA TV');
  assert.deepEqual(event.channels, ['ESPN', 'NBA TV']);
  assert.equal(event.away.abbr, 'LAL');
  assert.equal(event.home.abbr, 'BOS');
});

test('LIVE prefix and slash-separated networks', () => {
  const event = parseListing('LIVE Chiefs vs Bills | CBS / NFL Network');
  assert.equal(event.status, 'live');
  assert.ok(event.channels.includes('CBS'));
  assert.ok(event.channels.includes('NFLN'));
});

test('league prefix NHL:', () => {
  const event = parseListing('NHL: TOR vs MTL - TSN4 / SN Ontario');
  assert.equal(event.league, 'NHL');
  assert.equal(event.away.abbr, 'TOR');
  assert.equal(event.home.abbr, 'MTL');
  assert.ok(event.channels.includes('TSN4'));
  assert.ok(event.channels.includes('SN ONT'));
});

test('normalize messy tokens', () => {
  assert.equal(normalizeChannel('epn'), 'ESPN');
  assert.equal(normalizeChannel('tsn 4'), 'TSN4');
  assert.equal(normalizeChannel('sn3'), 'SN 3');
  assert.equal(normalizeChannel('sportsnet ontario'), 'SN ONT');
  assert.equal(normalizeChannel('nba tv'), 'NBA TV');
});

test('splitChannelsBlob handles mixed separators', () => {
  assert.deepEqual(splitChannelsBlob('ESPN / TSN4, SN 3 · RDS'), ['ESPN', 'TSN4', 'SN 3', 'RDS']);
});

test('extractChannels finds glued tokens', () => {
  const found = extractChannels('Watch on espn2 and tsn4 plus sn3');
  assert.ok(found.includes('ESPN2'));
  assert.ok(found.includes('TSN4'));
  assert.ok(found.includes('SN 3'));
});

test('parseFeed reads RSS items', () => {
  const xml = `<?xml version="1.0"?>
  <rss><channel>
    <item>
      <title>Blue Jays vs Yankees - SN 1 / ESPN</title>
      <description>TVA</description>
    </item>
    <item>
      <title>Just a headline with no matchup on Prime</title>
    </item>
  </channel></rss>`;
  const items = parseFeed(xml, { label: 'Sample' });
  assert.equal(items.length, 2);
  assert.equal(items[0].away.name, 'Blue Jays');
  assert.ok(items[0].channels.includes('SN 1'));
  assert.ok(items[0].channels.includes('ESPN'));
  assert.ok(items[0].channels.includes('TVA'));
  assert.equal(items[1].headline, 'Just a headline with no matchup on Prime');
  assert.ok(items[1].channels.includes('PRIME'));
});

test('parseFeed reads JSON listings', () => {
  const json = JSON.stringify([
    { title: 'Inter Miami vs LAFC', channels: ['Apple TV+', 'TSN1'] },
  ]);
  const items = parseFeed(json);
  assert.equal(items.length, 1);
  assert.ok(items[0].channels.includes('APPLE'));
  assert.ok(items[0].channels.includes('TSN1'));
});

test('prose descriptions are not treated as channels', () => {
  const event = parseListing(
    'Team vs team epn, tsn4, sn 3',
    'The classic listing line — messy tokens, clean bugs.',
  );
  assert.deepEqual(event.channels, ['ESPN', 'TSN4', 'SN 3']);
});

test('league category next to a Sportsnet bug does not become a channel', () => {
  const event = parseListing('Maple Leafs vs Canadiens — TSN4, SN 3', 'RDS, SN ONT NHL');
  assert.ok(event.channels.includes('RDS'));
  assert.ok(event.channels.includes('SN ONT'));
  assert.ok(!event.channels.includes('NHL'));
  assert.ok(!event.channels.includes('SN ONT NHL'));
});

test('toTickerText includes scores for live games', () => {
  const text = toTickerText({
    status: 'live',
    away: { abbr: 'TOR', score: '4' },
    home: { abbr: 'NYY', score: '3' },
    channels: ['ESPN', 'SN 1'],
    detail: '7th',
  });
  assert.equal(text, 'LIVE TOR 4-3 NYY · 7th · ESPN, SN 1');
});
