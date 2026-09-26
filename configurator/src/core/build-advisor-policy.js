/**
 * Explainable, deterministic build recommendations.
 *
 * This policy deliberately recommends only preference fields. It never chooses a
 * paid service, host, credential, or account action for the user.
 */

const GOALS = new Set(['balanced', 'speed', 'quality', 'coverage']);
const CONTENT = new Set(['all', 'movies', 'series', 'anime', 'niche']);
const RELIABILITY = new Set(['cached-only', 'cached-first', 'broad']);
const NETWORK = new Set(['unknown', 'slow', 'medium', 'fast']);
const HOUSEHOLDS = new Set(['general', 'family', 'kids']);
const LOCALES = Object.freeze({
  en: { langs:['English'], subtitles:['en'], label:'English' },
  'pt-BR': { langs:['Portuguese','English'], subtitles:['pt','en'], label:'Portuguese (Brazil)' },
  es: { langs:['Spanish','English'], subtitles:['es','en'], label:'Spanish' },
  fr: { langs:['French','English'], subtitles:['fr','en'], label:'French' },
  de: { langs:['German','English'], subtitles:['de','en'], label:'German' },
  it: { langs:['Italian','English'], subtitles:['it','en'], label:'Italian' },
  nl: { langs:['Dutch','English'], subtitles:['nl','en'], label:'Dutch' },
  ar: { langs:['Arabic','English'], subtitles:['ar','en'], label:'Arabic' },
  hi: { langs:['Hindi','English'], subtitles:['hi','en'], label:'Hindi' },
});

function allowed(value, values, fallback) {
  return values.has(value) ? value : fallback;
}

function reason(id, title, detail, evidence) {
  return Object.freeze({ id, title, detail, evidence });
}

function candidate(id, label, patch, tradeoff) {
  return Object.freeze({ id, label, patch: Object.freeze({ ...patch }), tradeoff });
}

/**
 * @param {object} rawIntent
 * @param {'balanced'|'speed'|'quality'|'coverage'} rawIntent.goal
 * @param {'all'|'movies'|'series'|'anime'|'niche'} rawIntent.content
 * @param {'cached-only'|'cached-first'|'broad'} rawIntent.reliability
 * @param {'unknown'|'slow'|'medium'|'fast'} rawIntent.network
 * @param {string} [rawIntent.device]
 * @param {'4k'|'1080p'} [rawIntent.deviceMaxResolution]
 * @param {'en'|'pt-BR'|'es'|'fr'|'de'|'it'|'nl'|'ar'|'hi'} [rawIntent.locale]
 * @param {'general'|'family'|'kids'} [rawIntent.household]
 */
export function adviseBuild(rawIntent = {}) {
  const intent = Object.freeze({
    goal: allowed(rawIntent.goal, GOALS, 'balanced'),
    content: allowed(rawIntent.content, CONTENT, 'all'),
    reliability: allowed(rawIntent.reliability, RELIABILITY, 'cached-first'),
    network: allowed(rawIntent.network, NETWORK, 'unknown'),
    device: String(rawIntent.device || 'generic'),
    deviceMaxResolution: rawIntent.deviceMaxResolution === '1080p' ? '1080p' : '4k',
    locale: Object.hasOwn(LOCALES, rawIntent.locale) ? rawIntent.locale : 'en',
    household: allowed(rawIntent.household, HOUSEHOLDS, 'general'),
  });
  const locale = LOCALES[intent.locale];

  const patch = {
    resolution: '1080p', cacheMode: 'mixed', qualityFirst: false,
    resolutionFirst: true, streamPool: 'normal', matchMode: 'balanced',
    content: intent.content === 'niche' ? 'all' : intent.content,
    outputProfile: 'balanced', addonTimeout: 6000, pseArch: 'standard',
    langs: [...locale.langs], subtitleLangs: [...locale.subtitles],
    langExclusive: false, foreignLangKill: false, ageLimit: 'none',
  };
  const reasons = [];
  const assumptions = [];

  if (intent.reliability === 'cached-only') {
    patch.cacheMode = 'cached';
    reasons.push(reason('cached-only', 'Instant-play results only', 'Uncached results are removed to avoid waiting for a provider to download them.', 'Your reliability choice'));
  } else if (intent.reliability === 'broad') {
    patch.cacheMode = 'mixed';
    patch.streamPool = 'wide';
    patch.addonTimeout = 10000;
    reasons.push(reason('broad-fallback', 'Broader fallback enabled', 'A wider result pool and longer timeout improve coverage, with a slower worst-case response.', 'Your reliability choice'));
  } else {
    patch.cacheMode = 'mixed';
    reasons.push(reason('cached-first', 'Cached results rank first', 'Instant-play results are preferred while uncached results remain available for harder-to-find titles.', 'Your reliability choice'));
  }

  if (intent.goal === 'speed') {
    Object.assign(patch, { resolution:'1080p', qualityFirst:false, streamPool:'small', outputProfile:'stable', addonTimeout:4000 });
    reasons.push(reason('speed-goal', 'Optimised for a quick first result', 'A smaller pool, 1080p ceiling, stable output, and shorter addon timeout reduce waiting.', 'Your primary goal'));
  } else if (intent.goal === 'quality') {
    Object.assign(patch, { resolution:'4k', qualityFirst:true, streamPool:'wide', outputProfile:'advanced', addonTimeout:10000, pseArch:'iqr' });
    reasons.push(reason('quality-goal', 'Quality-first 4K ranking', 'Apex IQR and a wider pool favour high-bitrate releases instead of the shortest response.', 'Your primary goal'));
  } else if (intent.goal === 'coverage') {
    Object.assign(patch, { resolution:'mixed', qualityFirst:false, resolutionFirst:false, streamPool:'wide', outputProfile:'advanced', addonTimeout:10000, pseArch:'apex-mixed', matchMode:'lenient' });
    reasons.push(reason('coverage-goal', 'Coverage-first matching', 'Mixed resolution, lenient matching, and a broad pool reduce the chance that niche releases are filtered out.', 'Your primary goal'));
  } else {
    reasons.push(reason('balanced-goal', 'Balanced defaults', 'The recommendation keeps fast cached results without deleting useful fallbacks.', 'Your primary goal'));
  }

  if (intent.network === 'slow') {
    patch.resolution = '1080p';
    patch.qualityFirst = false;
    reasons.push(reason('slow-network', '1080p for constrained bandwidth', '4K and very large quality-first files are avoided to reduce buffering risk.', 'Your network answer'));
  } else if (intent.network === 'medium' && patch.resolution === '4k') {
    patch.resolution = 'mixed';
    reasons.push(reason('medium-network', 'Adaptive mixed resolution', '1080p remains prominent while efficient 4K can still appear.', 'Your network answer'));
  } else if (intent.network === 'unknown') {
    assumptions.push('Network speed is unknown, so the recommendation avoids relying on unrestricted 4K throughput.');
    if (patch.resolution === '4k' && intent.goal !== 'quality') patch.resolution = 'mixed';
  }

  if (intent.deviceMaxResolution === '1080p' && (patch.resolution === '4k' || patch.resolution === 'mixed')) {
    patch.resolution = '1080p';
    reasons.push(reason('device-cap', 'Capped to the device', `${intent.device} is represented by a 1080p device profile, so higher tiers are removed.`, 'Device capability policy'));
  }

  if (intent.locale !== 'en') {
    reasons.push(reason('locale-pack', `${locale.label} preference pack`, `${locale.label} streams and subtitles rank first, with English retained as a fallback. Unknown language tags are not hard-filtered.`, 'Your language answer'));
  }

  if (intent.household === 'kids') {
    patch.ageLimit = 'PG';
    reasons.push(reason('kids-profile', 'Kids content ceiling', 'The generated stream policy allows G and PG certifications. TMDB credentials are needed for certification data.', 'Your household answer'));
  } else if (intent.household === 'family') {
    patch.ageLimit = 'PG-13';
    reasons.push(reason('family-profile', 'Family content ceiling', 'The generated stream policy allows content through PG-13. TMDB credentials are needed for certification data.', 'Your household answer'));
  }

  if (intent.content === 'anime') {
    patch.content = 'anime';
    if (patch.matchMode === 'balanced') patch.matchMode = 'lenient';
    reasons.push(reason('anime-matching', 'Anime-friendly matching', 'Less rigid matching preserves alternate and absolute episode naming.', 'Your content answer'));
  } else if (intent.content === 'niche') {
    patch.content = 'all';
    patch.matchMode = 'lenient';
    patch.streamPool = 'wide';
    reasons.push(reason('niche-matching', 'Niche-title safety', 'Broad content and lenient matching reduce false negatives from unusual release names.', 'Your content answer'));
  }

  const confidence = assumptions.length ? 'medium' : 'high';
  const alternatives = [
    candidate('faster', 'Faster', { resolution:'1080p', cacheMode:'cached', streamPool:'small', addonTimeout:4000, outputProfile:'stable' }, 'Faster response, but fewer obscure and uncached results.'),
    candidate('higher-quality', 'Higher quality', { resolution: intent.deviceMaxResolution === '1080p' ? '1080p' : '4k', cacheMode:'mixed', streamPool:'wide', addonTimeout:10000, qualityFirst:true, outputProfile:'advanced', pseArch:'iqr' }, 'Better releases, but larger files and slower worst-case response.'),
  ];

  return Object.freeze({
    policyVersion: 2,
    intent,
    patch: Object.freeze(patch),
    reasons: Object.freeze(reasons),
    assumptions: Object.freeze(assumptions),
    confidence,
    alternatives: Object.freeze(alternatives),
  });
}
