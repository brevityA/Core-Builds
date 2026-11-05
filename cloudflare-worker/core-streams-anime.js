// Anime support for Core Streams: Kitsu ids, Nyaa's RSS feed, and matching
// fansub release names ("[Group] Show S2 - 05 [1080p]") to an episode.
// Pure helpers only; the fetching lives in core-streams.js beside the other
// sources so it shares their breakers, deadlines and size limits.

export const KITSU_ID_RE = /^kitsu:(\d{1,7})(?::(\d{1,4}))?$/i;

export function parseKitsuId(id) {
  const match = KITSU_ID_RE.exec(String(id || ''));
  return match ? { kitsuId: match[1], episode: match[2] === undefined ? null : Number(match[2]) } : null;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeEntities(value) {
  return String(value || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const point = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isInteger(point) && point > 0 && point < 0x110000 ? String.fromCodePoint(point) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const SIZE_UNITS = { b: 1, kib: 2 ** 10, mib: 2 ** 20, gib: 2 ** 30, tib: 2 ** 40, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12 };

export function parseSize(text) {
  const match = String(text || '').trim().match(/^(\d+(?:\.\d+)?)\s*([KMGT]i?B|B)$/i);
  const factor = match && SIZE_UNITS[match[2].toLowerCase()];
  return factor ? Math.round(Number(match[1]) * factor) : 0;
}

function tag(item, name) {
  const match = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? decodeEntities(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')).trim() : '';
}

// Nyaa's RSS: one <item> per torrent with nyaa:infoHash, seeders and size.
export function parseNyaaRss(xml) {
  return [...String(xml || '').matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
    title: tag(item, 'title'),
    hash: tag(item, 'nyaa:infoHash').toLowerCase(),
    seeders: Number(tag(item, 'nyaa:seeders')),
    sizeBytes: parseSize(tag(item, 'nyaa:size')),
    trusted: tag(item, 'nyaa:trusted') === 'Yes',
    remake: tag(item, 'nyaa:remake') === 'Yes',
  })).filter((item) => item.title && /^[a-f0-9]{40}$/.test(item.hash));
}

function normalize(value) {
  return decodeEntities(value).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

const SEASON_WORDS = /\b(?:\d{1,2}(?:st|nd|rd|th) season|season \d{1,2}|s\d{1,2}|part \d{1,2}|cour \d{1,2}|ii|iii|iv|vi)\b/g;

// "Sousou no Frieren 2nd Season" -> "sousou no frieren": the season is checked
// separately, because releases write it as "S2", "Season 2" or "2nd Season".
export function baseTitle(title) {
  return normalize(title).replace(SEASON_WORDS, ' ').replace(/\s+/g, ' ').trim();
}

// "V" is left out: as a lone letter it is too often part of a title.
const ROMAN = { ii: 2, iii: 3, iv: 4, vi: 6 };

export function seasonOf(text) {
  const value = normalize(String(text).replace(/\[[^\]]*\]|\([^)]*\)/g, (tag) => (/season|\bs\d/i.test(tag) ? tag : ' ')));
  const match = value.match(/\bs0*(\d{1,2})(?:e\d|\b)/) || value.match(/\b(\d{1,2})(?:st|nd|rd|th) season\b/) || value.match(/\bseason 0*(\d{1,2})\b/);
  if (match) return Number(match[1]);
  // "Mushoku Tensei II: ...": a Roman numeral in the title, before any " - 05".
  const roman = value.split(/ \d{1,4}(?: |$)/)[0].match(/ (ii|iii|iv|vi)\b/);
  return roman ? ROMAN[roman[1]] : 1;
}

// The release name without its leading/trailing "[Group]", "(1080p)" tags.
function releaseCore(release) {
  return normalize(String(release).replace(/\[[^\]]*\]|\([^)]*\)/g, ' '));
}

// Kitsu titles often carry a subtitle releases leave out ("Mushoku Tensei II:
// Isekai Ittara Honki Dasu" is released as "Mushoku Tensei S2"), so the part
// before a colon also counts when it is at least two words. Season words are
// removed on both sides; the season itself is checked by seasonOf().
export function titleMatches(release, titles) {
  const core = ` ${baseTitle(releaseCore(release))} `;
  const full = ` ${baseTitle(release)} `;
  const candidates = titles.flatMap((title) => {
    const main = String(title).split(/[:：]/)[0];
    return main !== title && baseTitle(main).split(' ').length >= 2 ? [title, main] : [title];
  });
  return candidates.map(baseTitle).filter((title) => title.length >= 2)
    .some((title) => core.includes(` ${title} `) || full.includes(` ${title} `));
}

// " - 05", " - 05v2", "E05", "EP05", "Episode 5", "[05]", "S02E05"; never a
// range such as " - 01-12" or "01 ~ 12".
export function animeEpisodeRe(episode) {
  const e = Number(episode);
  return new RegExp(`(?:\\s-\\s|\\bE(?:P|pisode)?\\.?\\s?|S\\d{1,2}E|\\[|#)0*${e}(?:v\\d)?(?![0-9])(?!\\s*[-~]\\s*\\d)`, 'i');
}

// The same match as a stremio-core `fileMustInclude` pattern: no lookarounds,
// no flags, so the streaming server reads it exactly as written.
export function animeEpisodeFilePattern(episode) {
  return `(?:[Ee][Pp]?|- |\\[)0*${Number(episode)}(?:v[0-9])?[^0-9]`;
}

function rangeOf(release) {
  const match = String(release).match(/(?:^|[\s[(])(\d{1,4})\s*[-~]\s*(\d{1,4})(?=[\s\])]|$)/);
  if (!match) return null;
  const [low, high] = [Number(match[1]), Number(match[2])];
  return high > low && high - low < 2000 ? [low, high] : null;
}

/**
 * How a Nyaa release relates to the request: 'episode' (names it), 'pack'
 * (a batch or season that should contain it), or null.
 */
export function classifyAnimeRelease(release, { titles, season = 1, episode = null }) {
  if (!titleMatches(release, titles)) return null;
  if (seasonOf(release) !== season) return null;
  if (episode === null) {
    // A film: anything naming an episode belongs to a series.
    return / - \d{1,4}\b|\bS\d{1,2}E\d/i.test(release) ? null : 'movie';
  }
  if (animeEpisodeRe(episode).test(release)) return 'episode';
  const range = rangeOf(release);
  if (range) return range[0] <= episode && episode <= range[1] ? 'pack' : null;
  if (/\b(?:batch|complete|season \d+|s\d{1,2})\b/i.test(release) && !/\bvol(?:ume)?\.?\s*\d/i.test(release)
    && !/ - \d{1,4}\b|E\d{1,4}\b/i.test(release)) return 'pack';
  return null;
}

/** What audio a release says it carries: English dub, dual audio, multi-audio, or ''. */
export function dubLabel(text) {
  const value = String(text || '').toLowerCase();
  if (/\b(?:english|eng)[ ._-]?dub(?:bed)?\b/.test(value)) return 'English dub';
  if (/\bdual[ ._-]?audio\b|\bdual\b/.test(value)) return 'Dual audio';
  if (/\bmulti[ ._-]?audio\b/.test(value)) return 'Multi-audio';
  if (/\bdub(?:bed|s)?\b/.test(value)) return 'Dub';
  return '';
}
