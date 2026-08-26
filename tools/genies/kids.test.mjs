import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ADULT_FILENAME_TERMS,
  KIDS_TEMPLATE_URL,
  PIN_STEPS,
  STREAM_URL,
  WUPLAY_KIDS_URL,
  applyKidsToTemplate,
  configuratorPatch,
  recommendKids,
} from './kids.mjs';

const EMOJI = /[\u{1F000}-\u{1FFFF}]/u;
const HERE = dirname(fileURLToPath(import.meta.url));

function streamFixture() {
  return {
    metadata: { id: 'brevity.core-nexus-stream', name: 'Core Nexus Stream', category: 'Single' },
    config: {
      requiredLanguages: ['English', 'Original', 'Dual Audio', 'Multi', 'Dubbed', 'Unknown'],
      preferredLanguages: ['English', 'Original', 'Dual Audio', 'Multi', 'Dubbed'],
      excludedStreamExpressions: [
        { enabled: true, expression: "/*Per-Addon Flood Guard*/ slice(addon(streams,'Meteor'),5)" },
      ],
      preferredStreamExpressions: [
        {
          enabled: true,
          expression:
            "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []",
        },
      ],
      presets: [{ type: 'zilean', instanceId: 'z1', enabled: true, options: { name: 'Zilean' } }],
      addonName: 'Core Nexus Stream',
      addonDescription: 'Core Nexus Stream',
    },
  };
}

test('recommendKids points at Stream, not Apex, and demands its own account', () => {
  const rec = recommendKids();
  assert.equal(rec.needsOwnAccount, true);
  assert.equal(rec.baseTemplate.id, 'stream');
  assert.equal(rec.baseTemplate.res, '1080p');
  assert.equal(rec.baseTemplate.url, STREAM_URL);
  assert.equal(rec.wuplayPlanUrl, WUPLAY_KIDS_URL);
  assert.equal(rec.kidsTemplateUrl, KIDS_TEMPLATE_URL);
  assert.match(rec.baseTemplate.url, /core-nexus-stream\.json$/);
  assert.equal(rec.baseTemplate.url.includes('apex'), false);
  assert.equal(rec.ageLimit, 'PG');
});

test('first install uses Stable 1080p, still not Apex', () => {
  const rec = recommendKids({ firstInstall: true });
  assert.equal(rec.baseTemplate.id, 'stable1080');
  assert.match(rec.baseTemplate.url, /core-stable-torbox-1080p\.json$/);
  assert.equal(rec.baseTemplate.url.includes('apex'), false);
});

test('WuPlay kids plan is paste-ready and kids-shaped', () => {
  const plan = JSON.parse(readFileSync(join(HERE, 'packs/wuplay-kids.json'), 'utf8'));
  assert.equal(plan.format, 'wuplay-home-plan');
  assert.equal(plan.safety.needsOwnAccount, true);
  assert.equal(plan.safety.wuplay.includeUnrated, false);
  assert.equal(plan.safety.wuplay.moviesMax, 'Older Kids');
  assert.equal(plan.safety.stremio.hasPin, false);
  assert.equal(plan.plan.trakt.connect, false);
  const names = [
    ...plan.plan.catalogs.map((c) => c.name),
    ...plan.plan.hubs.map((h) => h.name),
    ...plan.plan.screens.map((s) => s.name),
    ...plan.plan.hubs.flatMap((h) => h.cards),
  ].join(' ');
  assert.match(names, /Kids/);
  assert.match(names, /Family Movies/);
  assert.equal(/standup|horror|mindfuck|adult/i.test(names), false);
  assert.ok(plan.plan.hubs.some((h) => h.name === 'Kids'));
  assert.ok(plan.plan.screens.some((s) => s.name === 'Kids' && s.viewType === 'hub'));
});

test('WuPlay kids copy has no emoji', () => {
  const raw = readFileSync(join(HERE, 'packs/wuplay-kids.json'), 'utf8');
  assert.equal(EMOJI.test(raw), false);
});

test('apply is pure and names the kids template', () => {
  const src = streamFixture();
  const out = applyKidsToTemplate(src);
  assert.equal(src.metadata.name, 'Core Nexus Stream');
  assert.equal(out.metadata.name, 'Core Nexus Kids');
  assert.equal(out.metadata.id, 'brevity.core-nexus-kids');
  assert.equal(out.metadata.category, 'Kids');
  assert.equal(out.metadata.coreBuildsKids, true);
  assert.equal(out.config.addonName, 'Core Nexus Kids');
});

test('adult filename kill is a keyword ESE, not certification()', () => {
  const out = applyKidsToTemplate(streamFixture());
  const adult = out.config.excludedStreamExpressions.find((e) =>
    String(e.expression).includes('Kids Adult Filename Kill'),
  );
  assert.ok(adult);
  assert.match(adult.expression, /keyword\(/);
  assert.match(adult.expression, /'filename'/);
  assert.match(adult.expression, /library\(streams\)/);
  assert.match(adult.expression, /seadex\(streams\)/);
  const blob = JSON.stringify(out);
  assert.equal(blob.includes('certification('), false);
  for (const term of ADULT_FILENAME_TERMS) {
    assert.match(adult.expression, new RegExp(`'${term}'`));
  }
  assert.equal(ADULT_FILENAME_TERMS.includes('Adult'), false);
});

test('CAM kill is inserted when missing', () => {
  const out = applyKidsToTemplate(streamFixture());
  const cam = out.config.excludedStreamExpressions.find((e) =>
    String(e.expression).includes('Hard CAM Kill'),
  );
  assert.ok(cam);
  assert.match(cam.expression, /'CAM'/);
});

test('strips a pasted certification() expression', () => {
  const src = streamFixture();
  src.config.excludedStreamExpressions.push({
    enabled: true,
    expression: "/* Age Rating: max PG */ certification(streams, 'G', 'PG')",
  });
  const out = applyKidsToTemplate(src);
  assert.equal(
    out.config.excludedStreamExpressions.some((e) => String(e.expression).includes('certification(')),
    false,
  );
});

test('Apex is refused with a named error', () => {
  assert.throws(
    () => applyKidsToTemplate({ metadata: { name: 'Core Nexus 4K Apex' }, config: {} }),
    /Kids overlay refuses Apex/,
  );
});

test('missing template throws a named error', () => {
  assert.throws(() => applyKidsToTemplate(null), /needs a template object/);
});

test('Japanese booster and zilean stay put', () => {
  const out = applyKidsToTemplate(streamFixture());
  const booster = out.config.preferredStreamExpressions.find((e) =>
    String(e.expression).includes('Sub-First Anime Booster'),
  );
  assert.match(booster.expression, /Japanese/);
  assert.equal(out.config.presets[0].type, 'zilean');
  assert.equal(out.config.presets.length, 1);
});

test('does not invent hosts or community HTTP addons', () => {
  const out = applyKidsToTemplate(streamFixture());
  const blob = JSON.stringify(out) + JSON.stringify(recommendKids());
  assert.equal(blob.includes('tugaflix'), false);
  assert.equal(blob.includes('stremio://'), false);
  assert.match(recommendKids().wuplayPlanUrl, /^https:\/\/raw\.githubusercontent\.com\/brevityA\/Core-Builds\//);
});

test('PIN steps name WuPlay Age Restrictions and the missing Stremio PIN', () => {
  assert.ok(PIN_STEPS.length >= 3);
  const text = PIN_STEPS.join(' ');
  assert.match(text, /Age Restrictions/);
  assert.match(text, /Older Kids/);
  assert.match(text, /Stremio has no parental PIN/);
  assert.equal(EMOJI.test(text), false);
});

test('configuratorPatch is English PG 1080p, exclusive off', () => {
  const patch = configuratorPatch();
  assert.deepEqual(patch.langs, ['English']);
  assert.equal(patch.ageLimit, 'PG');
  assert.equal(patch.exclude4K, true);
  assert.equal(patch.langExclusive, false);
});

test('flood guard is left alone', () => {
  const out = applyKidsToTemplate(streamFixture());
  const flood = out.config.excludedStreamExpressions.find((e) =>
    String(e.expression).includes('Per-Addon Flood Guard'),
  );
  assert.ok(flood);
});

test('spoken language stays English-first with passthrough', () => {
  const out = applyKidsToTemplate(streamFixture());
  assert.equal(out.config.requiredLanguages[0], 'English');
  assert.equal(out.config.requiredLanguages.includes('Original'), true);
  assert.equal(out.config.requiredLanguages.includes('Unknown'), true);
});

test('WuPlay home starts on Continue Watching and has four rows', () => {
  const plan = JSON.parse(readFileSync(join(HERE, 'packs/wuplay-kids.json'), 'utf8'));
  const home = plan.plan.layout.find((l) => l.layoutType === 'home').rowOrder;
  assert.equal(home[0], 'Continue Watching');
  assert.equal(home.length, 4);
  assert.equal(plan.plan.catalogs.filter((c) => c.showHome).length, 4);
});
