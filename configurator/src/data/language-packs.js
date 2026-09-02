/**
 * Configurator language packs.
 *
 * Overlay spoken language, subtitles, and a TMDB region onto an existing
 * Core Builds template. Does not duplicate 100 KB of template JSON. Does
 * not add community HTTP addons, invent hosts, or enable extra scrapers.
 *
 * Import-ready. Do not wire into the 7k-line app.js unless asked.
 */

export const PASSTHROUGH = Object.freeze([
  'Original',
  'Dual Audio',
  'Multi',
  'Dubbed',
  'Unknown',
]);

/** Names the Configurator already exposes as LANG_OPTS. */
export const ALLOWED_AIO_NAMES = Object.freeze([
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Korean',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Arabic',
  'Hindi',
  'Russian',
  'Dutch',
  'Polish',
  'Turkish',
]);

/**
 * AIOStreams preset types that already exist upstream.
 * Packs may name these as optional. They are never auto-enabled.
 */
export const KNOWN_OPTIONAL_PRESETS = Object.freeze([
  'brazuca-torrents',
  'astream',
  'streamasia',
  'webstreamr',
]);

export const REQUESTED_PACK_IDS = Object.freeze([
  'pt-BR',
  'es',
  'fr',
  'de',
  'it',
  'nl',
  'ar',
  'hi',
]);

const PASSTHROUGH_SET = new Set(PASSTHROUGH);

const FLK_LABEL = 'Foreign Language Kill';
const PREF_LABEL = 'Language Preference';
const EXCL_LABEL = 'Language Exclusive';

function unique(list) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    if (item == null || item === '') continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function pack({
  id,
  name,
  aioNames,
  subtitleCodes,
  tmdbLanguage,
  tmdbRegion,
  note,
  catalogHint,
  exclusive = false,
  foreignLangKill = true,
  optionalPresetTypes = [],
}) {
  return Object.freeze({
    id,
    name,
    aioNames: Object.freeze([...aioNames]),
    subtitleCodes: Object.freeze([...subtitleCodes]),
    tmdbLanguage,
    tmdbRegion,
    exclusive,
    foreignLangKill,
    optionalPresetTypes: Object.freeze([...optionalPresetTypes]),
    catalogHint,
    note,
  });
}

const withEnglish = (primary) => [primary, 'English'];

export const LANGUAGE_PACKS = Object.freeze({
  en: pack({
    id: 'en',
    name: 'English',
    aioNames: ['English'],
    subtitleCodes: ['en'],
    tmdbLanguage: 'en',
    tmdbRegion: 'US',
    catalogHint: 'TMDB en / US. Cinemeta already covers global English catalogs.',
    note: 'Identity pack. Matches stock Core Builds templates.',
  }),
  'pt-BR': pack({
    id: 'pt-BR',
    name: 'Portuguese (Brazil)',
    aioNames: withEnglish('Portuguese'),
    subtitleCodes: ['pt', 'en'],
    tmdbLanguage: 'pt',
    tmdbRegion: 'BR',
    optionalPresetTypes: ['brazuca-torrents'],
    catalogHint: 'TMDB pt / BR. MediaFusion for Brazilian catalogs. Optional AIOStreams type: brazuca-torrents.',
    note: 'Portuguese first, English second. Exclusive mode stays off so English-tagged files still play.',
  }),
  es: pack({
    id: 'es',
    name: 'Spanish',
    aioNames: withEnglish('Spanish'),
    subtitleCodes: ['es', 'en'],
    tmdbLanguage: 'es',
    tmdbRegion: 'ES',
    catalogHint: 'TMDB es / ES. Latin America: pass { tmdbRegion: \'MX\' }. MediaFusion for Spanish-language catalogs.',
    note: 'Spanish first, English second. Stream tags do not distinguish Spain from Latin America.',
  }),
  fr: pack({
    id: 'fr',
    name: 'French',
    aioNames: withEnglish('French'),
    subtitleCodes: ['fr', 'en'],
    tmdbLanguage: 'fr',
    tmdbRegion: 'FR',
    optionalPresetTypes: ['astream'],
    catalogHint: 'TMDB fr / FR. Optional AIOStreams type: astream (Anime-Sama, French).',
    note: 'French first, English second. VOSTFR still arrives as Original / Multi / Unknown.',
  }),
  de: pack({
    id: 'de',
    name: 'German',
    aioNames: withEnglish('German'),
    subtitleCodes: ['de', 'en'],
    tmdbLanguage: 'de',
    tmdbRegion: 'DE',
    catalogHint: 'TMDB de / DE.',
    note: 'German first, English second.',
  }),
  it: pack({
    id: 'it',
    name: 'Italian',
    aioNames: withEnglish('Italian'),
    subtitleCodes: ['it', 'en'],
    tmdbLanguage: 'it',
    tmdbRegion: 'IT',
    catalogHint: 'TMDB it / IT.',
    note: 'Italian first, English second.',
  }),
  nl: pack({
    id: 'nl',
    name: 'Dutch',
    aioNames: withEnglish('Dutch'),
    subtitleCodes: ['nl', 'en'],
    tmdbLanguage: 'nl',
    tmdbRegion: 'NL',
    catalogHint: 'TMDB nl / NL.',
    note: 'Dutch first, English second. AIOStreams name is Dutch, not Nederlands.',
  }),
  ar: pack({
    id: 'ar',
    name: 'Arabic',
    aioNames: withEnglish('Arabic'),
    subtitleCodes: ['ar', 'en'],
    tmdbLanguage: 'ar',
    tmdbRegion: 'SA',
    catalogHint: 'TMDB ar / SA as a starting region. MediaFusion for Middle Eastern catalogs.',
    note: 'Arabic first, English second. TMDB region is a starting point, not a claim about every Arabic-speaking country.',
  }),
  hi: pack({
    id: 'hi',
    name: 'Hindi',
    aioNames: withEnglish('Hindi'),
    subtitleCodes: ['hi', 'en'],
    tmdbLanguage: 'hi',
    tmdbRegion: 'IN',
    catalogHint: 'TMDB hi / IN. MediaFusion for Bollywood / South Indian catalogs.',
    note: 'Hindi first, English second. Tamil and Telugu are not in this pack — enable them in the Configurator language chips if needed.',
  }),
});

const ALIASES = Object.freeze({
  en: 'en',
  english: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  'en-au': 'en',
  'pt-br': 'pt-BR',
  pt: 'pt-BR',
  portuguese: 'pt-BR',
  br: 'pt-BR',
  es: 'es',
  spanish: 'es',
  'es-es': 'es',
  'es-mx': 'es',
  'es-419': 'es',
  fr: 'fr',
  french: 'fr',
  'fr-fr': 'fr',
  de: 'de',
  german: 'de',
  'de-de': 'de',
  it: 'it',
  italian: 'it',
  'it-it': 'it',
  nl: 'nl',
  dutch: 'nl',
  'nl-nl': 'nl',
  ar: 'ar',
  arabic: 'ar',
  hi: 'hi',
  hindi: 'hi',
  'hi-in': 'hi',
});

export function resolvePackId(id) {
  if (id == null || String(id).trim() === '') {
    throw new Error('resolvePackId needs a language pack id.');
  }
  const raw = String(id).trim();
  if (LANGUAGE_PACKS[raw]) return raw;
  const mapped = ALIASES[raw.toLowerCase()];
  if (mapped && LANGUAGE_PACKS[mapped]) return mapped;
  throw new Error(`Unknown language pack: ${raw}`);
}

export function getLanguagePack(id) {
  return LANGUAGE_PACKS[resolvePackId(id)];
}

export function listLanguagePacks() {
  return ['en', ...REQUESTED_PACK_IDS].map((id) => LANGUAGE_PACKS[id]);
}

export function spokenNames(pack, { englishFallback = true } = {}) {
  const names = [...pack.aioNames];
  if (!englishFallback) {
    return pack.id === 'en' ? names : names.filter((n) => n !== 'English');
  }
  if (!names.includes('English')) names.push('English');
  return names;
}

export function requiredLanguagesFor(pack, opts = {}) {
  const exclusive = opts.exclusive ?? pack.exclusive;
  const englishFallback = opts.englishFallback ?? !exclusive;
  return unique([...spokenNames(pack, { englishFallback }), ...PASSTHROUGH]);
}

export function preferredLanguagesFor(pack, opts = {}) {
  const exclusive = opts.exclusive ?? pack.exclusive;
  const englishFallback = opts.englishFallback ?? !exclusive;
  return unique([
    ...spokenNames(pack, { englishFallback }),
    'Original',
    'Dual Audio',
    'Multi',
    'Dubbed',
  ]);
}

export function subtitleCodesFor(pack) {
  return [...pack.subtitleCodes];
}

export function subdlLanguagesFor(pack) {
  return unique(
    pack.subtitleCodes
      .map((code) => String(code).trim().toUpperCase())
      .filter(Boolean),
  ).slice(0, 5);
}

export function configuratorPatch(id, opts = {}) {
  const pack = getLanguagePack(id);
  const exclusive = opts.exclusive ?? pack.exclusive;
  const englishFallback = opts.englishFallback ?? !exclusive;
  return {
    langs: spokenNames(pack, { englishFallback }),
    subtitleLangs: subtitleCodesFor(pack),
    langExclusive: exclusive,
    foreignLangKill: opts.foreignLangKill ?? pack.foreignLangKill,
  };
}

export function languageMigrationKeep(id, opts = {}) {
  const pack = getLanguagePack(id);
  return {
    requiredLanguages: requiredLanguagesFor(pack, opts),
    preferredLanguages: preferredLanguagesFor(pack, opts),
    excludedLanguages: [],
    includedLanguages: [],
  };
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function isAnimeTemplate(template) {
  const meta = template.metadata || {};
  const blob = `${meta.name || ''} ${meta.id || ''} ${meta.category || ''}`.toLowerCase();
  if (blob.includes('anime')) return true;
  const cfg = template.config || {};
  const preferred = cfg.preferredLanguages || [];
  const required = cfg.requiredLanguages || [];
  return preferred.includes('Japanese') && (!required || required.length === 0);
}

function quoteList(names) {
  return names.map((n) => `'${String(n).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(', ');
}

function flkExpression(names) {
  return `/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, ${quoteList(names)})), streams) : []`;
}

function prefExpression(spoken) {
  return `/* Language Preference — ${spoken.join('/')} */ language(streams, ${quoteList(spoken)})`;
}

function exclExpression(names) {
  const spoken = names.filter((n) => !PASSTHROUGH_SET.has(n));
  return `/* Language Exclusive — only ${spoken.join('/')} */ language(streams, ${quoteList(names)})`;
}

function patchExpressionList(list, { label, nextExpr, insertIfMissing = false, insert = 'push' }) {
  const arr = Array.isArray(list)
    ? list.map((item) => {
        if (typeof item === 'string' && item.includes(label)) {
          return { enabled: true, expression: nextExpr };
        }
        if (!item || typeof item !== 'object') return item;
        const expr = item.expression || '';
        if (expr.includes(label)) {
          return { ...item, enabled: item.enabled !== false, expression: nextExpr };
        }
        return item;
      })
    : [];
  const found = arr.some((item) => {
    if (typeof item === 'string') return item.includes(label);
    return item && typeof item === 'object' && String(item.expression || '').includes(label);
  });
  if (!found && insertIfMissing) {
    const row = { enabled: true, expression: nextExpr };
    if (insert === 'unshift') arr.unshift(row);
    else arr.push(row);
  }
  return arr;
}

function patchSubtitlePresets(presets, pack) {
  if (!Array.isArray(presets)) return presets;
  const codes = subtitleCodesFor(pack);
  const subdl = subdlLanguagesFor(pack);
  return presets.map((preset) => {
    if (!preset || typeof preset !== 'object') return preset;
    const options = { ...(preset.options || {}) };
    if (preset.type === 'aiosubtitle') {
      options.languages = codes;
      return { ...preset, options };
    }
    if (preset.type === 'opensubtitles-v3-plus') {
      options.language = codes;
      return { ...preset, options };
    }
    if (preset.type === 'subdl') {
      options.language = subdl;
      return { ...preset, options };
    }
    return preset;
  });
}

export function applyLanguagePackToTemplate(template, packId, opts = {}) {
  if (!template || typeof template !== 'object') {
    throw new Error('applyLanguagePackToTemplate needs a template object.');
  }
  const pack = getLanguagePack(packId);
  const exclusive = opts.exclusive ?? pack.exclusive;
  const out = clone(template);
  if (!out.config || typeof out.config !== 'object') out.config = {};
  const cfg = out.config;
  const anime = opts.content === 'anime' || (opts.content == null && isAnimeTemplate(out));
  const effectiveExclusive = exclusive && !anime;
  const englishFallback = opts.englishFallback ?? !effectiveExclusive;
  const spoken = spokenNames(pack, { englishFallback: anime ? true : englishFallback });
  const required = requiredLanguagesFor(pack, {
    exclusive: effectiveExclusive,
    englishFallback: anime ? true : englishFallback,
  });
  let preferred = preferredLanguagesFor(pack, {
    exclusive: effectiveExclusive,
    englishFallback: anime ? true : englishFallback,
  });
  if (anime) {
    preferred = unique(['Japanese', ...spoken, 'Original', 'Dual Audio', 'Multi', 'Dubbed']);
    cfg.requiredLanguages = [];
    cfg.preferredLanguages = preferred;
  } else {
    cfg.requiredLanguages = required;
    cfg.preferredLanguages = preferred;
  }
  cfg.excludedLanguages = [];
  cfg.includedLanguages = [];

  if (!anime) {
    const killOn = (opts.foreignLangKill ?? pack.foreignLangKill) !== false;
    cfg.excludedStreamExpressions = patchExpressionList(cfg.excludedStreamExpressions, {
      label: FLK_LABEL,
      nextExpr: flkExpression(required),
      insertIfMissing: killOn,
      insert: 'push',
    });
    if (effectiveExclusive) {
      cfg.includedStreamExpressions = patchExpressionList(cfg.includedStreamExpressions, {
        label: EXCL_LABEL,
        nextExpr: exclExpression(required),
        insertIfMissing: true,
        insert: 'push',
      });
    }
  }

  if (Array.isArray(cfg.preferredStreamExpressions)) {
    cfg.preferredStreamExpressions = patchExpressionList(cfg.preferredStreamExpressions, {
      label: PREF_LABEL,
      nextExpr: prefExpression(anime ? unique([...spoken, 'Japanese']) : spoken),
      insertIfMissing: false,
    });
  }

  cfg.presets = patchSubtitlePresets(cfg.presets, pack);

  out.metadata = {
    ...(out.metadata || {}),
    coreBuildsLanguagePack: pack.id,
  };

  return out;
}
