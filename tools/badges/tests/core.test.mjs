import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { BADGES, GROUPS, THEMES, defaultBuilderState } from '../catalog.mjs';
import { MARKER_TERMS } from '../marker-terms.mjs';
import {
  FORMATTER_FIELD_LIMIT,
  badgeMatchesText,
  buildBadgePack,
  buildCompanionFormatter,
  compileNuvioPattern,
  makeConfiguratorHandoff,
  markerToken,
  normalizeBuilderState,
  parseConfiguratorHandoff,
  validateBadgePack,
} from '../core.mjs';

const fixedTime = '2026-08-22T00:00:00.000Z';
const defaultState = defaultBuilderState();
const byId = new Map(BADGES.map((badge) => [badge.id, badge]));
const matches = (id, value) => badgeMatchesText(byId.get(id), value);

test('catalog identifiers, marker codes, and asset paths are unique', async () => {
  assert.equal(new Set(GROUPS.map((group) => group.id)).size, GROUPS.length);
  assert.equal(new Set(BADGES.map((badge) => badge.id)).size, BADGES.length);
  assert.equal(new Set(BADGES.map((badge) => badge.markerCode)).size, BADGES.length);
  assert.ok(BADGES.length >= 100, 'progressive catalog should remain comprehensive');
  for (const badge of BADGES) {
    assert.ok(GROUPS.some((group) => group.id === badge.groupId), `${badge.id} has an unknown group`);
    if (badge.markerRule[1] === 'match') assert.ok(MARKER_TERMS[badge.id], `${badge.id} has no AIO marker terms`);
    await access(new URL(`../assets/${badge.asset}`, import.meta.url));
  }
  assert.deepEqual(Object.keys(MARKER_TERMS).sort(), BADGES.filter((badge) => badge.markerRule[1] === 'match').map((badge) => badge.id).sort());
});

test('asset generator and catalog stay in lockstep', async () => {
  const generator = await readFile(new URL('../scripts/generate-assets.mjs', import.meta.url), 'utf8');
  assert.match(generator, /for \(const badge of BADGES\)/);
});

test('all universal patterns compile with the Nuvio inline-flag adapter', () => {
  for (const badge of BADGES) {
    assert.ok(compileNuvioPattern(badge.pattern), `${badge.id} has an invalid portable pattern`);
    assert.ok(!badge.pattern.includes('(?<='), `${badge.id} must not use lookbehind`);
    assert.ok(!badge.pattern.includes('(?<!'), `${badge.id} must not use negative lookbehind`);
  }
});

test('higher-priority quality and visual patterns suppress overlapping lower badges', () => {
  const remux = 'Movie.2026.2160p.UHD.BluRay.REMUX.DV.HDR10Plus.TrueHD.Atmos.7.1.HEVC';
  assert.equal(matches('src-remux', remux), true);
  assert.equal(matches('src-bluray', remux), false, 'BluRay must not duplicate Remux');
  assert.equal(matches('vis-hdr10plus', remux), true);
  assert.equal(matches('vis-hdr10', remux), false, 'HDR10 must not duplicate HDR10+');
  assert.equal(matches('vis-hdr', remux), false, 'generic HDR must not duplicate HDR10+');

  const enhanced = 'Movie.2160p.IMAX.Enhanced.HDR10';
  assert.equal(matches('vis-imax-enhanced', enhanced), true);
  assert.equal(matches('vis-imax', enhanced), false, 'IMAX must not duplicate IMAX Enhanced');
});

test('audio hierarchy avoids carrier false positives', () => {
  assert.equal(matches('aud-ddplus', 'WEB-DL.DDP5.1.Atmos'), true);
  assert.equal(matches('aud-dd', 'WEB-DL.DDP5.1.Atmos'), false);
  assert.equal(matches('aud-dtshdma', 'BluRay.DTS-HD.MA.7.1'), true);
  assert.equal(matches('aud-dtshd', 'BluRay.DTS-HD.MA.7.1'), false);
  assert.equal(matches('aud-dts', 'BluRay.DTS-HD.MA.7.1'), false);
});

test('cached and uncached patterns are mutually exclusive', () => {
  assert.equal(matches('status-cached', '⚡ CACHED INSTANT'), true);
  assert.equal(matches('status-uncached', '⚡ CACHED INSTANT'), false);
  assert.equal(matches('status-cached', 'UNCACHED stream'), false);
  assert.equal(matches('status-uncached', 'UNCACHED stream'), true);
  assert.equal(matches('status-cached', 'not cached'), false);
});

test('default state selects essentials and leaves advanced categories opt-in', () => {
  const essentials = new Set(GROUPS.filter((group) => group.essential).map((group) => group.id));
  assert.ok(defaultState.selectedIds.length >= 50);
  for (const id of defaultState.selectedIds) assert.ok(essentials.has(byId.get(id).groupId));
  assert.ok(BADGES.some((badge) => !badge.defaultEnabled));
});

test('state normalization preserves a deliberate empty selection and repairs order', () => {
  const normalized = normalizeBuilderState({
    allowEmpty:true,
    selectedIds:[],
    groupOrder:['audio','audio','bogus'],
    badgeOrder:['aud-atmos','aud-atmos','bogus'],
    theme:'not-real',
  });
  assert.deepEqual(normalized.selectedIds, []);
  assert.equal(normalized.groupOrder[0], 'audio');
  assert.equal(new Set(normalized.groupOrder).size, GROUPS.length);
  assert.equal(new Set(normalized.badgeOrder).size, BADGES.length);
  assert.equal(normalized.theme, 'neon');
});

test('universal output has the official Nuvio filter shape and selected-only groups', () => {
  const state = {
    ...defaultState,
    mode:'universal',
    selectedIds:['aud-atmos','res-4k'],
    groupOrder:['audio','resolution',...defaultState.groupOrder.filter((id) => !['audio','resolution'].includes(id))],
    groupColors:{ ...defaultState.groupColors, audio:'#112233' },
  };
  const pack = buildBadgePack(state, { generatedAt:fixedTime });
  assert.deepEqual(Object.keys(pack).sort(), ['filters','groups']);
  assert.deepEqual(pack.groups.map((group) => group.id), ['audio','resolution']);
  assert.deepEqual(pack.filters.map((filter) => filter.id), ['aud-atmos','res-4k']);
  assert.equal(pack.filters[0].pattern, byId.get('aud-atmos').pattern);
  assert.equal(pack.filters[0].tagColor, '#C7112233');
  assert.equal(pack.filters[0].borderColor, '#FF112233');
  assert.equal(pack.filters[0].type, 'filter');
  assert.match(pack.filters[0].imageURL, /^https:\/\/raw\.githubusercontent\.com\/brevityA\/Core-Builds\//);
  assert.match(pack.filters[0].imageURL, /\.png$/);
  assert.equal(validateBadgePack(pack), true);
});

test('enhanced output uses unique exact hidden markers', () => {
  const state = { ...defaultState, mode:'enhanced', selectedIds:BADGES.map((badge) => badge.id) };
  const pack = buildBadgePack(state, { generatedAt:fixedTime });
  const patterns = pack.filters.map((filter) => filter.pattern);
  assert.equal(new Set(patterns).size, BADGES.length);
  assert.ok(patterns.every((pattern) => pattern.startsWith('\u2060') && pattern.endsWith('\u2060')));
  assert.equal(patterns[0], markerToken(byId.get(pack.filters[0].id).markerCode));
});

test('all themes produce Nuvio-compatible ARGB colors', () => {
  for (const theme of Object.keys(THEMES)) {
    const pack = buildBadgePack({ ...defaultState, theme, selectedIds:['res-4k'] }, { generatedAt:fixedTime });
    assert.match(pack.filters[0].tagColor, /^#[0-9A-F]{8}$/);
    assert.match(pack.filters[0].borderColor, /^#[0-9A-F]{8}$/);
    assert.equal(pack.filters[0].tagStyle, 'filled');
  }
});

test('complete enhanced catalog fits both formatter fields with safety headroom', () => {
  const formatter = buildCompanionFormatter({
    ...defaultState,
    mode:'enhanced',
    selectedIds:BADGES.map((badge) => badge.id),
  });
  assert.ok(formatter.name.length <= FORMATTER_FIELD_LIMIT, `${formatter.name.length} > ${FORMATTER_FIELD_LIMIT}`);
  assert.ok(formatter.description.length <= FORMATTER_FIELD_LIMIT, `${formatter.description.length} > ${FORMATTER_FIELD_LIMIT}`);
  assert.ok(formatter.name.includes('\u2060') || formatter.description.includes('\u2060'));
  const combined = formatter.name + formatter.description;
  for (const badge of BADGES) {
    const marker = markerToken(badge.markerCode);
    assert.equal(combined.split(marker).length - 1, 1, `${badge.id} marker count`);
  }
  assert.equal(combined.includes('(?i)'), false, 'AIO formatter checks use literal prefix operators, not regex syntax');
  for (const [id, definition] of Object.entries(MARKER_TERMS)) {
    assert.ok(['exact','contains'].includes(definition.mode), `${id} marker mode`);
    assert.ok(definition.values.length > 0, `${id} marker values`);
    assert.ok(definition.values.every((term) => !/["\[\]\r\n]/.test(term) && !term.includes('::')), `${id} parser-safe terms`);
  }
});

test('universal formatter contains no hidden marker payload', () => {
  const formatter = buildCompanionFormatter({ ...defaultState, mode:'universal' });
  assert.equal(formatter.name.includes('\u2060'), false);
  assert.equal(formatter.description.includes('\u2060'), false);
});

test('Configurator handoff is versioned, bounded, and expires after ten minutes', () => {
  const formatter = buildCompanionFormatter(defaultState);
  const now = 1_000_000;
  const handoff = makeConfiguratorHandoff(formatter, now);
  const parsed = parseConfiguratorHandoff(JSON.stringify(handoff), now + 1000);
  assert.equal(parsed.name, formatter.name);
  assert.equal(parsed.description, formatter.description);
  assert.equal(parseConfiguratorHandoff(JSON.stringify(handoff), now + 10 * 60 * 1000 + 1), null);
  assert.equal(parseConfiguratorHandoff('{bad json', now), null);
  assert.equal(parseConfiguratorHandoff(JSON.stringify({ ...handoff, source:'other' }), now), null);
});

test('badge pack validator rejects missing images, orphan groups, and invalid patterns', () => {
  const pack = buildBadgePack({ ...defaultState, selectedIds:['res-4k'] }, { generatedAt:fixedTime });
  assert.throws(() => validateBadgePack({ ...pack, filters:[{ ...pack.filters[0], imageURL:'' }] }), /missing a required field/);
  assert.throws(() => validateBadgePack({ ...pack, filters:[{ ...pack.filters[0], groupId:'missing' }] }), /missing group/);
  assert.throws(() => validateBadgePack({ ...pack, filters:[{ ...pack.filters[0], pattern:'(?<' }] }), /invalid pattern/);
});
