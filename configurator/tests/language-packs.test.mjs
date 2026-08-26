import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_AIO_NAMES,
  KNOWN_OPTIONAL_PRESETS,
  LANGUAGE_PACKS,
  PASSTHROUGH,
  REQUESTED_PACK_IDS,
  applyLanguagePackToTemplate,
  configuratorPatch,
  getLanguagePack,
  listLanguagePacks,
  resolvePackId,
  subdlLanguagesFor,
} from '../src/data/language-packs.js';

const EMOJI = /[\u{1F000}-\u{1FFFF}]/u;

function movieFixture() {
  return {
    metadata: { id: 'test.stream', name: 'Core Nexus Stream', category: 'Single' },
    config: {
      requiredLanguages: ['English', 'Original', 'Dual Audio', 'Multi', 'Dubbed', 'Unknown'],
      preferredLanguages: ['English', 'Original', 'Dual Audio', 'Multi', 'Dubbed'],
      excludedLanguages: [],
      includedLanguages: [],
      excludedStreamExpressions: [
        { enabled: true, expression: "/*Per-Addon Flood Guard*/ slice(addon(streams,'Meteor'),5)" },
        {
          enabled: true,
          expression:
            "/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, 'English', 'Original', 'Multi', 'Dual Audio', 'Dubbed', 'Unknown')), streams) : []",
        },
      ],
      preferredStreamExpressions: [
        { enabled: true, expression: "/* Language Preference — English */ language(streams,'English')" },
        {
          enabled: true,
          expression:
            "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []",
        },
      ],
      includedStreamExpressions: [
        {
          enabled: true,
          expression: "/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')",
        },
      ],
      presets: [
        { type: 'zilean', instanceId: 'z1', enabled: true, options: { name: 'Zilean' } },
        {
          type: 'aiosubtitle',
          instanceId: 'aio-sub-1',
          enabled: true,
          options: { name: 'AIOSubtitle', languages: ['en'] },
        },
        {
          type: 'subdl',
          instanceId: 'subdl-1',
          enabled: false,
          options: { name: 'SubDL', language: ['EN'] },
        },
      ],
    },
  };
}

function animeFixture() {
  return {
    metadata: { id: 'test.anime', name: 'Core Nexus Anime', category: 'Anime' },
    config: {
      requiredLanguages: [],
      preferredLanguages: ['Dual Audio', 'English', 'Japanese', 'Original'],
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
      presets: [
        {
          type: 'aiosubtitle',
          instanceId: 'aio-sub-1',
          enabled: true,
          options: { name: 'AIOSubtitle', languages: ['en'] },
        },
      ],
    },
  };
}

test('requested eight packs plus English exist', () => {
  assert.ok(LANGUAGE_PACKS.en);
  for (const id of REQUESTED_PACK_IDS) {
    assert.ok(LANGUAGE_PACKS[id], id);
  }
  assert.equal(listLanguagePacks().length, 9);
});

test('every pack has a complete schema-safe shape', () => {
  for (const pack of Object.values(LANGUAGE_PACKS)) {
    assert.ok(pack.id && pack.name && pack.note && pack.catalogHint);
    assert.ok(Array.isArray(pack.aioNames) && pack.aioNames.length >= 1);
    for (const name of pack.aioNames) {
      assert.equal(ALLOWED_AIO_NAMES.includes(name), true, `${pack.id} ${name}`);
    }
    assert.ok(Array.isArray(pack.subtitleCodes) && pack.subtitleCodes.length >= 1);
    for (const code of pack.subtitleCodes) {
      assert.match(code, /^[a-z]{2}$/);
    }
    assert.match(pack.tmdbLanguage, /^[a-z]{2}$/);
    assert.match(pack.tmdbRegion, /^[A-Z]{2}$/);
    assert.equal(typeof pack.exclusive, 'boolean');
    assert.equal(typeof pack.foreignLangKill, 'boolean');
    for (const type of pack.optionalPresetTypes) {
      assert.equal(KNOWN_OPTIONAL_PRESETS.includes(type), true, `${pack.id} ${type}`);
    }
  }
});

test('PT-BR is Portuguese first, English second, exclusive off', () => {
  const pack = getLanguagePack('pt-BR');
  assert.deepEqual(pack.aioNames, ['Portuguese', 'English']);
  assert.equal(pack.exclusive, false);
  assert.equal(pack.tmdbRegion, 'BR');
  assert.deepEqual(pack.subtitleCodes, ['pt', 'en']);
});

test('apply is pure and rewrites requiredLanguages', () => {
  const src = movieFixture();
  const out = applyLanguagePackToTemplate(src, 'pt-BR');
  assert.deepEqual(src.config.requiredLanguages[0], 'English');
  assert.equal(src.config.presets[1].options.languages[0], 'en');
  assert.equal(out.config.requiredLanguages[0], 'Portuguese');
  assert.equal(out.config.requiredLanguages.includes('English'), true);
  for (const token of PASSTHROUGH) {
    assert.equal(out.config.requiredLanguages.includes(token), true, token);
  }
  assert.equal(out.metadata.coreBuildsLanguagePack, 'pt-BR');
});

test('foreign language kill keeps Portuguese, anime exemption, library and SeaDex', () => {
  const out = applyLanguagePackToTemplate(movieFixture(), 'fr');
  const flk = out.config.excludedStreamExpressions.find((e) =>
    String(e.expression).includes('Foreign Language Kill'),
  );
  assert.ok(flk);
  assert.match(flk.expression, /'French'/);
  assert.match(flk.expression, /'English'/);
  assert.match(flk.expression, /anime exempt/);
  assert.match(flk.expression, /queryType == 'movie' or queryType == 'series'/);
  assert.match(flk.expression, /library\(streams\)/);
  assert.match(flk.expression, /seadex\(streams\)/);
});

test('Japanese anime booster is left alone', () => {
  const out = applyLanguagePackToTemplate(movieFixture(), 'de');
  const booster = out.config.preferredStreamExpressions.find((e) =>
    String(e.expression).includes('Sub-First Anime Booster'),
  );
  assert.ok(booster);
  assert.match(booster.expression, /language\(cached\(streams\), 'Japanese'\)/);
  const flood = out.config.excludedStreamExpressions.find((e) =>
    String(e.expression).includes('Per-Addon Flood Guard'),
  );
  assert.ok(flood);
});

test('exclusive mode drops English from required and adds an include expression', () => {
  const out = applyLanguagePackToTemplate(movieFixture(), 'es', { exclusive: true });
  assert.equal(out.config.requiredLanguages.includes('English'), false);
  assert.equal(out.config.requiredLanguages.includes('Spanish'), true);
  assert.equal(out.config.requiredLanguages.includes('Original'), true);
  const excl = out.config.includedStreamExpressions.find((e) =>
    String(e.expression).includes('Language Exclusive'),
  );
  assert.ok(excl);
  assert.match(excl.expression, /'Spanish'/);
  assert.equal(excl.expression.includes("'English'"), false);
});

test('unknown pack id throws a named error', () => {
  assert.throws(() => getLanguagePack('klingon'), /Unknown language pack: klingon/);
  assert.throws(() => resolvePackId(''), /needs a language pack id/);
});

test('missing template throws a named error', () => {
  assert.throws(() => applyLanguagePackToTemplate(null, 'en'), /needs a template object/);
});

test('subtitle presets are patched; SubDL stays uppercase and at most five', () => {
  const out = applyLanguagePackToTemplate(movieFixture(), 'pt-BR');
  const aio = out.config.presets.find((p) => p.type === 'aiosubtitle');
  const subdl = out.config.presets.find((p) => p.type === 'subdl');
  assert.deepEqual(aio.options.languages, ['pt', 'en']);
  assert.deepEqual(subdl.options.language, ['PT', 'EN']);
  const codes = subdlLanguagesFor(getLanguagePack('hi'));
  assert.deepEqual(codes, ['HI', 'EN']);
  assert.ok(codes.length <= 5);
  assert.equal(codes.every((c) => c === c.toUpperCase()), true);
});

test('anime templates keep Japanese, leave required empty, and do not gain a kill', () => {
  const src = animeFixture();
  const out = applyLanguagePackToTemplate(src, 'pt-BR');
  assert.deepEqual(out.config.requiredLanguages, []);
  assert.equal(out.config.preferredLanguages.includes('Japanese'), true);
  assert.equal(out.config.preferredLanguages.includes('Portuguese'), true);
  const flk = (out.config.excludedStreamExpressions || []).some((e) =>
    String(e.expression).includes('Foreign Language Kill'),
  );
  assert.equal(flk, false);
  const booster = out.config.preferredStreamExpressions.find((e) =>
    String(e.expression).includes('Sub-First Anime Booster'),
  );
  assert.match(booster.expression, /Japanese/);
});

test('optional presets are named, never auto-enabled, never invented', () => {
  const out = applyLanguagePackToTemplate(movieFixture(), 'pt-BR');
  const types = out.config.presets.map((p) => p.type);
  assert.equal(types.includes('brazuca-torrents'), false);
  assert.equal(types.includes('tugaflix'), false);
  const blob = JSON.stringify(out);
  assert.equal(blob.includes('tugaflix'), false);
  assert.equal(blob.includes('stremio://'), false);
  assert.equal(getLanguagePack('pt-BR').optionalPresetTypes.includes('brazuca-torrents'), true);
  assert.equal(getLanguagePack('fr').optionalPresetTypes.includes('astream'), true);
});

test('pack names and notes have no emoji', () => {
  for (const pack of Object.values(LANGUAGE_PACKS)) {
    assert.equal(EMOJI.test(pack.name), false, pack.id);
    assert.equal(EMOJI.test(pack.note), false, pack.id);
    assert.equal(EMOJI.test(pack.catalogHint), false, pack.id);
  }
});

test('configuratorPatch matches the pack for later wiring', () => {
  const patch = configuratorPatch('hi');
  assert.deepEqual(patch.langs, ['Hindi', 'English']);
  assert.deepEqual(patch.subtitleLangs, ['hi', 'en']);
  assert.equal(patch.langExclusive, false);
  assert.equal(patch.foreignLangKill, true);
});

test('aliases resolve pt-br and portuguese to PT-BR', () => {
  assert.equal(resolvePackId('pt-br'), 'pt-BR');
  assert.equal(resolvePackId('portuguese'), 'pt-BR');
  assert.equal(resolvePackId('es-MX'), 'es');
  assert.equal(getLanguagePack('French').id, 'fr');
});

test('English pack is the identity overlay', () => {
  const out = applyLanguagePackToTemplate(movieFixture(), 'en');
  assert.equal(out.config.requiredLanguages[0], 'English');
  assert.equal(out.config.preferredLanguages[0], 'English');
  const aio = out.config.presets.find((p) => p.type === 'aiosubtitle');
  assert.deepEqual(aio.options.languages, ['en']);
});

test('zilean and other non-subtitle presets are untouched', () => {
  const out = applyLanguagePackToTemplate(movieFixture(), 'nl');
  const zilean = out.config.presets.find((p) => p.type === 'zilean');
  assert.equal(zilean.options.name, 'Zilean');
  assert.equal(out.config.presets.length, 3);
});
