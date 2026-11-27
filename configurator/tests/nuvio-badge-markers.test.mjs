// AIO Enhanced Nuvio badges (v3.54): the markers ride on every built-in stream-card
// style without changing what the card shows, and the published Enhanced pack fires
// on them. Rendered with AIOStreams' own formatter engine at the pin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FORMATTERS } from '../src/data/formatters.js';
import { CORE_SCORE_MODES, buildCoreFormatter, isCoreFormatter } from '../src/data/core-formatters.js';
import { ENHANCED_MARKERS, ENHANCED_PACK_STATE, ENHANCED_PACK_URL, withNuvioBadgeMarkers, stripNuvioBadgeMarkers } from '../src/core/nuvio-badge-markers.js';
import { buildBadgePack, compileNuvioPattern, FORMATTER_FIELD_LIMIT } from '../../tools/badges/core.mjs';
import { NUVIO_BADGE_PACKS, nuvioBadgePack } from '../src/core/nuvio-badges.js';
import { loadFormatterEngine } from './helpers/aiostreams-formatter-engine.mjs';
import { PREVIEW_SAMPLE } from './fixtures/core-formatter-samples.mjs';

const published = JSON.parse(readFileSync(new URL('../../tools/badges/published/core-neon-enhanced.json', import.meta.url), 'utf8'));
const styles = FORMATTERS.flatMap(f => isCoreFormatter(f.id)
  ? CORE_SCORE_MODES.map(score => ({ id: `${f.id}/${score}`, ...buildCoreFormatter(f.id, { score }) }))
  : [{ id: f.id, name: f.name, d: f.d }]);
const INVISIBLE = /[⁠​‌]/g;

test('the markers are the published AIO Enhanced pack, badge for badge', () => {
  assert.deepEqual(buildBadgePack(ENHANCED_PACK_STATE), published);
  assert.equal(ENHANCED_MARKERS.length, published.filters.length);
  assert.equal(ENHANCED_PACK_URL, NUVIO_BADGE_PACKS.enhanced.url);
  assert.equal(nuvioBadgePack('samsung', { enhanced: true }).id, 'enhanced');
});

test('every built-in stream-card style takes the markers within the per-field limit', () => {
  assert.ok(styles.length >= 20, `found ${styles.length} styles`);
  for (const s of styles) {
    const out = withNuvioBadgeMarkers(s);
    assert.equal(out.ok, true, `${s.id} does not fit`);
    assert.ok(out.name.length <= FORMATTER_FIELD_LIMIT && out.d.length <= FORMATTER_FIELD_LIMIT, s.id);
    assert.ok(out.name.endsWith(s.name) && out.d.endsWith(s.d), `${s.id}: the style itself must be untouched`);
  }
});

test('a style the markers cannot fit beside is left unchanged', () => {
  const big = { name: 'x'.repeat(FORMATTER_FIELD_LIMIT), d: 'y'.repeat(FORMATTER_FIELD_LIMIT) };
  assert.deepEqual(withNuvioBadgeMarkers(big), { ok: false, ...big });
});

test('stripping finds and removes exactly the markers, for re-import', () => {
  for (const s of styles) {
    const out = withNuvioBadgeMarkers(s);
    const back = stripNuvioBadgeMarkers({ name: out.name, description: out.d });
    assert.deepEqual(back, { name: s.name, description: s.d, found: true }, s.id);
    assert.equal(stripNuvioBadgeMarkers({ name: s.name, description: s.d }).found, false, s.id);
  }
});

let aio = null;
try { aio = await loadFormatterEngine(); }
catch (err) { if (process.env.CI) throw new Error(`could not load the AIOStreams formatter engine at the pin: ${err.message}`); }
const skip = aio ? false : 'AIOStreams formatter engine unreachable (offline); CI requires it';

const render = (f, stream = {}) => {
  const v = aio.parseValue({ ...PREVIEW_SAMPLE, stream: { ...PREVIEW_SAMPLE.stream, ...stream } });
  return `${aio.render(f.name, v)}\n${aio.render(f.d, v)}`;
};
const firing = text => published.filters.filter(f => compileNuvioPattern(f.pattern).test(text)).map(f => f.id);

test('the visible card is identical with the markers in every style', { skip }, () => {
  for (const s of styles) {
    const plain = render(s);
    const marked = render(withNuvioBadgeMarkers(s));
    assert.equal(marked.replace(INVISIBLE, ''), plain.replace(INVISIBLE, ''), s.id);
    assert.notEqual(marked, plain, `${s.id}: no marker was written`);
  }
});

test('the Enhanced pack fires on the markers AIOStreams writes', { skip }, () => {
  for (const s of styles) {
    const ids = firing(render(withNuvioBadgeMarkers(s)));
    for (const id of ['res-4k', 'vis-dv']) assert.ok(ids.includes(id), `${s.id}: ${id} missing from ${ids.join(',')}`);
    const hd = firing(render(withNuvioBadgeMarkers(s), { resolution: '1080p', visualTags: ['SDR'] }));
    assert.ok(!hd.includes('res-4k') && !hd.includes('vis-dv'), `${s.id}: 1080p SDR still fires ${hd.join(',')}`);
  }
});
