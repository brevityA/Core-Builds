/**
 * Optional-extras toggles: neko-bt · sootio · webstreamr · yastream.
 *
 * These four follow the `knaben` precedent — a carousel card with no credential, no AIOStreams
 * option beyond the base set, and one emission site. Two traps made this test behavioural rather
 * than string-matching:
 *
 * 1. All four were ALREADY emitted disabled, on several lanes (`sootio-core-builds`, `wsr-1`,
 *    `neko-bt-core-builds`). Adding a second emission for the toggle produces a duplicate
 *    instanceId, so the toggle flips the existing advert's `enabled` and only emits from the
 *    keyless branch where no advert exists. `no duplicate instanceIds per config` below pins it.
 * 2. The Stable/Balanced output profiles filter stream presets down to STABLE_STREAM_TYPES ∪
 *    explicit ones. Without the OPTIONAL_EXTRAS_STREAM_TYPES arm of isExplicitPreset(), a
 *    switched-on extra is dropped again two steps after being enabled — the toggle appears to
 *    work in the UI and changes nothing in the output.
 *
 * Lane gates are deliberate, not gaps: Sootio validates as debrid/usenet-only on v2.33+ and an
 * enabled-but-unsatisfiable preset rejects the WHOLE config (not just that preset), so it stays
 * off on the p2p and http lanes. The usenet route returns its own list before the keyless branch
 * runs, which is also true of `knaben` today — the whole extras set is inert there, and enabling
 * one extras preset into that lane is a separate decision from this one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OPTIONAL_SCRAPER_DEFS } from '../src/data/scrapers.js';
import { AIO_PRESET_IDS } from '../src/data/generated/aiostreams-presets.js';
import { generateTemplate } from '../../packages/core/src/generate-template.js';

const TOGGLES = ['neko-bt', 'sootio', 'webstreamr', 'yastream'];
const appSrc = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const coreSrc = await readFile(new URL('../../packages/core/src/generate-template.js', import.meta.url), 'utf8');
const appDefs = await readFile(new URL('../src/data/scrapers.js', import.meta.url), 'utf8');
const coreDefs = await readFile(new URL('../../packages/core/src/scrapers.js', import.meta.url), 'utf8');
const appPolicySrc = await readFile(new URL('../src/core/output-profile-policy.js', import.meta.url), 'utf8');
const corePolicySrc = await readFile(new URL('../../packages/core/src/output-profile-policy.js', import.meta.url), 'utf8');

const LANES = {
  realdebrid: { service: 'realdebrid' },
  torbox: { service: 'torbox' },
  'multi+debrid': { service: 'multi', multiServices: ['torbox-pro', 'realdebrid'] },
  'multi+http': { service: 'multi', multiServices: ['http'] },
  p2p: { service: 'p2p' },
  http: { service: 'http' },
  usenet: { service: 'usenet' },
  easynews: { service: 'easynews' },
};
const CONTENTS = ['all', 'anime', 'live'];

/** Emitted presets for a config. The standalone generator returns { metadata, config }. */
function presetsOf(input) {
  const res = generateTemplate(input, {});
  const presets = res?.config?.presets ?? res?.addons?.presets;
  assert.ok(Array.isArray(presets) && presets.length, 'generator produced no preset array');
  return presets;
}

test('the two generator data files stay byte-identical', () => {
  // packages/core and configurator/src ship separate copies of the defs; drift means the CLI
  // and the UI offer different extras, and only one of them gets tested.
  assert.equal(appDefs, coreDefs, 'configurator/src/data/scrapers.js diverged from packages/core/src/scrapers.js');
});

test('every new toggle is a preset id the pinned AIOStreams ref can actually resolve', () => {
  // Generated from AIOStreams e694b6a (v2.34.0) — see src/data/generated/aiostreams-presets.js.
  // This is the repo's own record of PresetManager.fromId(); guessing an id here is how PR #557
  // shipped a `debrider` preset no host could load.
  for (const id of TOGGLES) {
    const def = OPTIONAL_SCRAPER_DEFS.find(x => x.id === id);
    assert.ok(def, `${id} missing from OPTIONAL_SCRAPER_DEFS`);
    assert.ok(AIO_PRESET_IDS.includes(def.presetType), `${id} → ${def.presetType} is not in AIO_PRESET_IDS`);
    assert.ok(!def.credKey && !def.apiUrl, `${id} must stay keyless — a credKey would route it to the jackett/prowlarr branch`);
    assert.ok(['debrid', 'usenet'].includes(def.cat), `${id} needs a carousel category`);
  }
});

test('no extra is emitted when its toggle is off, on any lane', () => {
  for (const lane of Object.keys(LANES)) {
    for (const content of CONTENTS) {
      const found = presetsOf({ ...LANES[lane], content, optionalScrapers: [] })
        .filter(p => TOGGLES.includes(p.type));
      assert.deepEqual(found.map(p => p.type), [], `${lane}/${content}: preset(s) emitted without a toggle`);
    }
  }
});

// The contract this feature is judged on: switched on ⇒ exactly one enabled instance, on the
// lanes where the preset can actually be satisfied by AIOStreams v2.33+.
const EXPECT = {
  'multi+debrid': { 'neko-bt': 1, sootio: 1, webstreamr: 1, yastream: 1 },
  realdebrid:     { 'neko-bt': 1, sootio: 1, webstreamr: 1, yastream: 1 },
  torbox:         { 'neko-bt': 1, sootio: 1, webstreamr: 1, yastream: 1 },
  'multi+http':   { 'neko-bt': 1, sootio: 1, webstreamr: 1, yastream: 1 },
  easynews:       { 'neko-bt': 1, sootio: 1, webstreamr: 1, yastream: 1 },
  // Sootio: debrid/usenet-only on v2.33+, so a p2p or http route must never enable it.
  p2p:            { 'neko-bt': 1, sootio: 0, webstreamr: 1, yastream: 1 },
  http:           { 'neko-bt': 0, sootio: 0, webstreamr: 1, yastream: 1 },
  // Usenet route returns its own list before the extras branch — see the header note.
  usenet:         { 'neko-bt': 0, sootio: 0, webstreamr: 0, yastream: 0 },
};

test('each toggle produces exactly one enabled instance on the lanes that support it', () => {
  for (const [lane, expectation] of Object.entries(EXPECT)) {
    for (const [id, want] of Object.entries(expectation)) {
      for (const content of CONTENTS) {
        const hits = presetsOf({ ...LANES[lane], content, optionalScrapers: [id] })
          .filter(p => p.type === id);
        assert.equal(hits.length, want, `${lane}/${content}: ${id} emitted ${hits.length}× (want ${want})`);
        for (const p of hits) {
          assert.equal(p.enabled, true, `${lane}/${content}: ${id} emitted but left disabled — the toggle does nothing`);
          assert.ok(p.instanceId, `${id} emitted without an instanceId`);
        }
      }
    }
  }
});

test('enabling every extra at once still yields one instance per preset', () => {
  // The duplicate-advert trap: 3 of these 4 are emitted disabled elsewhere, so a naive second
  // emission shows up as two presets with the same type (or, worse, the same instanceId).
  for (const lane of Object.keys(LANES)) {
    for (const content of CONTENTS) {
      const presets = presetsOf({ ...LANES[lane], content, optionalScrapers: TOGGLES });
      const types = presets.map(p => p.type);
      for (const t of new Set(types)) assert.equal(types.filter(x => x === t).length, 1, `${lane}/${content}: ${t} emitted twice`);
      const ids = presets.map(p => p.instanceId);
      for (const i of new Set(ids)) assert.equal(ids.filter(x => x === i).length, 1, `${lane}/${content}: duplicate instanceId ${i}`);
    }
  }
});

test('emitted options stay inside the base set every preset accepts at the pinned ref', () => {
  // name/timeout come from baseOptions() for all four; mediaTypes exists on neko-bt. Anything
  // beyond this needs reading the preset source first — a bare `apiKey` is the exact bug the
  // debridio/jackett regressions were (option the preset never reads, config rejected).
  const allowed = { 'neko-bt': ['name', 'timeout', 'mediaTypes'], sootio: ['name', 'timeout'], webstreamr: ['name', 'timeout'], yastream: ['name', 'timeout'] };
  for (const [lane, expectation] of Object.entries(EXPECT)) {
    for (const id of Object.keys(expectation)) {
      const presets = presetsOf({ ...LANES[lane], content: 'all', optionalScrapers: [id] }).filter(p => p.type === id);
      for (const p of presets) {
        const keys = Object.keys(p.options || {});
        assert.deepEqual(keys.filter(k => !allowed[id].includes(k)), [], `${lane}: ${id} emits option(s) outside the verified base set`);
        assert.ok(!('apiKey' in (p.options || {})), `${id} must not emit a bare apiKey`);
        assert.ok(!('url' in (p.options || {})), `${id} must not emit a url override at the option level`);
      }
    }
  }
});

test('the two generators emit the same object literals for the toggled extras', () => {
  const lit = (src, type) => [...src.matchAll(new RegExp(`\\{ type:'${type}', instanceId:[^\\n]*\\},`, 'g'))]
    .map(m => m[0].replace(/\s+/g, ' ').replace('enabled:extrasOn(', 'enabled:EXTRAS(').replace('enabled:true,', 'enabled:EXTRA_ON,'))
    .sort();
  for (const type of TOGGLES) {
    const a = lit(appSrc, type), c = lit(coreSrc, type);
    assert.ok(a.length, `app.js emits no '${type}' preset literal`);
    assert.deepEqual(new Set(a), new Set(c), `'${type}' emission differs between app.js and packages/core`);
  }
});

test('the output profile keeps a switched-on extra instead of filtering it back out', () => {
  // Regression guard for trap 2 in the header: stablePresets() only keeps stream presets that
  // are STABLE_STREAM_TYPES or explicitly asked for.
  for (const [name, src] of [['configurator', appPolicySrc], ['packages/core', corePolicySrc]]) {
    for (const id of TOGGLES) {
      assert.ok(src.includes(`'${id}'`), `${name}: OPTIONAL_EXTRAS_STREAM_TYPES must list '${id}' or its toggle is dropped from Stable/Balanced`);
    }
    assert.match(src, /if \(OPTIONAL_EXTRAS_STREAM_TYPES\.has\(type\)\) return optional\.has\(type\);/);
    assert.ok(src.includes("if (type === 'newznab') return false;"), `${name}: the newznab Stable exclusion must survive the generalisation`);
  }
});

test('every optional scraper def still matches exactly one generation branch', () => {
  // Same invariant as optional-scrapers.test.mjs, restated for the new ids so a def added here
  // cannot quietly fall into two branches (jackett/prowlarr did exactly this in PR #557).
  const branches = [x => !x.credKey && !x.apiUrl, x => x.credKey && !x.apiUrl && x.presetType !== 'nzbhydra',
                    x => x.presetType === 'nzbhydra', x => x.presetType === 'newznab'];
  for (const def of OPTIONAL_SCRAPER_DEFS) {
    const keyless = !def.credKey && !def.apiUrl;
    const other = branches.slice(1).some(f => f(def));
    assert.equal(Number(keyless) + Number(other), 1, `${def.id} must land in exactly one branch`);
  }
});

test('the generators keep the emission-site invariants the toggles rely on', () => {
  for (const [name, src] of [['app.js', appSrc], ['packages/core', coreSrc]]) {
    for (const id of ['neko-bt', 'sootio', 'webstreamr', 'yastream']) {
      // Two adverts are allowed only when they sit on mutually exclusive lanes (webstreamr: the
      // pure-http list and the multi+http block). "Exactly one per config" is the behavioural
      // test above's job; this only stops a third site appearing.
      const flipped = (src.match(new RegExp(`enabled:extrasOn\\('${id}'\\)`, 'g')) || []).length;
      assert.ok(flipped >= 1 && flipped <= 2, `${name}: '${id}' advert flipped ${flipped}× (want 1 or 2, on exclusive lanes)`);
    }
    // Sootio must never be enabled on a route that cannot back it.
    assert.match(src, /enabled:extrasOn\('sootio'\) && !isP2P/, `${name}: the p2p guard on Sootio is load-bearing`);
    // neko-bt's anime advert and the keyless emission are mutually exclusive by this predicate.
    assert.match(src, /animeContent \? null :/, `${name}: neko-bt would double-emit without the animeContent guard`);
  }
});
