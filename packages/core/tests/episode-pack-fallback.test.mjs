import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateTemplate } from '../src/generate-template.js';

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

function expressionLabel(entry) {
  return entry.expression.match(/^\/\*\s*([^*]+?)\s*\*\//)?.[1]?.trim() || '';
}

function assertAvailabilitySafePackPolicy(expressions, label) {
  const labels = expressions.map(expressionLabel);
  for (const marker of LEGACY_PACK_ESE_MARKERS) {
    assert.equal(
      expressions.some(({ expression }) => expression.includes(marker)),
      false,
      `${label} must not contain legacy destructive pack ESE: ${marker}`,
    );
  }
  assert.deepEqual(
    labels.slice(-2),
    LATE_PACK_LABELS,
    `${label} must evaluate pack fallbacks after every other ESE`,
  );
  for (const expression of expressions.slice(-2).map(({ expression }) => expression)) {
    assert.ok(
      expression.includes(PLAYABLE_SINGLES_THRESHOLD),
      `${label} must count only standalone, non-pack singles before hiding a fallback`,
    );
  }
}

function walkJsonFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkJsonFiles(path);
    return entry.isFile() && entry.name.endsWith('.json') ? [path] : [];
  });
}

test('TorBox Essential Apex Mixed keeps valid episode packs until playable singles survive', () => {
  const template = generateTemplate({
    service: 'torbox-ess',
    device: 'firestick4k',
    resolution: 'mixed',
    architecture: 'apex-mixed',
    audio: 'dolby',
    content: 'all',
    cacheMode: 'cached',
    langs: ['English'],
    p2pEnabled: false,
  });

  assert.equal(template.config.excludeUncached, true, 'fixture must model Cached Only');
  assert.deepEqual(template.config.seasonEpisodeMatching, {
    enabled: true,
    strict: false,
    requestTypes: [],
    addons: [],
  });
  assertAvailabilitySafePackPolicy(
    template.config.excludedStreamExpressions,
    'TorBox Essential Apex Mixed',
  );
});

test('P2P and Nuvio generation also avoid early hard season-pack removal', () => {
  const p2p = generateTemplate({
    service: 'p2p',
    device: 'generic',
    resolution: '1080p',
    architecture: 'standard',
    audio: 'limited',
    content: 'all',
    p2pEnabled: true,
  });
  assertAvailabilitySafePackPolicy(p2p.config.excludedStreamExpressions, 'P2P');

  const host = { id: 'fortheweak', supportsP2P: true, supportsNuvioInstant: true, supportsDebrid: true, supportsHttp: true };
  const nuvio = generateTemplate(
    { route: 'nuvio-torbox-instant', device: 'generic', resolution: '1080p', host },
    { host },
  );
  assertAvailabilitySafePackPolicy(nuvio.config.excludedStreamExpressions, 'Nuvio TorBox Instant');
});

test('active checked-in templates contain no destructive pack or multi-episode ESE', () => {
  const root = fileURLToPath(new URL('../../../Templates/', import.meta.url));
  const activeTemplates = walkJsonFiles(root).filter(path => !path.includes('/Deprecated/'));
  assert.ok(activeTemplates.length > 0, 'expected checked-in active templates');

  for (const path of activeTemplates) {
    const template = JSON.parse(readFileSync(path, 'utf8'));
    const expressions = template.config?.excludedStreamExpressions || [];
    const legacy = expressions
      .map(entry => entry?.expression || '')
      .filter(expression => LEGACY_PACK_ESE_MARKERS.some(marker => expression.includes(marker)));
    assert.deepEqual(legacy, [], `${path} contains a legacy destructive pack ESE`);
  }
});
