// The Core formatter collection rendered through AIOStreams' own formatter
// engine at the pinned release (see helpers/aiostreams-formatter-engine.mjs).
// Offline runs skip locally; CI requires the engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFormatterEngine } from './helpers/aiostreams-formatter-engine.mjs';
import {
  CORE_FORMATTERS, CORE_FORMATTER_STYLES, CORE_SCORE_MODES, buildCoreFormatter, isCoreFormatter,
} from '../src/data/core-formatters.js';
import { FORMATTERS } from '../src/data/formatters.js';

async function engine() {
  try {
    return await loadFormatterEngine();
  } catch (err) {
    if (process.env.CI) throw new Error(`could not load the AIOStreams formatter engine at the pin: ${err.message}`);
    return null;
  }
}
const aio = await engine();
const skip = aio ? false : 'AIOStreams formatter engine unreachable (offline); CI requires it';

// Sanitised synthetic streams. No real release, account or URL.
const FIXTURES = {
  cachedMovie: {
    stream: {
      type: 'debrid', resolution: '2160p', title: 'Example Feature', year: 2024, quality: 'BluRay REMUX', encode: 'HEVC',
      size: 62_000_000_000, bitrate: 72_000_000, visualTags: ['DV', 'HDR10'], audioTags: ['TrueHD', 'Atmos'], audioChannels: ['7.1'],
      languageCodes: ['EN'], subtitleCodes: ['EN', 'FR'], releaseGroup: 'GROUP',
      filename: 'Example.Feature.2024.2160p.UHD.BluRay.REMUX.DV.HDR10.HEVC.TrueHD.7.1.Atmos-GROUP.mkv', nSeScore: 87,
    },
    service: { id: 'torbox', shortName: 'TB', name: 'TorBox', cached: true },
    addon: { name: 'Source A' },
  },
  uncachedEpisode: {
    stream: { type: 'debrid', resolution: '1080p', title: 'Example Show', quality: 'WEB-DL', encode: 'AVC', size: 1_400_000_000,
      audioTags: ['DD+'], audioChannels: ['5.1'], languageCodes: ['EN'], seasonEpisode: ['S02', 'E05'], seeders: 12, nSeScore: 0 },
    service: { id: 'realdebrid', shortName: 'RD', cached: false },
    addon: { name: 'Source B' },
  },
  unknownCache: {
    stream: { type: 'debrid', resolution: '1080p', quality: 'WEB-DL', size: 2_100_000_000 },
    service: { id: 'alldebrid', shortName: 'AD', cached: null },
  },
  p2pEpisode: {
    stream: { type: 'p2p', resolution: '720p', title: 'Example Show', quality: 'HDTV', seasonEpisode: ['S01', 'E01'], seeders: 214,
      languageCodes: ['EN', 'FR', 'DE', 'ES', 'IT'] },
    addon: { name: 'Source C' },
  },
  seasonPack: {
    stream: { type: 'debrid', resolution: '1080p', title: 'Example Show', quality: 'BluRay', encode: 'HEVC', size: 44_000_000_000,
      seasonEpisode: ['S03'], seasonPack: true, nSeScore: 42 },
    service: { shortName: 'TB', cached: true },
  },
  sparse: { stream: { type: 'debrid' }, service: { shortName: 'RD', cached: false } },
  empty: {},
  longUnicode: {
    stream: { type: 'debrid', resolution: '1080p', title: 'Ünïcödé Тест 日本語のタイトル ' + 'Very Long Title '.repeat(6),
      filename: 'Ünïcödé.Тест.日本語.' + 'Segment.'.repeat(20) + 'mkv', languageCodes: ['JA', 'EN'], size: 0 },
    service: { shortName: 'TB', cached: true },
  },
  infoMessage: { stream: { type: 'info', message: 'Example notice from an add-on' } },
};

const LINE_LIMITS = { compact: { name: 2, d: 2 }, detailed: { name: 3, d: 6 }, badges: { name: 2, d: 3 } };

function card(f, fixture) {
  const value = aio.parseValue(fixture);
  return { name: aio.render(f.name, value), d: aio.render(f.d, value) };
}

function assertClean(text, where) {
  assert.doesNotMatch(text, /\{|unknown_|invalid_/, `${where}: unrendered template text`);
  assert.doesNotMatch(text, /\bnull\b|\bundefined\b|NaN/, `${where}: leaked empty value`);
  assert.doesNotMatch(text, /\[\s*\]|\(\s*\)/, `${where}: empty brackets`);
  for (const line of text.split('\n')) {
    assert.doesNotMatch(line, /^\s*·|·\s*$|·\s+·/, `${where}: orphaned separator in "${line}"`);
    assert.doesNotMatch(line, /^\s+|\s+$/, `${where}: stray whitespace in "${line}"`);
  }
}

const allVariants = () => Object.keys(CORE_FORMATTER_STYLES).flatMap(id =>
  CORE_SCORE_MODES.map(score => ({ id, score, style: CORE_FORMATTER_STYLES[id].style, f: buildCoreFormatter(id, { score }) })));

test('the collection is registered in the formatter library', () => {
  for (const id of Object.keys(CORE_FORMATTER_STYLES)) {
    const entry = FORMATTERS.find(f => f.id === id);
    assert.ok(entry, `${id} in FORMATTERS`);
    assert.equal(entry.name, buildCoreFormatter(id).name, `${id} is built, not hand-copied`);
    assert.ok(isCoreFormatter(id));
  }
  assert.equal(FORMATTERS[0].id, 'family-v3', 'existing order is unchanged');
  assert.equal(new Set(FORMATTERS.map(f => f.id)).size, FORMATTERS.length, 'ids are unique');
  assert.equal(CORE_FORMATTERS.length, 3);
});

test('builds are deterministic and unknown score modes fall back to plain', () => {
  for (const { id, score, f } of allVariants()) assert.deepEqual(buildCoreFormatter(id, { score }), f);
  assert.deepEqual(buildCoreFormatter('core-compact', { score: 'loud' }), buildCoreFormatter('core-compact'));
  assert.throws(() => buildCoreFormatter('family-v4'), /Unknown core formatter/);
});

test('every style renders cleanly for every fixture and score mode', { skip }, () => {
  for (const { id, score, style, f } of allVariants()) {
    for (const [name, fixture] of Object.entries(FIXTURES)) {
      const out = card(f, fixture);
      const where = `${id}/${score}/${name}`;
      assertClean(out.name, `${where} name`);
      assertClean(out.d, `${where} description`);
      assert.ok(out.name.split('\n').length <= LINE_LIMITS[style].name, `${where}: name too tall`);
      assert.ok(out.d.split('\n').length <= LINE_LIMITS[style].d, `${where}: description too tall`);
      assert.deepEqual(card(f, fixture), out, `${where}: rendering is deterministic`);
    }
  }
});

test('a missing score shows nothing; zero shows; bold digits are opt-in', { skip }, () => {
  const plain = buildCoreFormatter('core-compact', { score: 'plain' });
  const bold = buildCoreFormatter('core-compact', { score: 'bold' });
  const off = buildCoreFormatter('core-compact', { score: 'off' });
  assert.match(card(plain, FIXTURES.cachedMovie).name, /★ 87/);
  assert.match(card(bold, FIXTURES.cachedMovie).name, /★ 𝟴𝟳/);
  assert.doesNotMatch(card(off, FIXTURES.cachedMovie).name, /★/);
  assert.match(card(plain, FIXTURES.uncachedEpisode).name, /★ 0/, 'zero is a real score (the lowest in the list)');
  assert.match(card(bold, FIXTURES.uncachedEpisode).name, /★ 𝟬/);
  for (const { f } of allVariants()) {
    const out = card(f, FIXTURES.p2pEpisode);
    assert.doesNotMatch(out.name + out.d, /★/, 'null score (no Stream Expression score) shows nothing');
  }
});

test('cached, not cached, unknown and P2P are told apart', { skip }, () => {
  const compact = buildCoreFormatter('core-compact');
  const detailed = buildCoreFormatter('core-detailed');
  assert.match(card(compact, FIXTURES.cachedMovie).name, /^⚡ 4K TB$/m);
  assert.match(card(compact, FIXTURES.uncachedEpisode).name, /^⏳ 1080p RD$/m);
  assert.match(card(compact, FIXTURES.unknownCache).name, /^1080p AD$/m, 'unknown cache gets no icon, not a guess');
  assert.match(card(compact, FIXTURES.p2pEpisode).name, /^🧲 720p$/m);
  assert.match(card(detailed, FIXTURES.uncachedEpisode).name, /RD · Not cached/);
  assert.doesNotMatch(card(detailed, FIXTURES.unknownCache).name, /cached/i);
  assert.match(card(detailed, FIXTURES.p2pEpisode).name, /^P2P$/m);
});

test('movies, episodes and packs read correctly', { skip }, () => {
  const detailed = buildCoreFormatter('core-detailed');
  const compact = buildCoreFormatter('core-compact');
  const badges = buildCoreFormatter('core-badges');
  assert.match(card(detailed, FIXTURES.cachedMovie).d, /^Example Feature · 2024$/m);
  assert.match(card(detailed, FIXTURES.uncachedEpisode).d, /^Example Show · S02E05$/m);
  assert.match(card(detailed, FIXTURES.seasonPack).d, /^Example Show · S03 · Season pack$/m);
  assert.match(card(compact, FIXTURES.seasonPack).d, /· Pack$|^Pack$/m);
  assert.match(card(badges, FIXTURES.seasonPack).d, /\[PACK\]/);
});

test('long text is truncated and extra languages are summarised', { skip }, () => {
  const detailed = buildCoreFormatter('core-detailed');
  const out = card(detailed, FIXTURES.longUnicode);
  for (const line of out.d.split('\n')) assert.ok([...new Intl.Segmenter().segment(line)].length <= 80, `line too long: ${line}`);
  assert.match(out.d, /…/, 'long title and file name end in an ellipsis');
  assert.match(card(buildCoreFormatter('core-compact'), FIXTURES.p2pEpisode).d, /EN FR DE …/);
  assert.match(card(buildCoreFormatter('core-badges'), FIXTURES.p2pEpisode).d, /\[EN\] \[FR\] \[DE\] \[…\]/);
  assert.doesNotMatch(card(detailed, FIXTURES.longUnicode).d, /0 B|0 GB/, 'size 0 is treated as unknown');
});

test('the compact card is genuinely compact', { skip }, () => {
  const compact = buildCoreFormatter('core-compact');
  const out = card(compact, FIXTURES.cachedMovie);
  assert.equal(out.name, '⚡ 4K TB\n★ 87');
  assert.equal(out.d, 'BluRay REMUX · HEVC · DV HDR10 · 62 GB\nTrueHD Atmos · 7.1 · EN');
});

test('the configurator previews are current with the engine and the collection', { skip }, async () => {
  const { renderPreviews } = await import('../scripts/render-core-formatter-previews.mjs');
  const { readFileSync } = await import('node:fs');
  const committed = readFileSync(new URL('../src/data/core-formatter-previews.js', import.meta.url), 'utf8');
  assert.equal(committed, await renderPreviews(), 'run node scripts/render-core-formatter-previews.mjs');
});
