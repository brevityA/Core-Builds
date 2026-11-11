// Episode confidence for Core Streams: how sure we are that a result plays the
// episode that was asked for, read from structured fields first (the file name
// that will play, the add-on's fileIdx, a fileMustInclude selection, the folder
// name) and only then from the release title.
//
//   EXACT     the file (or reliable metadata) names the requested episode
//   LIKELY    the release title names it; there is no file name to confirm
//   PACK      a season, batch, volume or range that contains it
//   UNKNOWN   no reliable episode evidence, or numbering we cannot map
//   MISMATCH  the file or reliable metadata names another episode: excluded
//
// Absolute numbering (" - 33" for S2E5) is never EXACT without a mapping: for
// a first season it equals the episode number, for later seasons it is kept
// as an UNKNOWN fallback rather than guessed or dropped.

export const EPISODE_STATES = Object.freeze({
  EXACT: 'EXACT', LIKELY: 'LIKELY', PACK: 'PACK', UNKNOWN: 'UNKNOWN', MISMATCH: 'MISMATCH',
});

// Non-linear bases: each tier sits 100+ above the next, and everything added
// after them (delivery, audio, device, quality, diversity) is capped below 100,
// so no amount of quality lifts a result over a more certain episode.
export const EPISODE_BASE = Object.freeze({ EXACT: 1000, LIKELY: 700, PACK: 450, UNKNOWN: 100 });
export const PACK_SELECTION_BONUS = 100;

const clean = (value) => String(value || '').replace(/_/g, '.');

/** "S2", "Season 2", "2nd Season", Roman "II": the season a text names, or null. */
export function explicitSeason(text) {
  const value = clean(text).toLowerCase();
  const match = value.match(/\bs0*(\d{1,2})(?=e\d|[^a-z0-9]|$)/) || value.match(/\b(\d{1,2})(?:st|nd|rd|th)[ .-]season\b/)
    || value.match(/\bseason[ .-]?0*(\d{1,2})\b/);
  if (match) return Number(match[1]);
  const roman = value.match(/[ .](ii|iii|iv|vi)(?=[ .:\-[(]|$)/);
  return roman ? { ii: 2, iii: 3, iv: 4, vi: 6 }[roman[1]] : null;
}

/**
 * What a piece of text says about episodes. Several claims can be present
 * ("S01 … S01E05"); the most specific wins in classifyEpisode().
 */
export function episodeClaims(text) {
  const value = clean(text);
  const claims = [];
  // S01E05, S01E05-E07, S01E05E06 (but not the "5.1" of S01E05.DDP.5.1 audio).
  for (const m of value.matchAll(/\bS(\d{1,2})[ .-]?E(\d{1,4})(?:-?E(\d{1,4})|-(\d{1,4})(?![\d.]))?(?!\d)/gi)) {
    const season = Number(m[1]);
    const first = Number(m[2]);
    const last = Number(m[3] || m[4] || first);
    claims.push(last > first ? { kind: 'range', season, from: first, to: last } : { kind: 'single', season, episode: first });
  }
  // 1x05 (not the 1920x1080 of a resolution).
  for (const m of value.matchAll(/(?:^|[^\d])(\d{1,2})x(\d{2,3})(?![\dp])/gi)) {
    claims.push({ kind: 'single', season: Number(m[1]), episode: Number(m[2]) });
  }
  if (!claims.length) {
    // Anime: " - 05", " - 05v2", "EP05", "E05", "Episode 5", "[05]", "#05";
    // ranges " - 01-12", "01~12", "Episodes 1-12".
    const range = value.match(/(?:\s-\s|\bep(?:isodes?)?\.?\s?|\[)0*(\d{1,4})\s*[-~]\s*0*(\d{1,4})(?=[\s\])]|$)/i);
    if (range && Number(range[2]) > Number(range[1])) {
      claims.push({ kind: 'range', season: explicitSeason(value), from: Number(range[1]), to: Number(range[2]) });
    } else {
      const single = value.match(/(?:\s-\s|\bE(?:P|pisode)?\.?\s?|\[|#)0*(\d{1,4})(?:v\d)?(?!\d)(?!\s*[-~]\s*\d)/i);
      if (single && !/^(?:480|576|720|1080|2160|4320)$/.test(single[1])) {
        claims.push({ kind: 'number', season: explicitSeason(value), episode: Number(single[1]) });
      }
    }
  }
  if (!claims.length) {
    if (/\bvol(?:ume)?\.?\s*\d/i.test(value)) claims.push({ kind: 'volume', season: explicitSeason(value) });
    else if (/\b(?:complete|batch|full[ .-]season)\b/i.test(value) || explicitSeason(value) !== null) {
      claims.push({ kind: 'season', season: explicitSeason(value) });
    }
  }
  return claims;
}

function judge(claim, request) {
  const { season, episode } = request;
  const seasonKnown = claim.season !== null && claim.season !== undefined;
  const seasonMatches = !seasonKnown || claim.season === season;
  if (claim.kind === 'single') {
    return { state: claim.season === season && claim.episode === episode ? 'EXACT' : 'MISMATCH' };
  }
  if (claim.kind === 'number') {
    // Bare anime numbering: reliable when the season is named, it is a first
    // season (absolute = episode), or the id numbers within its own entry.
    if (seasonKnown && claim.season !== season) return { state: 'MISMATCH' };
    if (claim.episode === episode) return { state: seasonKnown || season === 1 || request.entryNumbering ? 'EXACT' : 'LIKELY' };
    if (seasonKnown || season === 1 || request.entryNumbering) return { state: 'MISMATCH' };
    return { state: 'UNKNOWN', ambiguous: true };
  }
  if (claim.kind === 'range') {
    if (!seasonMatches) return { state: 'MISMATCH' };
    if (claim.from <= episode && episode <= claim.to) return { state: 'PACK', range: [claim.from, claim.to] };
    return seasonKnown || season === 1 || request.entryNumbering ? { state: 'MISMATCH' } : { state: 'UNKNOWN', ambiguous: true };
  }
  if (claim.kind === 'season') return seasonMatches ? { state: 'PACK' } : { state: 'MISMATCH' };
  if (claim.kind === 'volume') return seasonMatches ? { state: 'PACK', volume: true } : { state: 'MISMATCH' };
  return { state: 'UNKNOWN' };
}

const SPECIFICITY = { single: 4, number: 3, range: 2, volume: 1, season: 1 };

function strongest(claims, request) {
  const judged = claims
    .map((claim) => ({ claim, verdict: judge(claim, request) }))
    .sort((a, b) => SPECIFICITY[b.claim.kind] - SPECIFICITY[a.claim.kind]);
  // A named file that matches anywhere wins over a pack name around it.
  return judged.find(({ verdict }) => verdict.state === 'EXACT') || judged[0] || null;
}

/**
 * Classify one result for an episode request.
 * `request` is { season, episode, entryNumbering? } (entryNumbering: Kitsu ids,
 * numbered within their own entry). `evidence` is { filename, folderName,
 * release, text, fileIdx, fileMustInclude, selected } — `selected` means the
 * player is told which file to open by other means (TorBox picked it).
 */
export function classifyEpisode(request, evidence) {
  const folderSeason = explicitSeason(evidence.folderName || '');
  const withFolder = (claims) => claims.map((claim) => (
    (claim.season === null || claim.season === undefined) && folderSeason !== null ? { ...claim, season: folderSeason } : claim));
  const selection = Boolean(evidence.selected) || Number.isInteger(evidence.fileIdx)
    || (Array.isArray(evidence.fileMustInclude) && evidence.fileMustInclude.length > 0);

  // 1. The file that will play.
  const file = strongest(withFolder(evidence.filename ? episodeClaims(evidence.filename) : []), request);
  if (file && file.verdict.state !== 'UNKNOWN') {
    return { ...file.verdict, from: 'file', selection: file.verdict.state === 'PACK' ? selection : false };
  }
  // 2. The release title (and any other card text).
  const title = strongest([...withFolder(episodeClaims(evidence.release || '')), ...episodeClaims(evidence.text || '')], request);
  if (title) {
    const { state } = title.verdict;
    if (state === 'EXACT') return { ...title.verdict, state: 'LIKELY', from: 'title', selection: false };
    if (state === 'MISMATCH') {
      // A title naming another episode is reliable unless the add-on picked a
      // file inside the torrent: the title is then the torrent's, not the file's.
      return selection ? { state: 'UNKNOWN', from: 'title', selection } : { state: 'MISMATCH', from: 'title' };
    }
    return { ...title.verdict, from: 'title', selection };
  }
  if (file) return { ...file.verdict, from: 'file', selection };
  return { state: 'UNKNOWN', from: 'none', selection };
}

/** The episode base score; null means "exclude". */
export function episodeScore(verdict) {
  if (!verdict || verdict.state === 'MISMATCH') return null;
  return EPISODE_BASE[verdict.state] + (verdict.state === 'PACK' && verdict.selection ? PACK_SELECTION_BONUS : 0);
}

const pad = (n) => String(n).padStart(2, '0');

/** The card's episode line, e.g. "S01E05 · Frieren" or "Season 1 · Episode 5 selected". */
export function episodeLine(request, verdict, showTitle = '') {
  if (!verdict) return '';
  const tag = `S${pad(request.season)}E${pad(request.episode)}`;
  if (verdict.state === 'EXACT') return showTitle ? `${tag} · ${showTitle}` : tag;
  if (verdict.state === 'LIKELY') return verdict.from === 'file' ? `${tag} · season not confirmed` : `${tag} · from the release name`;
  if (verdict.state === 'PACK') {
    if (verdict.range) {
      return `Episodes ${verdict.range[0]}–${verdict.range[1]} · ${verdict.selection ? `E${pad(request.episode)} selected` : 'episode not selected'}`;
    }
    return `Season ${request.season} · ${verdict.selection ? `Episode ${request.episode} selected` : 'episode not selected'}`;
  }
  if (verdict.state === 'UNKNOWN') return verdict.ambiguous ? 'Episode unverified · absolute numbering' : 'Episode unverified';
  return '';
}
