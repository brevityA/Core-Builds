import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const LEGACY_PACK_ESE_MARKERS = [
  'ongoingSeasonPack',
  'Hard Season Pack Kill',
  'Kill Ambiguous Packs',
  'Kill Multi-Episode',
  'Clutter-Free Single Episode Booster',
  'Weekly Ongoing Series Pack Filter',
  'Kill Season Packs When Episodes Exist',
  'Season Pack Kill — latestSeason-aware',
];

const LATE_PACK_LABELS = [
  'CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain',
  'CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain',
];
const PLAYABLE_SINGLES_THRESHOLD = "count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3";

function label(entry) {
  return entry.expression.match(/^\/\*\s*([^*]+?)\s*\*\//)?.[1]?.trim() || '';
}

test('browser generator does not emit early destructive episode-pack filters', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  for (const marker of LEGACY_PACK_ESE_MARKERS) {
    assert.equal(app.includes(marker), false, `browser generator still contains ${marker}`);
  }
  for (const label of LATE_PACK_LABELS) {
    assert.ok(app.includes(label), `browser generator is missing ${label}`);
  }
  assert.ok(app.includes(PLAYABLE_SINGLES_THRESHOLD), 'browser generator must count only standalone playable singles');
});

test('all golden configurations use late pack fallbacks as their final ESEs', async () => {
  const names = [
    'torbox-1080p-standard', 'torbox-4k-standard', 'torbox-4k-iqr',
    'torbox-4k-apex-mixed', 'torbox-mixed-standard', 'torbox-mixed-apex-mixed',
    'torbox-ultrawide', 'torbox-4k-samsung', 'alldebrid-1080p',
    'easynews-1080p', 'p2p-1080p', 'http-1080p',
  ];
  for (const name of names) {
    const template = JSON.parse(await readFile(
      new URL(`../e2e/golden/${name}.json`, import.meta.url),
      'utf8',
    ));
    const expressions = template.config.excludedStreamExpressions || [];
    for (const marker of LEGACY_PACK_ESE_MARKERS) {
      assert.equal(
        expressions.some(entry => entry.expression.includes(marker)),
        false,
        `${name} contains legacy destructive pack ESE: ${marker}`,
      );
    }
    if (!['http-1080p'].includes(name)) {
      assert.deepEqual(labels(expressions), LATE_PACK_LABELS, `${name} must end with late pack fallbacks`);
      for (const expression of expressions.slice(-2).map(entry => entry.expression)) {
        assert.ok(expression.includes(PLAYABLE_SINGLES_THRESHOLD), `${name} must count only standalone playable singles`);
      }
    }
  }
});

function labels(expressions) {
  return expressions.slice(-2).map(label);
}
