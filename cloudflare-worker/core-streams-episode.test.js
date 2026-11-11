import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyEpisode, episodeLine, episodeScore } from './core-streams-episode.js';

const R = { season: 1, episode: 5 };
const state = (evidence, request = R) => classifyEpisode(request, evidence).state;

test('the file decides before the release title', () => {
  assert.equal(state({ filename: 'Show.S01E05.1080p.mkv', release: 'Show.S01.1080p' }), 'EXACT');
  assert.equal(state({ filename: 'Show.S01E06.1080p.mkv', release: 'Show.S01E05.1080p' }), 'MISMATCH');
  assert.equal(state({ release: 'Show.S01E05.1080p.WEB' }), 'LIKELY');
  assert.equal(state({ release: 'Show.S01E06.1080p.WEB' }), 'MISMATCH');
  assert.equal(state({ release: 'Show.S01E06.1080p.WEB', fileIdx: 3 }), 'UNKNOWN', "a selected file is not the torrent's title");
  assert.equal(state({ filename: 'Show.S02E05.mkv' }), 'MISMATCH', 'another season');
});

test('audio and resolution numbers are not episodes', () => {
  assert.equal(state({ filename: 'Show.S01E05.DDP.5.1.1920x1080.mkv' }), 'EXACT');
  assert.equal(state({ release: 'Show 1080p WEB' }), 'UNKNOWN');
});

test('packs, ranges and volumes', () => {
  assert.equal(state({ release: 'Show.S01.COMPLETE.1080p' }), 'PACK');
  assert.equal(state({ release: 'Show.S02.COMPLETE.1080p' }), 'MISMATCH');
  assert.deepEqual(classifyEpisode(R, { release: 'Show S01E01-E08 1080p' }).range, [1, 8]);
  assert.equal(state({ release: 'Show S01E06-E10 1080p' }), 'MISMATCH');
  assert.equal(state({ release: '[G] Show - 01-12 (1080p)' }), 'PACK');
  assert.equal(state({ release: '[G] Show Vol. 1 (1080p)' }), 'PACK');
  assert.equal(classifyEpisode(R, { release: 'Show.S01.1080p', fileMustInclude: ['x'] }).selection, true);
  assert.equal(classifyEpisode(R, { release: 'Show.S01.1080p' }).selection, false);
});

test('anime numbering', () => {
  assert.equal(state({ filename: '[G] Show - 05 (1080p).mkv' }), 'EXACT', 'season 1: the number is the episode');
  assert.equal(state({ filename: '[G] Show S2 - 05 (1080p).mkv' }, { season: 2, episode: 5 }), 'EXACT');
  assert.equal(state({ filename: '[G] Show - 05 (1080p).mkv' }, { season: 2, episode: 5 }), 'LIKELY', 'season not named');
  assert.equal(state({ filename: '[G] Show - 05 (1080p).mkv' }, { season: 2, episode: 5, entryNumbering: true }), 'EXACT',
    'Kitsu numbers within its entry');
  const absolute = classifyEpisode({ season: 2, episode: 5 }, { filename: '[G] Show - 33 (1080p).mkv' });
  assert.equal(absolute.state, 'UNKNOWN');
  assert.equal(absolute.ambiguous, true);
  assert.equal(state({ filename: '[G] Show - 33 (1080p).mkv' }, { season: 2, episode: 5, entryNumbering: true }), 'MISMATCH');
  assert.equal(state({ filename: '[G] - 05.mkv', folderName: 'Show Season 2' }, { season: 2, episode: 5 }), 'EXACT',
    'the folder names the season');
});

test('scores keep each tier above every bonus below it', () => {
  assert.equal(episodeScore({ state: 'MISMATCH' }), null);
  assert.equal(episodeScore({ state: 'EXACT' }), 1000);
  assert.equal(episodeScore({ state: 'LIKELY' }), 700);
  assert.equal(episodeScore({ state: 'PACK', selection: true }), 550);
  assert.equal(episodeScore({ state: 'PACK', selection: false }), 450);
  assert.equal(episodeScore({ state: 'UNKNOWN' }), 100);
});

test('card lines', () => {
  assert.equal(episodeLine(R, { state: 'EXACT' }, 'Frieren'), 'S01E05 · Frieren');
  assert.equal(episodeLine(R, { state: 'PACK', selection: true }), 'Season 1 · Episode 5 selected');
  assert.equal(episodeLine(R, { state: 'PACK', selection: true, range: [1, 8] }), 'Episodes 1–8 · E05 selected');
  assert.equal(episodeLine(R, { state: 'UNKNOWN' }), 'Episode unverified');
  assert.equal(episodeLine(R, { state: 'UNKNOWN', ambiguous: true }), 'Episode unverified · absolute numbering');
  assert.equal(episodeLine(R, { state: 'MISMATCH' }), '');
});

test('a range that repeats the season is one pack, and three-digit seasons parse', () => {
  const verdict = classifyEpisode(R, { release: 'Show.S01E01-S01E08.1080p.WEB' });
  assert.equal(verdict.state, 'PACK');
  assert.deepEqual(verdict.range, [1, 8]);
  assert.equal(state({ release: 'Show.S01E06-S01E08.1080p' }), 'MISMATCH');
  assert.equal(state({ filename: 'Show.S100E05.mkv' }, { season: 100, episode: 5 }), 'EXACT');
  assert.equal(state({ filename: 'Show.S100E06.mkv' }, { season: 100, episode: 5 }), 'MISMATCH');
});
