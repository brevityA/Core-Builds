// Core Streams: a small Stremio-compatible stream aggregator running on the
// existing Cloudflare Worker. It uses fixed add-on endpoints and narrowly
// allowlisted open-media APIs; it never scrapes arbitrary URLs or relays media.
import {
  createResponseCache, createHeaderLimiter, createRequestTimeout, responseCacheKey, envInteger,
  awaitWithSignal, abortError, RESPONSE_CACHE_DEFAULT_SECONDS,
} from './core-streams-performance.js';
import { formatStream, getStreamFacts, parseRelease, setStreamFacts } from './core-streams-format.js';
import {
  animeEpisodeFilePattern, animeEpisodeRe, classifyAnimeRelease, dubLabel, parseKitsuId, parseNyaaRss, seasonOf,
} from './core-streams-anime.js';
import { classifyEpisode, episodeLine, episodeScore } from './core-streams-episode.js';

const responseCache = createResponseCache();
const streamScoreCache = new WeakMap();

const SOURCES = [
  { id: 'torrentio', name: 'Torrentio', base: 'https://torrentio.strem.fun' },
  { id: 'torrentsdb', name: 'TorrentsDB', base: 'https://torrentsdb.com' },
  {
    id: 'public-domain-movies',
    name: 'Public Domain Movies',
    base: 'https://caching.stremio.net/publicdomainmovies.now.sh',
    types: ['movie'],
  },
];

const LOC_OPEN_FILMS = [
  {
    imdbId: 'tt0205480',
    title: 'A Trip Down Market Street Before the Fire',
    year: 1906,
    locItemId: '00694408',
    directUrl: 'https://tile.loc.gov/storage-services/service/mbrs/ntscrm/00015143/00015143.mp4',
    rightsUrl: 'https://www.loc.gov/item/00694408/',
    collectionUrl: 'https://www.loc.gov/collections/san-francisco-earthquake-and-fire-1897-to-1916/about-this-collection/',
    editionNote: 'LOC catalog 8:23; download 8:31; IMDb about 12m.',
  },
  {
    imdbId: 'tt0366872',
    title: 'Panoramic View of the Golden Gate',
    year: 1902,
    locItemId: '00694423',
    directUrl: 'https://tile.loc.gov/storage-services/service/mbrs/ntscrm/00045679/00045679.mp4',
    rightsUrl: 'https://www.loc.gov/item/00694423/',
    collectionUrl: 'https://www.loc.gov/collections/san-francisco-earthquake-and-fire-1897-to-1916/about-this-collection/',
    editionNote: 'LOC catalog 2:39; download 2:52.',
  },
  {
    imdbId: 'tt0309365',
    title: "Bird's-Eye View of San Francisco, Cal., from a Balloon",
    year: 1902,
    locItemId: '00694409',
    directUrl: 'https://tile.loc.gov/storage-services/service/mbrs/ntscrm/00045682/00045682.mp4',
    rightsUrl: 'https://www.loc.gov/item/00694409/',
    collectionUrl: 'https://www.loc.gov/collections/san-francisco-earthquake-and-fire-1897-to-1916/about-this-collection/',
    editionNote: 'LOC catalog 2:45; download 2:42.',
  },
  {
    imdbId: 'tt1811321',
    title: 'San Francisco Earthquake & Fire: April 18, 1906',
    metadataTitles: ['San Francisco earthquake and fire, April 18, 1906'],
    year: 1906,
    locItemId: '00694425',
    directUrl: 'https://tile.loc.gov/storage-services/service/mbrs/ntscrm/00007947/00007947.mp4',
    rightsUrl: 'https://www.loc.gov/item/00694425/',
    collectionUrl: 'https://www.loc.gov/collections/san-francisco-earthquake-and-fire-1897-to-1916/about-this-collection/',
    editionNote: 'LOC catalog about 12m; download 12:38; Cinemeta 14m.',
  },
];

const MAX_SOURCE_RESPONSE_BYTES = 1024 * 1024;
const MAX_STREAMS_PER_SOURCE = 40;
const MAX_STREAMS_TOTAL = 80;
const SOURCE_TIMEOUT_MS = 5500;
// Strictly longer than a provider timeout so a real provider hang is attributable
// to that provider, while queue/deadline cancellations are not.
const REQUEST_DEADLINE_MS = 8000;
const OPEN_MEDIA_TIMEOUT_MS = 4000;
const OPEN_MEDIA_MAX_BYTES = 768 * 1024;
const SOURCE_FAILURE_THRESHOLD = 3;
const SOURCE_BREAKER_COOLDOWN_MS = 30_000;
const sourceHealth = new Map(); // fixed provider IDs only; isolate-local best-effort breaker

/** Emit only reviewed, secret-free Core Streams telemetry through the Worker sink. */
function emitLog(logEvent, event, fields) {
  if (typeof logEvent !== 'function') return;
  try { logEvent(event, fields); } catch { /* telemetry must never affect playback */ }
}

/** Reduce a source report string to a bounded telemetry outcome label. */
function sourceOutcome(status) {
  const text = String(status || '');
  if (/^ok\b/.test(text)) return 'ok';
  if (/^cached\b/.test(text)) return 'cached';
  if (/^cache hit/.test(text)) return 'cache_hit';
  if (/^skipped/.test(text)) return 'skipped';
  if (/^paused/.test(text)) return 'paused';
  if (/^timeout/.test(text)) return 'timeout';
  if (/^http /.test(text)) return 'http_error';
  if (/^network error/.test(text)) return 'network_error';
  if (/^too large/.test(text)) return 'too_large';
  if (/^not json/.test(text)) return 'invalid_json';
  if (/^no streams array/.test(text)) return 'invalid_payload';
  if (/^error /.test(text)) return 'upstream_error';
  return 'other';
}

/** True when repeated TorBox play failures should fast-fail new play requests. */
function torboxPlayOutage(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return true;
  const code = String(error?.torbox || '');
  // Per-torrent conditions (stale/missing item, bad link, missing id) are not
  // account-wide outages; they are already retried/reported per play request.
  if (['ITEM_NOT_FOUND', 'BAD_LINK', 'NO_TORRENT_ID'].includes(code)) return false;
  return !code || Number(error?.httpStatus) >= 500 || /^HTTP 5\d\d$/.test(code);
}
const INSTALL_TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
const ID_RE = /^(?:tt\d{6,12}(?::\d{1,3}:\d{1,3})?|kitsu:\d{1,7}(?::\d{1,4})?)$/i;
const INFO_HASH_RE = /^[a-f0-9]{40}$/i;
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const RESERVED_HOST_RE = /(^|\.)(localhost|local|internal|intranet|home|lan|corp|arpa|test|invalid|example|onion)$/i;

/** Build a JSON response with no-store and the caller's security/CORS headers. */
function jsonResponse(status, body, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

/** Compare equal-length bearer tokens without an early exit on matching prefix. */
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/** Reject localhost, reserved suffixes, IP literals and dotless hosts for fetch targets. */
function isPublicHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.') || RESERVED_HOST_RE.test(host)) return false;
  if (host === 'localhost' || host === '0.0.0.0' || host.startsWith('[') || host.includes(':')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  return true;
}

// Optional direct-HTTP source addon. This value is set by the operator as a
// Worker secret, never by a caller, so it cannot become an arbitrary URL relay.
// User/config tokens in the path are permitted, but origin ports, query strings,
// fragments, userinfo, IP literals, and reserved names are refused.
function configuredAddonBase(manifestUrl) {
  if (typeof manifestUrl !== 'string' || manifestUrl.length > 2048) return null;
  let parsed;
  try { parsed = new URL(manifestUrl); } catch { return null; }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return null;
  if (!isPublicHostname(parsed.hostname)) return null;
  const path = parsed.pathname.replace(/\/+$/, '');
  if (!path.endsWith('/manifest.json') || path.includes('..')) return null;
  // Path segments may carry an add-on's configuration in any RFC 3986 path
  // character: Torrentio uses `providers=yts,eztv|sort=quality`, Comet and
  // AIOStreams base64 with `=` or percent-encoded `%2B`/`%3D`, WebStreamr
  // percent-encoded JSON. Only the path is affected; the origin checks above
  // still decide where requests can go. `|` is kept literally by URL parsing.
  if (!/^\/(?:(?:[A-Za-z0-9._~!$&'()*+,;=:@|-]|%[0-9A-Fa-f]{2})+\/)*manifest\.json$/.test(path)) return null;
  return parsed.origin + path.slice(0, -'/manifest.json'.length);
}

/** Parse only the fixed manifest/stream/play route shapes; return null otherwise. */
function parseRequestPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 3 && parts[0] === 'core-streams' && parts[2] === 'manifest.json') {
    return { token: parts[1], kind: 'manifest' };
  }
  if (parts.length === 5 && parts[0] === 'core-streams' && parts[2] === 'stream' && parts[4].endsWith('.json')) {
    const type = parts[3];
    const rawId = parts[4].slice(0, -'.json'.length);
    let id;
    try { id = decodeURIComponent(rawId); } catch { return null; }
    return { token: parts[1], kind: 'stream', type, id };
  }
  if (parts.length === 5 && parts[0] === 'core-streams' && parts[2] === 'play') {
    return { token: parts[1], kind: 'play', hash: parts[3], selector: parts[4] };
  }
  return null;
}

/** Validate Stremio movie/series IMDb ids before any provider fan-out. */
function validMediaRequest(type, id) {
  if (!['movie', 'series', 'anime'].includes(type) || typeof id !== 'string' || !ID_RE.test(id)) return false;
  // Kitsu ids (anime catalogs): "kitsu:<id>" for a film, "kitsu:<id>:<episode>"
  // for an episode, numbered within that Kitsu entry. Clients send them as
  // movie, series or anime.
  const kitsu = parseKitsuId(id);
  if (kitsu) return kitsu.episode === null ? type !== 'series' : type !== 'movie' && kitsu.episode >= 1;
  if (type === 'anime') return false;
  const [imdb, season, episode] = id.split(':');
  if (!/^tt\d{6,12}$/i.test(imdb)) return false;
  if (type === 'movie') return season === undefined;
  return season !== undefined && Number(season) <= 999 && Number(episode) >= 1 && Number(episode) <= 999;
}

function sourceRequestUrl(base, type, id) {
  return `${base}/stream/${type}/${encodeURIComponent(id)}.json`;
}

/** Accept only public HTTPS URLs without credentials or control characters. */
function normalizeHttpsUrl(value) {
  if (typeof value !== 'string' || value.length > 8192 || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !isPublicHostname(parsed.hostname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Bound and sanitize provider text before it reaches a stream card or header. */
function cleanText(value, maxLength, multiline = false) {
  if (typeof value !== 'string') return '';
  const normalized = multiline
    ? value.replace(/\r\n?|\u2028|\u2029/g, '\n').replace(/\t/g, ' ').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    : value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ');
  return normalized.trim().slice(0, maxLength);
}

/** Validate a DHT info-hash or public tracker URL advertised by a provider. */
function isSafeTorrentSource(value) {
  if (typeof value !== 'string' || value.length > 512 || value.includes('\\') || /[\u0000-\u0020\u007f]/.test(value)) return false;
  if (/^dht:[a-f0-9]{40}$/i.test(value)) return true;
  if (!/^tracker:(?:udp|https?):\/\//i.test(value)) return false;
  try {
    const parsed = new URL(value.slice('tracker:'.length));
    return ['udp:', 'http:', 'https:'].includes(parsed.protocol)
      && !parsed.username && !parsed.password && isPublicHostname(parsed.hostname);
  } catch {
    return false;
  }
}

/** Allow only a bounded set of playback request headers for direct HTTPS streams. */
function cleanPlaybackRequestHeaders(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowed = new Set(['accept', 'accept-language', 'origin', 'referer', 'user-agent']);
  const output = {};
  for (const [rawName, rawValue] of Object.entries(value).slice(0, 12)) {
    if (typeof rawName !== 'string' || typeof rawValue !== 'string') continue;
    const name = rawName.trim().toLowerCase();
    const headerValue = rawValue.trim();
    if (!allowed.has(name) || !headerValue || headerValue.length > 512 || /[\u0000-\u001f\u007f]/.test(headerValue)) continue;
    if (name === 'origin' || name === 'referer') {
      try {
        const parsed = new URL(headerValue);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || !isPublicHostname(parsed.hostname)) continue;
      } catch { continue; }
    }
    const canonicalName = name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('-');
    output[canonicalName] = headerValue;
  }
  return Object.keys(output).length ? output : null;
}

/** Normalize one provider stream to the supported Stremio contract, or drop it. */
function normalizeStream(stream, sourceName) {
  if (!stream || typeof stream !== 'object' || Array.isArray(stream)) return null;
  const normalized = {};
  const directUrl = normalizeHttpsUrl(stream.url);
  const isDirectUrl = Boolean(directUrl);
  if (isDirectUrl) {
    normalized.url = directUrl;
  } else if (typeof stream.infoHash === 'string' && INFO_HASH_RE.test(stream.infoHash)) {
    normalized.infoHash = stream.infoHash.toLowerCase();
    if (Number.isInteger(stream.fileIdx) && stream.fileIdx >= 0 && stream.fileIdx <= 10000) {
      normalized.fileIdx = stream.fileIdx;
    }
    if (Array.isArray(stream.sources)) {
      const sources = stream.sources.slice(0, 20).filter(isSafeTorrentSource);
      if (sources.length) normalized.sources = sources;
    }
    // Stremio's streaming server picks the file inside a multi-file torrent
    // that matches one of these patterns (stremio-core StreamSource::Torrent).
    if (Array.isArray(stream.fileMustInclude)) {
      const patterns = stream.fileMustInclude.slice(0, 4)
        .filter((pattern) => typeof pattern === 'string' && pattern.length > 0 && pattern.length <= 120
          && !/[\u0000-\u001f\u007f]/.test(pattern));
      if (patterns.length) normalized.fileMustInclude = patterns;
    }
  } else if (typeof stream.ytId === 'string' && YOUTUBE_ID_RE.test(stream.ytId)) {
    // Stremio clients resolve YouTube IDs in their native player; don't fetch,
    // download, proxy, or turn YouTube's signed media URLs into stream URLs.
    normalized.ytId = stream.ytId;
  } else {
    return null;
  }

  const name = cleanText(stream.name, 80);
  const title = cleanText(stream.title, 500, true);
  const description = cleanText(stream.description, 500, true);
  normalized.name = name ? `${sourceName} · ${name}`.slice(0, 120) : `Core Streams · ${sourceName}`;
  if (description) normalized.description = description;
  else if (title) normalized.title = title;
  const hints = {};
  if (stream.behaviorHints && typeof stream.behaviorHints === 'object' && !Array.isArray(stream.behaviorHints)) {
    if (stream.behaviorHints.notWebReady === true) hints.notWebReady = true;
    const bingeGroup = cleanText(stream.behaviorHints.bingeGroup, 120);
    if (bingeGroup) hints.bingeGroup = bingeGroup;
    if (Number.isSafeInteger(stream.behaviorHints.videoSize) && stream.behaviorHints.videoSize > 0) {
      hints.videoSize = stream.behaviorHints.videoSize;
    }
    const filename = cleanText(stream.behaviorHints.filename || stream.filename, 255);
    if (filename) hints.filename = filename;
    if (Array.isArray(stream.behaviorHints.countryWhitelist)) {
      hints.countryWhitelist = stream.behaviorHints.countryWhitelist.slice(0, 20)
        .filter((country) => typeof country === 'string' && /^[a-z]{3}$/i.test(country))
        .map((country) => country.toLowerCase());
    }
    if (isDirectUrl) {
      const requestHeaders = cleanPlaybackRequestHeaders(stream.behaviorHints.proxyHeaders?.request);
      if (requestHeaders) {
        hints.proxyHeaders = { request: requestHeaders };
        // Required by Stremio's stream contract when proxyHeaders are present.
        hints.notWebReady = true;
      }
    }
  } else {
    const filename = cleanText(stream.filename, 255);
    if (filename) hints.filename = filename;
  }
  if (Object.keys(hints).length) normalized.behaviorHints = hints;
  // Facts for the card formatter, kept beside the object (never serialized).
  // Structured AIOStreams-style fields are read before any text inference.
  const folderName = cleanText(stream.behaviorHints?.folderName || stream.folderName, 255);
  const seeders = Number(stream.seeders ?? stream.behaviorHints?.seeders);
  const indexer = cleanText(stream.indexer, 40);
  return setStreamFacts(normalized, {
    source: sourceName,
    label: name,
    release: String(title || description || '').split('\n')[0],
    pack: Boolean(normalized.fileMustInclude),
    ...(folderName ? { folderName } : {}),
    ...(Number.isFinite(seeders) && seeders >= 0 ? { seeders: Math.floor(seeders) } : {}),
    ...(indexer ? { tracker: indexer } : {}),
  });
}

/** Stable identity for de-duplicating torrent, YouTube and direct-URL streams. */
function dedupeKey(stream) {
  // The same torrent with a different file selection is a different result.
  if (stream.infoHash) return `hash:${stream.infoHash}:${stream.fileIdx ?? ''}:${(stream.fileMustInclude || []).join('|')}`;
  if (stream.ytId) return `youtube:${stream.ytId}`;
  return `url:${stream.url}`;
}

/** Infer an advertised resolution from card text; 0 means unknown. */
function inferredHeight(stream) {
  const text = [stream?.name, stream?.title, stream?.description, stream?.behaviorHints?.filename]
    .filter((part) => typeof part === 'string').join(' ').toLowerCase();
  const explicit = text.match(/(?:^|\D)(4320|2160|1440|1080|900|720|576|540|480|360|240)p(?:\D|$)/);
  if (explicit) return Number(explicit[1]);
  if (/\b(?:4k|uhd)\b/.test(text) || /\b3840\s*x\s*2160\b/.test(text)) return 2160;
  if (/\b2560\s*x\s*1440\b/.test(text)) return 1440;
  if (/\b1920\s*x\s*1080\b/.test(text)) return 1080;
  if (/\b1280\s*x\s*720\b/.test(text)) return 720;
  return 0;
}

/** Extract the largest advertised seeder hint; this is not verified swarm data. */
function inferredSeeders(stream) {
  const text = [stream?.name, stream?.title, stream?.description]
    .filter((part) => typeof part === 'string').join(' ');
  const matches = [...text.matchAll(/(?:seeders?|seeds?|👤)\s*[:=]?\s*(\d{1,6})/gi)];
  return matches.reduce((maximum, match) => Math.max(maximum, Number(match[1])), 0);
}

/**
 * Score a stream using only advertised card text. This is a heuristic, not
 * verified file/swarm data; unknown quality remains a fallback. Scores are
 * memoized per object so global sorting does not re-parse release names.
 */
function smartStreamScore(stream) {
  if (stream && typeof stream === 'object' && streamScoreCache.has(stream)) return streamScoreCache.get(stream);
  const text = [stream?.name, stream?.title, stream?.description, stream?.behaviorHints?.filename]
    .filter((part) => typeof part === 'string').join(' ').toLowerCase();
  let score = inferredHeight(stream) / 10;
  score += Math.min(inferredSeeders(stream), 500) / 20;
  if (typeof stream?.url === 'string') score += 12;
  if (typeof stream?.ytId === 'string') score += 8;
  // Release-source weights follow the same broad order AIOStreams uses. They
  // are advisory labels from the provider, not verified file properties.
  if (/\bremux\b/.test(text)) score += 30;
  else if (/\b(?:bluray|blu-ray|bdrip|brrip)\b/.test(text)) score += 20;
  else if (/\bweb[ .-]?dl\b|\b(?:amzn|nf|dsnp|hmax|atvp|pcok|hulu)[ .-]web\b/.test(text)) score += 15;
  else if (/\bweb[ .-]?rip\b/.test(text)) score += 10;
  else if (/\b(?:hdtv|pdtv)\b/.test(text)) score += 3;
  else if (/\bdvd(?:rip|r)?\b/.test(text)) score -= 10;
  if (/\b(?:dv|dovi|dolby[ .-]?vision)\b/.test(text)) score += 8;
  if (/\bhdr(?:10(?:\+|plus)?)?\b/.test(text)) score += 6;
  if (/\b(?:truehd|dts[ .-]?hd|flac)\b/.test(text)) score += 4;
  if (/\b3d\b/.test(text)) score -= 40;
  if (/\b(?:camrip|hdcam|hdts|telesync|telecine|screener|dvdscr)\b/.test(text)) score -= 150;
  if (stream && typeof stream === 'object') streamScoreCache.set(stream, score);
  return score;
}

const JUNK_RELEASE_RE = /\b(?:camrip|hdcam|hdts|telesync|telecine|hdtc|dvdscr|screener|sample)\b/i;
const OPEN_MEDIA_NAMES = new Set(['Public Domain Movies', 'Internet Archive', 'Blender Open Movies', 'Library of Congress']);
/** True for curated open-media providers whose slots are reserved. */
function isOpenMedia(stream) {
  return OPEN_MEDIA_NAMES.has(String(stream?.name || '').split(' · ')[0]);
}
/** Join the bounded card fields used by ranking and junk heuristics. */
function streamText(stream) {
  return [stream?.name, stream?.title, stream?.description, stream?.behaviorHints?.filename]
    .filter((part) => typeof part === 'string').join(' ');
}
/**
 * Remove obvious CAM/screener/sample releases unless they are the only fallback.
 * `sample` is a heuristic: a legitimately titled release containing that word
 * may be dropped from a mixed list, so keep the all-junk fallback conservative.
 */
function dropJunk(streams) {
  const clean = streams.filter((stream) => isOpenMedia(stream) || !JUNK_RELEASE_RE.test(streamText(stream)));
  return clean.length ? clean : streams;
}
/** Optionally cap results per advertised resolution, exempting curated open media. */
function limitPerResolution(streams, maximum) {
  if (!maximum) return streams;
  const counts = new Map();
  return streams.filter((stream) => {
    if (isOpenMedia(stream)) return true;
    const height = inferredHeight(stream);
    const count = counts.get(height) || 0;
    if (count >= maximum) return false;
    counts.set(height, count + 1);
    return true;
  });
}

/**
 * The film score used for the global sort: `smartStreamScore` plus, for
 * anime, the audio preference: `dub` (default) lifts English-dub, dual-audio
 * and multi-audio releases by 200, so a 1080p dub comes before even a 4K
 * REMUX sub; `sub` sinks dub-only ones. Episodes use rankEpisodes() instead.
 */
function rankScore(stream, { anime = false, audio = 'dub' } = {}) {
  let score = smartStreamScore(stream);
  if (!anime) return score;
  const dub = dubLabel(streamText(stream));
  if (audio === 'dub' && dub) score += 200;
  if (audio === 'sub' && (dub === 'Dub' || dub === 'English dub')) score -= 200;
  return score;
}

/** Playable delivery: TorBox-cached and direct HTTPS before P2P. */
function deliveryScore(stream) {
  if (getStreamFacts(stream).cached) return 40;
  if (typeof stream?.url === 'string') return 36;
  if (typeof stream?.ytId === 'string') return 30;
  return 0;
}

/** The anime audio preference, scored only among equally certain episodes. */
function audioScore(stream, { anime = false, audio = 'dub' } = {}) {
  if (!anime || audio === 'any') return 0;
  const dub = dubLabel(streamText(stream));
  if (audio === 'dub') return dub ? 30 : 0;
  return dub === 'Dub' || dub === 'English dub' ? 0 : 30;
}

/** Device compatibility: AV1, 3D and DV without an HDR fallback play on fewer devices. */
function deviceScore(stream) {
  const text = streamText(stream).toLowerCase();
  if (/av1|3d/.test(text)) return 0;
  if (/(?:dv|dovi|dolby[ .-]?vision)/.test(text) && !/hdr(?:10)?/.test(text)) return 4;
  return 10;
}

const sourceOf = (stream) => String(stream?.name || '').split(' · ')[0];
const RANK_KEYS = ['episode', 'delivery', 'audio', 'device', 'quality', 'diversity'];

/**
 * Episode-aware ranking. Each result is classified (EXACT, LIKELY, PACK,
 * UNKNOWN, MISMATCH) from its file name, fileIdx, fileMustInclude and folder
 * before its title; MISMATCH results are removed. The rest are ordered by
 * episode state, then delivery, anime audio, device, quality and source
 * diversity, and last by a stable key, so the order never depends on which
 * provider answered first. A 4K REMUX of the wrong episode is gone; a better
 * pack never passes an exact single.
 */
function rankEpisodes(streams, request, context = {}, showTitle = '') {
  const kept = [];
  const counts = new Map();
  for (const stream of streams) counts.set(sourceOf(stream), (counts.get(sourceOf(stream)) || 0) + 1);
  for (const [index, stream] of streams.entries()) {
    const facts = getStreamFacts(stream);
    const verdict = classifyEpisode(request, {
      filename: stream.behaviorHints?.filename || facts.filename || '',
      folderName: facts.folderName || '',
      release: facts.release || '',
      text: [stream.title, stream.description].filter(Boolean).join('\n'),
      fileIdx: stream.fileIdx,
      fileMustInclude: stream.fileMustInclude,
      selected: Boolean(facts.cached),
    });
    const episode = episodeScore(verdict);
    if (episode === null) continue;
    const parts = {
      episode,
      delivery: deliveryScore(stream),
      audio: audioScore(stream, context),
      device: deviceScore(stream),
      quality: smartStreamScore(stream),
      diversity: 1 - (counts.get(sourceOf(stream)) || 0) / streams.length,
    };
    const total = parts.episode + parts.delivery + parts.audio + parts.device
      + Math.max(0, Math.min(15, parts.quality / 20)) + parts.diversity * 4;
    setStreamFacts(stream, { episode: { state: verdict.state, line: episodeLine(request, verdict, showTitle) }, rank: { ...parts, total } });
    kept.push({ stream, index, parts, key: stream.infoHash ? dedupeKey(stream) : `${dedupeKey(stream)}|${sourceOf(stream)}` });
  }
  return kept.sort((a, b) => {
    for (const name of RANK_KEYS) if (a.parts[name] !== b.parts[name]) return b.parts[name] - a.parts[name];
    return a.key < b.key ? -1 : a.key > b.key ? 1 : a.index - b.index;
  }).map(({ stream }) => stream);
}

/** Rank within providers, then interleave groups so one source cannot erase fallbacks. */
function interleaveStreamGroups(groups) {
  const ranked = groups.map((group) => (Array.isArray(group) ? group : [])
    .map((stream, index) => ({ stream, index, score: smartStreamScore(stream) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ stream, score }) => ({ stream, score })));
  const sourceOrder = ranked.map((_, index) => index);
  const bestFirstOrder = [...sourceOrder].sort((a, b) =>
    (ranked[b][0]?.score ?? -Infinity) - (ranked[a][0]?.score ?? -Infinity) || a - b);
  const output = [];
  const offsets = ranked.map(() => 0);
  let remaining = ranked.reduce((sum, group) => sum + group.length, 0);
  let firstRound = true;
  while (remaining > 0) {
    let appended = false;
    const order = firstRound ? bestFirstOrder : sourceOrder;
    for (const index of order) {
      const offset = offsets[index];
      if (offset >= ranked[index].length) continue;
      output.push(ranked[index][offset].stream);
      offsets[index]++;
      remaining--;
      appended = true;
    }
    firstRound = false;
    if (!appended) break;
  }
  return output;
}

/** Read a response body up to a byte cap; return null on overflow or read failure. */
async function readBounded(response, maximumBytes) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const buffer = await response.arrayBuffer();
    return buffer.byteLength <= maximumBytes ? new Uint8Array(buffer) : null;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    try { await reader.cancel(); } catch {}
    return null;
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/** Get or create the isolate-local breaker state for a fixed source id. */
function getSourceHealth(sourceId) {
  let state = sourceHealth.get(sourceId);
  if (!state) {
    state = { failures: 0, openUntil: 0, probeInFlight: false };
    sourceHealth.set(sourceId, state);
  }
  return state;
}

/** Allow a request, including one half-open probe after breaker cooldown. */
function sourceAllowed(sourceId) {
  const state = getSourceHealth(sourceId);
  if (state.openUntil > Date.now()) return false;
  if (state.openUntil > 0) {
    // After the cooldown, allow exactly one half-open probe in this isolate.
    if (state.probeInFlight) return false;
    state.probeInFlight = true;
  }
  return true;
}

/** Reset a source breaker after a successful or valid empty response. */
function sourceSucceeded(sourceId) {
  sourceHealth.set(sourceId, { failures: 0, openUntil: 0, probeInFlight: false });
}

/** Count a real provider failure and open the breaker at the threshold. */
function sourceFailed(sourceId) {
  const state = getSourceHealth(sourceId);
  state.probeInFlight = false;
  state.failures += 1;
  if (state.failures >= SOURCE_FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + SOURCE_BREAKER_COOLDOWN_MS;
  }
}

/** Release a half-open probe when the request-wide deadline, not the provider, expired. */
function sourceDeadlineCancelled(sourceId) {
  // The request-wide budget expired; this says nothing about source health.
  // Release a half-open probe without changing its failure count or cooldown.
  getSourceHealth(sourceId).probeInFlight = false;
}

/** Run a fetch task after a header slot is granted when the fetch impl is limited. */
function runWithHeaderSlot(fetchImpl, task, signal) {
  return typeof fetchImpl?.run === 'function' ? fetchImpl.run(task, signal) : task(fetchImpl);
}

/** Distinguish a provider's own timeout from a request-wide deadline cancellation. */
function isProviderTimeout(error, deadlineSignal) {
  return error?.providerTimeout === true
    || (error?.name === 'TimeoutError' && !deadlineSignal?.aborted);
}

/** Best-effort disposal of an unread response body. */
function cancelBody(response) {
  try {
    const pending = response?.body?.cancel();
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  } catch { /* best-effort disposal */ }
}

/** Normalize titles for exact open-media/indexer matching without locale guessing. */
function normalizeMatchTitle(value) {
  return cleanText(value, 300)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Recognize only allowlisted Creative Commons/public-domain license URLs. */
function declaredOpenLicense(value) {
  if (typeof value !== 'string' || value.length > 512) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.hostname.toLowerCase() !== 'creativecommons.org'
    || url.username || url.password || url.port || url.search || url.hash) return null;
  const path = url.pathname.toLowerCase().replace(/\/+$/, '');
  if (/^\/publicdomain\/(?:mark|zero)\/(?:\d+(?:\.\d+)?|1\.0)$/.test(path)) {
    return { url: url.href, label: path.includes('/zero/') ? 'CC0' : 'Public Domain Mark' };
  }
  // Creative Commons' retired Public Domain Certification. Still declared on
  // many Archive uploads of public-domain films (e.g. Night of the Living Dead).
  if (path === '/licenses/publicdomain') return { url: url.href, label: 'Public Domain' };
  const match = path.match(/^\/licenses\/(by|by-sa)\/(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { url: url.href, label: match[1] === 'by-sa' ? `CC BY-SA ${match[2]}` : `CC BY ${match[2]}` };
}

/** Fetch JSON with a byte cap, timeout, manual redirects and optional allowlisted hop. */
// `accept` overrides the Accept header (Kitsu answers 406 to plain JSON);
// `text: true` returns the body as a string (Nyaa's RSS is XML).
async function fetchBoundedJson(url, fetchImpl, maxBytes = OPEN_MEDIA_MAX_BYTES, timeoutMs = OPEN_MEDIA_TIMEOUT_MS, deadlineSignal = null, redirectHosts = [], jsonBody = null, { accept = 'application/json', text = false } = {}) {
  const timeout = createRequestTimeout(timeoutMs);
  const signal = deadlineSignal ? AbortSignal.any([timeout.signal, deadlineSignal]) : timeout.signal;
  const init = jsonBody === null
    ? { method: 'GET', headers: { Accept: accept }, redirect: 'manual', signal }
    : { method: 'POST', headers: { Accept: accept, 'Content-Type': 'application/json' }, body: JSON.stringify(jsonBody), redirect: 'manual', signal };
  const request = (target) => runWithHeaderSlot(fetchImpl, async (fetch) => {
    timeout.start();
    return fetch(target, init);
  }, deadlineSignal);
  try {
    let response = await request(url);
    if (!response) throw new Error('Open-media request returned no response');
    // Redirects stay manual, but a caller may name hosts it trusts as the
    // destination of one hop (Cinemeta sends cache misses to cinemeta-live).
    if ([301, 302, 303, 307, 308].includes(response.status) && redirectHosts.length) {
      const location = response.headers && response.headers.get('location');
      cancelBody(response);
      let next = null;
      try { next = new URL(location, url); } catch { /* invalid Location */ }
      if (!next || next.protocol !== 'https:' || !redirectHosts.includes(next.hostname)
        || next.username || next.password || next.port) {
        throw new Error('Open-media redirect is not allowed');
      }
      response = await request(next.href);
      if (!response) throw new Error('Open-media request returned no response');
    }
    if (response.status === 404) {
      cancelBody(response);
      return null;
    }
    if (response.status < 200 || response.status >= 300) {
      cancelBody(response);
      throw new Error(`Open-media request failed with HTTP ${response.status}`);
    }
    const contentLength = Number(response.headers && response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      cancelBody(response);
      throw new Error('Open-media response exceeds size limit');
    }
    const buffer = await readBounded(response, maxBytes);
    if (!buffer) {
      if (timeout.signal.aborted) throw timeout.signal.reason;
      throw new Error('Open-media response could not be read within size limit');
    }
    if (text) return new TextDecoder().decode(buffer);
    try { return JSON.parse(new TextDecoder().decode(buffer)); } catch {
      throw new Error('Open-media response was not valid JSON');
    }
  } catch (error) {
    if (timeout.signal.aborted) {
      // Do not mutate the platform's abort reason; tag a wrapper instead.
      throw Object.assign(new Error('provider request timed out'), {
        name: 'TimeoutError', providerTimeout: true, cause: timeout.signal.reason,
      });
    }
    throw error;
  } finally {
    timeout.cancel();
  }
}

function archiveItemYear(metadata) {
  const value = cleanText(String(metadata?.year ?? metadata?.date ?? ''), 32);
  const match = value.match(/(?:^|\D)(\d{4})(?:\D|$)/);
  return match ? Number(match[1]) : null;
}

function archiveMediaStreams(identifier, metadataPayload, expectedTitle, expectedYear) {
  const metadata = metadataPayload?.metadata;
  if (!metadata || !Array.isArray(metadataPayload?.files)) return [];
  const actualTitle = cleanText(Array.isArray(metadata.title) ? metadata.title[0] : metadata.title, 300);
  if (!actualTitle || normalizeMatchTitle(actualTitle) !== normalizeMatchTitle(expectedTitle)) return [];
  const year = archiveItemYear(metadata);
  if (expectedYear && year !== expectedYear) return [];
  if (expectedYear && !year) return [];
  const licenseValue = Array.isArray(metadata.licenseurl) ? metadata.licenseurl[0] : metadata.licenseurl;
  const license = declaredOpenLicense(licenseValue);
  if (!license) return [];

  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{1,99}$/.test(identifier)) return [];
  const creatorValue = Array.isArray(metadata.creator) ? metadata.creator[0] : metadata.creator;
  const creator = cleanText(creatorValue, 160);
  const files = metadataPayload.files
    .filter((file) => file && typeof file === 'object' && typeof file.name === 'string')
    .filter((file) => file.name.length <= 512 && !file.name.startsWith('/')
      && !file.name.split('/').some((segment) => segment === '..' || segment === '.'))
    .filter((file) => /\.mp4$/i.test(file.name)
      && /mpeg.?4|mp4/i.test(String(file.format || ''))
      && file.private !== true && file.private !== 'true')
    .filter((file) => !file.size || (Number(file.size) > 0 && Number(file.size) <= 30 * 1024 * 1024 * 1024))
    .slice(0, 2);

  return files.map((file) => {
    const mediaPath = file.name.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const title = cleanText(file.title || actualTitle, 200);
    const size = Number(file.size);
    const description = [
      `Internet Archive item: ${actualTitle}${year ? ` (${year})` : ''}.`,
      creator ? `Creator: ${creator}.` : '',
      `Uploader-declared license: ${license.label} (${license.url}).`,
      `Item record: https://archive.org/details/${identifier}.`,
      'Rights metadata is uploader-supplied and has not been independently verified.',
    ].filter(Boolean).join(' ');
    return {
      url: `https://archive.org/download/${encodeURIComponent(identifier)}/${mediaPath}`,
      name: license.label,
      title: `${title}${year ? ` (${year})` : ''}`,
      description,
      filename: file.name.split('/').pop(),
      ...(Number.isSafeInteger(size) && size > 0 ? { behaviorHints: { videoSize: size } } : {}),
    };
  });
}

function locFilmStreams(id, expected) {
  const film = LOC_OPEN_FILMS.find((candidate) => candidate.imdbId === id.toLowerCase());
  const acceptedTitles = film ? [film.title, ...(film.metadataTitles || [])] : [];
  if (!film || !expected || !acceptedTitles.some((title) => normalizeMatchTitle(expected.title) === normalizeMatchTitle(title))
    || expected.year !== film.year) return [];
  const url = normalizeHttpsUrl(film.directUrl);
  if (!url || new URL(url).hostname !== 'tile.loc.gov') return [];
  const filename = url.split('/').pop();
  return [normalizeStream({
    url,
    name: 'Public domain',
    title: `${film.title} (${film.year})`,
    filename,
    description: [
      `LOC #${film.locItemId}; ${film.editionNote}`,
      `LOC collection says public domain and free to use and reuse. ${film.collectionUrl}`,
      'Credit: LOC Motion Picture, Broadcasting, and Recorded Sound Division.',
      `Item: ${film.rightsUrl}`,
      'Check local rights; codec and playback are untested.',
    ].join(' '),
    behaviorHints: { filename },
  }, 'Library of Congress')].filter(Boolean).map((stream) => ({ ...stream, title: `${film.title} (${film.year})` }));
}

function cinemetaTitleYear(payload) {
  const meta = payload?.meta;
  if (!meta || typeof meta.name !== 'string') return null;
  const title = cleanText(meta.name, 300);
  // The cached host sends `year`/`released`; cinemeta-live sends only `releaseInfo`.
  const yearText = String(meta.year || meta.released || meta.releaseInfo || '');
  const yearValue = Number((yearText.match(/\d{4}/) || [])[0]);
  const year = Number.isInteger(yearValue) && yearValue >= 1880 && yearValue <= 2200 ? yearValue : null;
  // Cinemeta lists anime under IMDb ids too; Japanese animation is treated as
  // anime, which adds Nyaa and the dub preference.
  const genres = Array.isArray(meta.genres) ? meta.genres.map(String) : [];
  const anime = genres.includes('Animation') && /\bjapan\b/i.test(String(meta.country || ''));
  return title && year ? { title, year, ...(anime ? { anime: true } : {}) } : null;
}

async function fetchInternetArchiveFromMeta(id, expected, fetchImpl, deadlineSignal) {
  if (!sourceAllowed('internet-archive')) return [];
  try {
    const searchUrl = new URL('https://archive.org/advancedsearch.php');
    const escapedTitle = expected.title.replace(/([\\"])/g, '\\$1');
    searchUrl.searchParams.set('q', `mediatype:movies AND title:"${escapedTitle}" AND (year:${expected.year} OR date:[${expected.year}-01-01 TO ${expected.year}-12-31]) AND licenseurl:*creativecommons.org*`);
    searchUrl.searchParams.append('fl[]', 'identifier');
    searchUrl.searchParams.append('fl[]', 'title');
    searchUrl.searchParams.append('sort[]', 'downloads desc');
    searchUrl.searchParams.set('rows', '12');
    searchUrl.searchParams.set('page', '1');
    searchUrl.searchParams.set('output', 'json');
    const searchPayload = await fetchBoundedJson(searchUrl.href, fetchImpl, OPEN_MEDIA_MAX_BYTES, OPEN_MEDIA_TIMEOUT_MS, deadlineSignal);
    if (searchPayload === null) {
      sourceSucceeded('internet-archive');
      return [];
    }
    const docs = searchPayload?.response?.docs;
    if (!Array.isArray(docs)) {
      sourceFailed('internet-archive');
      return [];
    }
    const candidates = docs
      .filter((doc) => doc && typeof doc.identifier === 'string'
        && /^[A-Za-z0-9][A-Za-z0-9_.-]{1,99}$/.test(doc.identifier)
        && typeof doc.title === 'string'
        && normalizeMatchTitle(doc.title) === normalizeMatchTitle(expected.title))
      .slice(0, 2);
    if (!candidates.length) {
      sourceSucceeded('internet-archive');
      return [];
    }
    const records = [];
    // Keep metadata fetches sequential: the movie add-ons and Blender adapter
    // can already occupy six concurrent outbound connections on Workers Free.
    for (const doc of candidates) {
      const payload = await fetchBoundedJson(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`, fetchImpl, OPEN_MEDIA_MAX_BYTES, OPEN_MEDIA_TIMEOUT_MS, deadlineSignal);
      if (payload === null) continue; // A missing item is not a service failure.
      records.push(archiveMediaStreams(doc.identifier, payload, expected.title, expected.year));
    }
    sourceSucceeded('internet-archive');
    return records.flat().slice(0, 6)
      .map((stream) => normalizeStream(stream, 'Internet Archive'))
      .filter(Boolean);
  } catch (error) {
    if (isProviderTimeout(error, deadlineSignal)) sourceFailed('internet-archive');
    else if (deadlineSignal?.aborted) sourceDeadlineCancelled('internet-archive');
    else sourceFailed('internet-archive');
    return [];
  }
}

const BLENDER_OPEN_FILMS = [
  {
    imdbId: 'tt1254207',
    title: 'Big Buck Bunny',
    year: 2008,
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    peerTubeLicenseId: 1,
    officialRightsUrl: 'https://peach.blender.org/about/',
    allowedVideoTitles: [
      'Big Buck Bunny',
      'Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film',
    ],
  },
  {
    imdbId: 'tt0807840',
    title: 'Elephants Dream',
    year: 2006,
    license: 'CC BY 2.5',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.5/',
    // PeerTube's exact official upload currently reports "Unknown"; the original
    // Blender project page explicitly licenses this film under CC BY 2.5.
    peerTubeLicenseId: null,
    officialRightsUrl: 'https://orange.blender.org/',
    allowedVideoTitles: ['Elephants Dream'],
  },
  {
    imdbId: 'tt7993892',
    title: 'Caminandes: Llamigos',
    year: 2016,
    license: 'CC BY (version unspecified)',
    licenseUrl: null,
    peerTubeLicenseId: 1,
    officialRightsUrl: 'https://cloud.blender.org/p/caminandes-3',
    officialVideoUrl: 'https://video.blender.org/w/5ruRYckTcQMTMQvyqMnVsr',
    licenseEvidenceNote: 'The official PeerTube API reports Attribution without a version; the official video description says the film and source files are Creative Commons. An Internet Archive uploader lists CC BY 3.0, but that unverified version is not relied upon.',
    allowedVideoTitles: ['Caminandes 3: Llamigos - Funny 3D Animated Short'],
  },
  {
    imdbId: 'tt1727587',
    title: 'Sintel',
    year: 2010,
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    // PeerTube metadata is unknown; Blender's official project licensing page
    // grants CC BY 3.0 and this title is pinned to its exact official upload.
    peerTubeLicenseId: null,
    officialRightsUrl: 'https://durian.blender.org/sharing/',
    allowedVideoTitles: ['Sintel - Third Open Movie by Blender Foundation'],
  },
  {
    imdbId: 'tt2285752',
    title: 'Tears of Steel',
    year: 2012,
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    // The official PeerTube record's license is unknown; Blender's project
    // page explicitly grants CC BY 3.0 and its title/account/channel are pinned.
    peerTubeLicenseId: null,
    officialRightsUrl: 'https://mango.blender.org/about/',
    allowedVideoTitles: ['Tears of Steel - Blender VFX Open Movie'],
  },
  {
    imdbId: 'tt5243642',
    title: 'Glass Half',
    year: 2015,
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    peerTubeLicenseId: 1,
    officialRightsUrl: 'https://studio.blender.org/projects/glass-half/pages/licensing/',
    allowedVideoTitles: ['Glass Half - Blender animated cartoon'],
  },
  {
    imdbId: 'tt13716914',
    title: 'Coffee Run',
    year: 2020,
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    // The exact official PeerTube upload reports Unknown; Blender's project
    // licensing page expressly grants CC BY 4.0 for this film/project.
    peerTubeLicenseId: null,
    officialRightsUrl: 'https://studio.blender.org/projects/coffee-run/pages/licensing/',
    allowedVideoTitles: ['Coffee Run - Blender Open Movie'],
  },
];

function blenderVideoAllowed(video, film) {
  return video && video.privacy?.id === 1 && video.nsfw !== true
    && (video.licence?.id === film.peerTubeLicenseId || (film.peerTubeLicenseId === null && (video.licence?.id === null || video.licence?.id === undefined)))
    && video.channel?.name === 'blender_open_movies'
    && video.account?.name === 'blender'
    && BLENDER_OPEN_FILMS.some((known) => known.imdbId === film.imdbId
      && known.allowedVideoTitles.includes(cleanText(video.name, 300)));
}

async function fetchBlenderOpenMovie(id, expected, fetchImpl, deadlineSignal) {
  const film = BLENDER_OPEN_FILMS.find((candidate) => candidate.imdbId === id.toLowerCase());
  if (!film || expected.title !== film.title || expected.year !== film.year || !sourceAllowed('blender-open-movies')) return [];
  try {
    const searchUrl = new URL('https://video.blender.org/api/v1/videos');
    searchUrl.searchParams.set('search', film.title);
    searchUrl.searchParams.set('count', '10');
    const searchPayload = await fetchBoundedJson(searchUrl.href, fetchImpl, OPEN_MEDIA_MAX_BYTES, OPEN_MEDIA_TIMEOUT_MS, deadlineSignal);
    if (searchPayload === null) {
      sourceSucceeded('blender-open-movies');
      return [];
    }
    if (!Array.isArray(searchPayload?.data)) {
      sourceFailed('blender-open-movies');
      return [];
    }
    const candidates = searchPayload.data.filter((video) => blenderVideoAllowed(video, film)
      && Number.isSafeInteger(video.id) && video.id > 0).slice(0, 1);
    if (!candidates.length) {
      sourceSucceeded('blender-open-movies');
      return [];
    }
    const details = await Promise.all(candidates.map(async (video) => {
      const payload = await fetchBoundedJson(`https://video.blender.org/api/v1/videos/${video.id}`, fetchImpl, OPEN_MEDIA_MAX_BYTES, OPEN_MEDIA_TIMEOUT_MS, deadlineSignal);
      if (payload === null) return []; // A removed video is not a service failure.
      if (!blenderVideoAllowed(payload, film) || !Array.isArray(payload.files)) return [];
      return payload.files
        .filter((file) => file && typeof file.fileUrl === 'string'
          && file.hasAudio === true && file.hasVideo === true
          && Number.isSafeInteger(file.size) && file.size > 0 && file.size <= 30 * 1024 * 1024 * 1024)
        .filter((file) => {
          try {
            const url = new URL(file.fileUrl);
            return url.protocol === 'https:' && url.hostname === 'video.blender.org'
              && url.pathname.startsWith('/object-storage/web_videos/') && /\.mp4$/i.test(url.pathname)
              && !url.username && !url.password && !url.search && !url.hash;
          } catch { return false; }
        })
        .sort((a, b) => (b.resolution?.id || 0) - (a.resolution?.id || 0))
        .slice(0, 2)
        .map((file) => normalizeStream({
          url: file.fileUrl,
          name: film.license,
          title: `${film.title} (${film.year})`,
          filename: file.fileUrl.split('/').pop(),
          description: `Official Blender Open Movie. ${film.licenseUrl ? `${film.license} (${film.licenseUrl})` : film.license}. ${film.licenseEvidenceNote ? `${film.licenseEvidenceNote} ` : ''}See ${[film.officialRightsUrl, film.officialVideoUrl].filter(Boolean).join(' and ')}. Attribution must be preserved.`,
          behaviorHints: { videoSize: file.size, filename: file.fileUrl.split('/').pop() },
        }, 'Blender Open Movies'))
        .filter(Boolean);
    }));
    sourceSucceeded('blender-open-movies');
    return details.flat().slice(0, 4);
  } catch (error) {
    if (isProviderTimeout(error, deadlineSignal)) sourceFailed('blender-open-movies');
    else if (deadlineSignal?.aborted) sourceDeadlineCancelled('blender-open-movies');
    else sourceFailed('blender-open-movies');
    return [];
  }
}

// Public title/year metadata only: no tokens, credentials, or stream responses.
// Bounded and isolate-local; a cache hit also keeps title-checked sources useful
// during a Cinemeta outage. Never cache a missing title or a failed lookup.
const CINEMETA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CINEMETA_CACHE_MAX_ENTRIES = 256;
const cinemetaCache = new Map();

// One lookup per uncached title, shared by all indexers and open-media matchers.
// Resolves to { title, year } or null.
async function fetchCinemetaTitleYear(type, imdb, fetchImpl, deadlineSignal, report = {}) {
  const cacheKey = `${type}:${imdb.toLowerCase()}`;
  const cached = cinemetaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    report.cinemeta = 'cache hit';
    return { ...cached.value };
  }
  if (cached) cinemetaCache.delete(cacheKey);
  if (!sourceAllowed('cinemeta')) { report.cinemeta = 'paused'; return null; }
  try {
    const metaPayload = await fetchBoundedJson(
      `https://v3-cinemeta.strem.io/meta/${type}/${encodeURIComponent(imdb)}.json`,
      fetchImpl, OPEN_MEDIA_MAX_BYTES, OPEN_MEDIA_TIMEOUT_MS, deadlineSignal,
      // Titles missing from the cached host (most open-media films) are
      // answered with a 307 to cinemeta-live; it was being counted as an outage.
      ['cinemeta-live.strem.io'],
    );
    // A missing item or a valid but metadata-free response is not an upstream
    // outage. Transport, HTTP, body-size, and JSON errors throw above instead.
    sourceSucceeded('cinemeta');
    const expected = cinemetaTitleYear(metaPayload);
    if (expected) {
      if (cinemetaCache.size >= CINEMETA_CACHE_MAX_ENTRIES) {
        cinemetaCache.delete(cinemetaCache.keys().next().value);
      }
      cinemetaCache.set(cacheKey, { value: { ...expected }, expiresAt: Date.now() + CINEMETA_CACHE_TTL_MS });
    }
    report.cinemeta = expected ? 'ok' : 'no title';
    return expected;
  } catch (error) {
    const providerTimeout = isProviderTimeout(error, deadlineSignal);
    const timedOut = providerTimeout || deadlineSignal?.aborted;
    if (providerTimeout) sourceFailed('cinemeta');
    else if (deadlineSignal?.aborted) sourceDeadlineCancelled('cinemeta');
    else sourceFailed('cinemeta');
    report.cinemeta = timedOut ? 'timeout' : 'network error';
    return null;
  }
}

/** Resolve curated LOC/Blender matches and metadata-gated Archive streams concurrently. */
async function fetchOpenMedia(type, id, fetchImpl, deadlineSignal, metaPromise) {
  if (type !== 'movie') return [];
  const imdb = id.split(':')[0].toLowerCase();

  // These direct-HTTP records are pinned to exact IMDb IDs, titles, years, and
  // item-level rights evidence. They do not need Cinemeta to be available to
  // return a known official/open-media match. In particular, clients such as
  // WuPlay cannot use the torrent-only results from the general add-on sources.
  const locFilm = LOC_OPEN_FILMS.find((film) => film.imdbId === imdb);
  const blenderFilm = BLENDER_OPEN_FILMS.find((film) => film.imdbId === imdb);
  const knownExpected = locFilm
    ? { title: locFilm.title, year: locFilm.year }
    : blenderFilm ? { title: blenderFilm.title, year: blenderFilm.year } : null;
  const locStreams = knownExpected ? locFilmStreams(imdb, knownExpected) : [];

  // Start the exact-title official Blender lookup alongside the metadata query.
  // Previously Blender and LOC were both gated on a successful Cinemeta response,
  // so a metadata outage could erase otherwise independent direct HTTP streams.
  const blenderPromise = blenderFilm
    ? fetchBlenderOpenMovie(imdb, knownExpected, fetchImpl, deadlineSignal)
    : Promise.resolve([]);

  const expected = await metaPromise;
  // Archive only needs Cinemeta, not Blender. Start it as soon as the title is
  // known and let the two independent open-media chains run concurrently.
  const archivePromise = expected
    ? fetchInternetArchiveFromMeta(imdb, expected, fetchImpl, deadlineSignal)
    : Promise.resolve([]);
  const [archiveStreams, blenderStreams] = await Promise.all([archivePromise, blenderPromise]);
  return [...locStreams, ...archiveStreams, ...blenderStreams];
}

/** Fetch one fixed Stremio add-on with bounded body, timeout and breaker accounting. */
async function fetchSource(source, type, id, fetchImpl, report = {}, deadlineSignal = null) {
  if (!sourceAllowed(source.id)) { report[source.id] = 'paused'; return []; }
  const url = sourceRequestUrl(source.base, type, id);
  const timeout = createRequestTimeout(SOURCE_TIMEOUT_MS);
  const fail = (reason) => {
    if (timeout.signal.aborted) {
      report[source.id] = 'timeout';
      sourceFailed(source.id);
      return [];
    }
    if (deadlineSignal?.aborted) {
      sourceDeadlineCancelled(source.id);
      report[source.id] = 'timeout';
      return [];
    }
    report[source.id] = reason;
    sourceFailed(source.id);
    return [];
  };
  try {
    const response = await runWithHeaderSlot(fetchImpl, async (fetch) => {
      timeout.start();
      const signal = deadlineSignal ? AbortSignal.any([timeout.signal, deadlineSignal]) : timeout.signal;
      return fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'manual',
        signal,
      });
    }, deadlineSignal);
    if (response && response.status === 404) {
      // Add-ons answer 404 for a type or id they do not serve (the configured
      // source may be movie-only). Three of those used to open the breaker and
      // hide the source from every request for 30 seconds.
      cancelBody(response);
      sourceSucceeded(source.id);
      report[source.id] = 'ok 0';
      return [];
    }
    if (!response || response.status < 200 || response.status >= 300) {
      cancelBody(response);
      return fail(response ? `http ${response.status}` : 'no response');
    }
    const contentLength = Number(response.headers && response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_RESPONSE_BYTES) {
      cancelBody(response);
      return fail('too large');
    }
    const buffer = await readBounded(response, MAX_SOURCE_RESPONSE_BYTES);
    if (!buffer) {
      if (timeout.signal.aborted) return fail('timeout');
      if (deadlineSignal?.aborted) {
        sourceDeadlineCancelled(source.id);
        report[source.id] = 'timeout';
        return [];
      }
      return fail('too large');
    }
    let payload;
    try { payload = JSON.parse(new TextDecoder().decode(buffer)); } catch {
      return fail('not json');
    }
    if (!payload || !Array.isArray(payload.streams)) return fail('no streams array');
    sourceSucceeded(source.id);
    const streams = payload.streams.slice(0, MAX_STREAMS_PER_SOURCE)
      .map((stream) => {
        const normalized = normalizeStream(stream, source.name);
        if (normalized && source.id === 'public-domain-movies') {
          normalized.description = [
            normalized.description,
            'Listed by the Stremio Public Domain Movies add-on; public-domain status can vary by country, so verify local rights.',
          ].filter(Boolean).join(' ');
        }
        return normalized;
      })
      .filter(Boolean);
    report[source.id] = `ok ${streams.length}`;
    return streams;
  } catch (error) {
    // A provider timeout counts against that provider. A request-wide budget
    // expiry (including time spent in the header-wait queue) does not.
    if (timeout.signal.aborted || error?.name === 'TimeoutError') return fail('timeout');
    if (deadlineSignal?.aborted) {
      sourceDeadlineCancelled(source.id);
      report[source.id] = 'timeout';
      return [];
    }
    // Providers are independent: one outage or timeout must not erase results
    // returned by the other configured providers. An isolate-local breaker also
    // stops repeatedly waiting on a provider that has failed three times.
    return fail('network error');
  } finally {
    timeout.cancel();
  }
}

// --- Public torrent indexes -------------------------------------------------
// Torrentio refuses requests from shared Cloudflare egress and TorrentsDB has
// been returning 502, so on the deployed Worker both could fail together and
// leave mainstream titles with no results at all. These are fixed JSON APIs,
// queried by IMDb id (EZTV's results are additionally title-checked), and they
// return info hashes only: nothing is downloaded or relayed by the Worker.
const TORRENT_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.dler.org:6969/announce',
];
const INDEXER_MAX_BYTES = 512 * 1024;

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
  return `${Math.round(value / 1e6)} MB`;
}

// Build a raw Stremio torrent stream, then run it through normalizeStream so
// indexer results get exactly the validation add-on results get.
function indexerStream(sourceName, { hash, label, release, seeders, sizeBytes, filename, fileMustInclude, tracker }) {
  if (typeof hash !== 'string' || !INFO_HASH_RE.test(hash)) return null;
  const infoHash = hash.toLowerCase();
  const seeds = Number(seeders);
  const size = Number(sizeBytes);
  const stats = [
    Number.isFinite(seeds) && seeds >= 0 ? `👤 ${Math.floor(seeds)}` : '',
    formatBytes(size) ? `💾 ${formatBytes(size)}` : '',
  ].filter(Boolean).join(' ');
  const stream = normalizeStream({
    infoHash,
    name: label || 'Torrent',
    title: [release, stats].filter(Boolean).join('\n'),
    sources: [...TORRENT_TRACKERS.map((tracker) => `tracker:${tracker}`), `dht:${infoHash}`],
    ...(fileMustInclude ? { fileMustInclude } : {}),
    behaviorHints: {
      bingeGroup: `core-streams|${sourceName}|${label || 'torrent'}`,
      ...(filename ? { filename } : {}),
      ...(Number.isSafeInteger(size) && size > 0 ? { videoSize: size } : {}),
    },
  }, sourceName);
  return setStreamFacts(stream, {
    ...(Number.isFinite(seeds) && seeds >= 0 ? { seeders: Math.floor(seeds) } : {}),
    ...(tracker ? { tracker } : {}),
  });
}

// Matches a single-episode release name ("S01E01", "s1e1", "1x01") but not a
// range ("S01E01-E03"), whose file layout is unknown.
function episodeMatcher(season, episode) {
  const s = Number(season);
  const e = Number(episode);
  // Reject multi-episode releases, not quality suffixes such as `-1080p`.
  const episodeNumber = '(?:E[0-9]+|[0-9]{1,3}(?![0-9A-Za-z]))';
  // Audio-channel suffixes such as 5.1/7.1/2.0 are not episode continuations.
  const audioChannels = '(?:2\\.0|5\\.1|7\\.1)(?![0-9])';
  const nextEpisode = `(?:[ ._-]*E[0-9]|[ ._-]*(?:-[ ._-]*)?(?!${audioChannels})${episodeNumber}|[ ._-]+(?:and|&)[ ._-]*${episodeNumber})`;
  return new RegExp(`(?:\\bS0*${s}[ ._-]?E0*${e}|\\b${s}x0*${e})(?![0-9]|${nextEpisode})`, 'i');
}

// A whole-season pack for this season ("Season 2", "S02 Complete", "S02 1080p"),
// or a complete-series pack. Neither names the episode.
function seasonPackMatcher(season) {
  const s = Number(season);
  return new RegExp(`(?:\\bseason[ ._-]?0*${s}\\b(?![ ._-]*(?:-|to)[ ._-]*\\d)|\\bS0*${s}\\b(?![ ._-]*(?:E\\d|-))|\\bcomplete[ ._-]+series\\b)`, 'i');
}

// Hands the streaming server the episode to open inside a pack. Written
// without lookarounds or flags so any regex engine reads it the same way.
function episodeFilePattern(season, episode) {
  const s = Number(season);
  const e = Number(episode);
  // Unlike a release-title match, a multipart file containing the requested
  // episode is valid. Support both S02E01 and 2x01, including the end of a name.
  return `(?:^|[^0-9])(?:[Ss]0*${s}[ ._-]?[Ee]0*${e}|${s}[Xx]0*${e})(?:[^0-9]|$)`;
}

function releaseLabel(text) {
  const height = inferredHeight({ title: text });
  return height ? `${height}p` : 'Torrent';
}

async function fetchIndexer(sourceId, url, fetchImpl, deadlineSignal, report, toStreams, jsonBody = null, options = {}) {
  if (!sourceAllowed(sourceId)) { report[sourceId] = 'paused'; return []; }
  try {
    const payload = await fetchBoundedJson(url, fetchImpl, INDEXER_MAX_BYTES, SOURCE_TIMEOUT_MS, deadlineSignal, [], jsonBody, options);
    sourceSucceeded(sourceId);
    const streams = payload ? toStreams(payload).filter(Boolean).slice(0, MAX_STREAMS_PER_SOURCE) : [];
    report[sourceId] = `ok ${streams.length}`;
    return streams;
  } catch (error) {
    if (isProviderTimeout(error, deadlineSignal)) {
      sourceFailed(sourceId);
      report[sourceId] = 'timeout';
    } else if (deadlineSignal?.aborted) {
      sourceDeadlineCancelled(sourceId);
      report[sourceId] = 'timeout';
    } else {
      sourceFailed(sourceId);
      report[sourceId] = /HTTP (\d{3})/.test(error?.message || '') ? `http ${error.message.match(/HTTP (\d{3})/)[1]}` : 'network error';
    }
    return [];
  }
}

function fetchYts(type, id, fetchImpl, deadlineSignal, report) {
  if (type !== 'movie') return Promise.resolve([]);
  const imdb = id.split(':')[0];
  const url = `https://movies-api.accel.li/api/v2/list_movies.json?query_term=${encodeURIComponent(imdb)}&limit=5`;
  return fetchIndexer('yts', url, fetchImpl, deadlineSignal, report, (payload) => {
    const movies = Array.isArray(payload?.data?.movies) ? payload.data.movies : [];
    return movies.filter((movie) => String(movie?.imdb_code).toLowerCase() === imdb)
      .flatMap((movie) => (Array.isArray(movie.torrents) ? movie.torrents : []).map((torrent) => {
        const quality = cleanText(torrent?.quality, 12);
        const kind = cleanText(torrent?.type, 12);
        const codec = cleanText(torrent?.video_codec, 12);
        const release = [cleanText(movie.title, 200), movie.year ? `(${Number(movie.year)})` : '', quality, kind, codec, 'YTS']
          .filter(Boolean).join(' ');
        return indexerStream('YTS', {
          hash: torrent?.hash,
          label: [quality, kind && kind.toUpperCase() === 'BLURAY' ? 'BluRay' : kind].filter(Boolean).join(' '),
          release,
          seeders: torrent?.seeds,
          sizeBytes: torrent?.size_bytes,
        });
      }));
  });
}

function pirateBayStream(item, extra = {}) {
  const release = cleanText(item.name, 200);
  return indexerStream('TPB', {
    hash: item.info_hash,
    label: releaseLabel(release),
    release,
    seeders: item.seeders,
    sizeBytes: item.size,
    ...extra,
  });
}

const playablePirateBayItem = (item) => /^2\d\d$/.test(String(item?.category)) && Number(item?.seeders) > 0;
const bySeeders = (a, b) => Number(b.seeders) - Number(a.seeders);

async function fetchPirateBay(type, id, fetchImpl, deadlineSignal, report, metaPromise) {
  const [imdb, season, episode] = id.split(':');
  const byImdb = (item) => String(item?.imdb).toLowerCase() === imdb;
  if (type === 'movie') {
    // `imdb` is the uploader's tag; it is the whole match, so require it exactly.
    return fetchIndexer('tpb', `https://apibay.org/q.php?q=${encodeURIComponent(imdb)}&cat=0`, fetchImpl, deadlineSignal, report,
      (payload) => (Array.isArray(payload) ? payload : []).filter(byImdb).filter(playablePirateBayItem)
        .sort(bySeeders).map((item) => pirateBayStream(item)));
  }

  // Series: the IMDb tag mostly lands on season packs, and single episodes are
  // usually untagged, so search "<title> S01E01" as well. Packs are offered
  // with the episode pattern so the player opens the right file inside them.
  const isEpisode = episodeMatcher(season, episode);
  const isSeasonPack = seasonPackMatcher(season);
  const filePattern = episodeFilePattern(season, episode);
  const tagged = fetchIndexer('tpb', `https://apibay.org/q.php?q=${encodeURIComponent(imdb)}&cat=0`, fetchImpl, deadlineSignal, report,
    (payload) => (Array.isArray(payload) ? payload : []).filter(byImdb).filter(playablePirateBayItem));
  const titled = metaPromise.then((expected) => {
    if (!expected) return [];
    const tag = `S${String(Number(season)).padStart(2, '0')}E${String(Number(episode)).padStart(2, '0')}`;
    const show = normalizeMatchTitle(expected.title);
    return fetchIndexer('tpb-search', `https://apibay.org/q.php?q=${encodeURIComponent(`${expected.title} ${tag}`)}&cat=0`, fetchImpl, deadlineSignal, report,
      (payload) => (Array.isArray(payload) ? payload : []).filter(playablePirateBayItem)
        // An untagged hit must start with the show's name, so "The Office"
        // does not collect "The Office Party" or another country's version.
        .filter((item) => byImdb(item) || showTitleMatches(cleanText(item?.name, 200).replace(/[._]/g, ' '), show)));
  });
  const items = [...await tagged, ...await titled];
  const seenHashes = new Set();
  const episodes = [];
  const packs = [];
  for (const item of items.sort(bySeeders)) {
    const hash = String(item?.info_hash).toLowerCase();
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);
    const name = String(item?.name);
    if (isEpisode.test(name)) episodes.push(pirateBayStream(item));
    else if (isSeasonPack.test(name)) packs.push(pirateBayStream(item, { fileMustInclude: [filePattern] }));
  }
  const streams = [...episodes, ...packs].filter(Boolean).slice(0, MAX_STREAMS_PER_SOURCE);
  report.tpb = report.tpb?.startsWith('ok') || report['tpb-search']?.startsWith('ok') ? `ok ${streams.length}` : (report.tpb || 'failed');
  delete report['tpb-search'];
  return streams;
}

// EZTV keys shows by IMDb number, but its mapping is unreliable (the Breaking
// Bad id returns a different show), so a result must also carry the Cinemeta
// title, optionally followed by a year or country tag ("The Office US").
function showTitleMatches(releaseTitle, expectedTitle) {
  const title = String(releaseTitle).replace(/[._]/g, ' ');
  const show = normalizeMatchTitle(title.split(/\s(?:S\d{1,3}[ ._-]?E\d{1,4}|\d{1,3}x\d{1,4})\b/i)[0]);
  const expected = normalizeMatchTitle(expectedTitle);
  if (!show || !expected) return false;
  if (show === expected) return true;
  const rest = show.startsWith(`${expected} `) ? show.slice(expected.length + 1) : null;
  return rest !== null && /^(?:(?:19|20)\d\d|us|uk|au|nz|ca)$/.test(rest);
}

async function fetchEztv(type, id, fetchImpl, deadlineSignal, report, metaPromise) {
  if (type !== 'series') return [];
  const [imdb, season, episode] = id.split(':');
  const url = `https://eztvx.to/api/get-torrents?imdb_id=${encodeURIComponent(imdb.slice(2))}&limit=100`;
  // Fetch alongside Cinemeta rather than after it; the title check runs once both are in.
  const [expected, candidates] = await Promise.all([
    metaPromise,
    fetchIndexer('eztv', url, fetchImpl, deadlineSignal, report, (payload) => (Array.isArray(payload?.torrents) ? payload.torrents : [])
      .filter((torrent) => Number(torrent?.season) === Number(season) && Number(torrent?.episode) === Number(episode))),
  ]);
  if (!candidates.length) return [];
  if (!expected) { report.eztv = 'skipped (no title to check)'; return []; }
  const streams = candidates
    .filter((torrent) => showTitleMatches(torrent?.title, expected.title))
    .map((torrent) => {
      const release = cleanText(torrent.title, 200);
      const filename = cleanText(torrent.filename, 255);
      return indexerStream('EZTV', {
        hash: torrent.hash,
        label: releaseLabel(`${release} ${filename}`),
        release,
        seeders: torrent.seeds,
        sizeBytes: torrent.size_bytes,
        filename,
      });
    })
    .filter(Boolean);
  report.eztv = `ok ${streams.length}`;
  return streams;
}

// --- Knaben -----------------------------------------------------------------
// A meta-search over ~30 trackers (TPB, 1337x, RARBG mirrors, Nyaa, YTS...).
// It searches by title, so every hit is checked against the Cinemeta title
// (and year, for films) before it is offered.
function movieTitleMatches(releaseTitle, title, year) {
  const release = normalizeMatchTitle(String(releaseTitle).replace(/[._]/g, ' '));
  const expected = normalizeMatchTitle(title);
  if (!release || !expected || !year || !release.startsWith(`${expected} `)) return false;
  return new RegExp(`(?:^| )${Number(year)}(?: |$)`).test(release.slice(expected.length));
}

const KNABEN_VIDEO_CATEGORY = (ids) => Array.isArray(ids) && ids.some((id) => id >= 2000000 && id < 4000000);

async function fetchKnaben(type, id, fetchImpl, deadlineSignal, report, metaPromise) {
  const [, season, episode] = id.split(':');
  const expected = await metaPromise;
  if (!expected) { report.knaben = 'skipped (no title)'; return []; }
  const tag = type === 'series'
    ? `S${String(Number(season)).padStart(2, '0')}E${String(Number(episode)).padStart(2, '0')}`
    : String(expected.year);
  const isEpisode = type === 'series' ? episodeMatcher(season, episode) : null;
  const body = {
    search_type: '100%',
    search_field: 'title',
    query: `${expected.title} ${tag}`,
    order_by: 'seeders',
    order_direction: 'desc',
    size: 50,
    hide_unsafe: true,
    hide_xxx: true,
  };
  return fetchIndexer('knaben', 'https://api.knaben.org/v1', fetchImpl, deadlineSignal, report, (payload) =>
    (Array.isArray(payload?.hits) ? payload.hits : [])
      .filter((hit) => typeof hit?.hash === 'string' && Number(hit.seeders) > 0 && KNABEN_VIDEO_CATEGORY(hit.categoryId))
      .filter((hit) => (type === 'series'
        ? isEpisode.test(String(hit.title)) && showTitleMatches(cleanText(hit.title, 200).replace(/[._]/g, ' '), expected.title)
        : movieTitleMatches(hit.title, expected.title, expected.year)))
      .map((hit) => {
        const release = cleanText(hit.title, 200);
        const tracker = cleanText(hit.tracker, 40);
        return indexerStream('Knaben', {
          hash: hit.hash,
          label: releaseLabel(release),
          release,
          tracker,
          seeders: hit.seeders,
          sizeBytes: hit.bytes,
        });
      }), body);
}

// --- TorBox (optional, owner's own account) --------------------------------
// With TORBOX_API_KEY set as a Worker secret, every torrent result is checked
// against TorBox's cache. Cached ones are offered first as HTTPS links to this
// Worker's /play route, which adds the torrent to the account, picks the file
// and answers with a 302 to TorBox's CDN. The key never appears in a stream
// URL or response, and no media passes through the Worker.
// --- Anime: Kitsu titles and Nyaa ---------------------------------------------
// Kitsu's record for an anime id: English and romaji titles, start year and
// season. Cached like Cinemeta (positive answers, 6 h), so the title hop is
// paid once per show rather than on every episode.
const kitsuCache = new Map();

async function fetchKitsuMeta(kitsuId, fetchImpl, deadlineSignal, report = {}) {
  const cached = kitsuCache.get(kitsuId);
  if (cached && cached.expiresAt > Date.now()) { report.kitsu = 'cache hit'; return { ...cached.value }; }
  if (cached) kitsuCache.delete(kitsuId);
  if (!sourceAllowed('kitsu')) { report.kitsu = 'paused'; return null; }
  try {
    const payload = await fetchBoundedJson(`https://kitsu.app/api/edge/anime/${encodeURIComponent(kitsuId)}`, fetchImpl,
      OPEN_MEDIA_MAX_BYTES, OPEN_MEDIA_TIMEOUT_MS, deadlineSignal, [], null, { accept: 'application/vnd.api+json' });
    sourceSucceeded('kitsu');
    const attributes = payload?.data?.attributes;
    const names = attributes?.titles && typeof attributes.titles === 'object' ? attributes.titles : {};
    const english = cleanText(names.en || names.en_us, 200);
    const romaji = cleanText(names.en_jp || attributes?.canonicalTitle, 200);
    const titles = [...new Set([english, romaji, cleanText(attributes?.canonicalTitle, 200)].filter(Boolean))];
    if (!titles.length) { report.kitsu = 'no title'; return null; }
    const year = Number(String(attributes.startDate || '').slice(0, 4));
    const value = {
      title: english || titles[0],
      romaji: romaji || titles[0],
      titles,
      year: Number.isInteger(year) && year >= 1900 ? year : null,
      season: seasonOf(romaji || titles[0]),
      anime: true,
    };
    if (kitsuCache.size >= CINEMETA_CACHE_MAX_ENTRIES) kitsuCache.delete(kitsuCache.keys().next().value);
    kitsuCache.set(kitsuId, { value: { ...value }, expiresAt: Date.now() + CINEMETA_CACHE_TTL_MS });
    report.kitsu = 'ok';
    return value;
  } catch (error) {
    const providerTimeout = isProviderTimeout(error, deadlineSignal);
    if (!providerTimeout && deadlineSignal?.aborted) sourceDeadlineCancelled('kitsu');
    else sourceFailed('kitsu');
    report.kitsu = providerTimeout || deadlineSignal?.aborted ? 'timeout' : 'network error';
    return null;
  }
}

// Nyaa, the main anime tracker, through its RSS feed (English-translated,
// sorted by seeders). Both searches start together as soon as the title is
// known: the romaji title, which most fansub groups use, and the English title
// with (dub|dual|multi), which is how dub releases are named. A hit must carry
// the title, the requested season and the episode, or be a batch spanning it.
// Releases numbered absolutely (" - 105" for S2E5) are not matched: Kitsu
// does not give the offset, so they are left out rather than guessed.
function nyaaUrl(query) {
  return `https://nyaa.si/?page=rss&q=${encodeURIComponent(query)}&c=1_2&f=0&s=seeders&o=desc`;
}

async function fetchNyaa(type, id, fetchImpl, deadlineSignal, report, metaPromise, audio) {
  const meta = await metaPromise;
  if (!meta?.anime || deadlineSignal?.aborted) return [];
  const kitsu = parseKitsuId(id);
  const [, seasonText, episodeText] = id.split(':');
  const episode = kitsu ? kitsu.episode : (type === 'series' ? Number(episodeText) : null);
  const season = kitsu ? meta.season || 1 : (type === 'series' ? Number(seasonText) : 1);
  const titles = meta.titles || [meta.title];
  const token = episode === null ? '' : ` ${String(episode).padStart(2, '0')}`;
  const toItems = (xml) => parseNyaaRss(typeof xml === 'string' ? xml : '').filter((item) => item.seeders > 0 && !item.remake);
  const options = { accept: 'application/rss+xml, application/xml;q=0.9', text: true };
  const searches = [fetchIndexer('nyaa', nyaaUrl(`${meta.romaji || meta.title}${token}`), fetchImpl, deadlineSignal, report, toItems, null, options)];
  if (audio !== 'sub') {
    searches.push(fetchIndexer('nyaa-dub', nyaaUrl(`${meta.title}${token} (dub|dual|multi)`), fetchImpl, deadlineSignal, report, toItems, null, options));
  }
  const items = (await Promise.all(searches)).flat().sort((a, b) => b.seeders - a.seeders);
  const seen = new Set();
  const episodes = [];
  const packs = [];
  for (const item of items) {
    if (seen.has(item.hash)) continue;
    seen.add(item.hash);
    const release = cleanText(item.title, 200);
    const kind = classifyAnimeRelease(release, { titles, season, episode });
    if (!kind) continue;
    const stream = indexerStream('Nyaa', {
      hash: item.hash,
      label: releaseLabel(release),
      release,
      seeders: item.seeders,
      sizeBytes: item.sizeBytes,
      tracker: item.trusted ? 'Trusted' : '',
      ...(kind === 'pack' ? { fileMustInclude: [animeEpisodeFilePattern(episode)] } : {}),
    });
    (kind === 'pack' ? packs : episodes).push(stream);
  }
  const streams = [...episodes, ...packs].filter(Boolean).slice(0, MAX_STREAMS_PER_SOURCE);
  const ok = report.nyaa?.startsWith('ok') || report['nyaa-dub']?.startsWith('ok');
  report.nyaa = ok ? `ok ${streams.length}` : (report.nyaa || report['nyaa-dub'] || 'failed');
  delete report['nyaa-dub'];
  return streams;
}

const TORBOX_API = 'https://api.torbox.app/v1/api';
const TORBOX_KEY_RE = /^[A-Za-z0-9-]{20,100}$/;
const TORBOX_CHECK_TIMEOUT_MS = 3000;
const TORBOX_PLAY_TIMEOUT_MS = 8000;
const TORBOX_MAX_BYTES = 1024 * 1024;
const VIDEO_FILE_RE = /\.(?:mkv|mp4|m4v|avi|webm|mov|ts|m2ts|wmv)$/i;
// Account-scoped, isolate-local caches. Replacing the whole object on key
// rotation also prevents an older in-flight add from populating the new account.
const emptyTorboxCache = () => ({ key: null, ids: new Map(), pending: new Map() });
let torboxCache = emptyTorboxCache();

function torboxIdCache(key) {
  if (torboxCache.key !== key) {
    // Only a real key rotation clears breaker state. The first play after boot
    // must not erase a cache-check breaker a concurrent lookup just opened.
    const rotating = torboxCache.key !== null && torboxCache.key !== key;
    torboxCache = { key, ids: new Map(), pending: new Map() };
    if (rotating) {
      sourceHealth.delete('torbox');
      sourceHealth.delete('torbox-play');
    }
  }
  return torboxCache;
}

/** Ensure an account-scoped torrent id, coalescing adds and bounding joined retries. */
async function ensureTorboxTorrent(hash, key, fetchImpl, signal, logEvent = null) {
  const cache = torboxIdCache(key);
  // A shared add has its own bounded lifetime. One viewer timing out must not
  // abort the add for every other viewer; each viewer only bounds its own wait.
  // A joined viewer whose deadline is still live may replace an aborted shared
  // add once. Re-checking pending on every attempt keeps that replacement
  // single-flight too, and non-abort failures (for example ACTIVE_LIMIT) are
  // still reported to all current waiters without an immediate retry storm.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal?.aborted) throw abortError(signal);
    if (cache.ids.has(hash)) return { id: cache.ids.get(hash), cached: true };
    let pending = cache.pending.get(hash);
    const joined = Boolean(pending);
    if (!pending) {
      const operationSignal = AbortSignal.timeout(TORBOX_PLAY_TIMEOUT_MS);
      const startedAt = Date.now();
      pending = (async () => {
        try {
          const created = await torboxRequest('/torrents/createtorrent', key, fetchImpl, operationSignal, {
            method: 'POST',
            form: { magnet: `magnet:?xt=urn:btih:${hash}`, seed: '3', allow_zip: 'false' },
          });
          const id = Number(created?.torrent_id ?? created?.id);
          if (!Number.isSafeInteger(id) || id <= 0) throw Object.assign(new Error('no torrent id'), { torbox: 'NO_TORRENT_ID' });
          if (cache.ids.size >= 200) cache.ids.delete(cache.ids.keys().next().value);
          cache.ids.set(hash, id);
          emitLog(logEvent, 'core_streams_torbox_add', { outcome: 'success', ms: Date.now() - startedAt });
          return id;
        } catch (error) {
          emitLog(logEvent, 'core_streams_torbox_add', {
            outcome: error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'error',
            ms: Date.now() - startedAt,
          });
          throw error;
        }
      })();
      const clear = () => { if (cache.pending.get(hash) === pending) cache.pending.delete(hash); };
      // Handle settlement even if every viewer has already stopped waiting.
      pending.then(clear, clear);
      cache.pending.set(hash, pending);
    }
    try {
      return { id: await awaitWithSignal(pending, signal), cached: false };
    } catch (error) {
      const sharedAbort = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      if (joined && attempt === 0 && sharedAbort && !signal?.aborted) {
        if (cache.pending.get(hash) === pending) cache.pending.delete(hash);
        continue;
      }
      throw error;
    }
  }
  throw Object.assign(new Error('TorBox add retry exhausted'), { torbox: 'ADD_RETRY_EXHAUSTED' });
}

/** Return a syntactically valid operator-owned TorBox key, or null. */
function torboxKey(env) {
  const key = env && env.TORBOX_API_KEY;
  return typeof key === 'string' && TORBOX_KEY_RE.test(key.trim()) ? key.trim() : null;
}

/** Call a fixed TorBox API path with the secret kept server-side and a bounded body. */
async function torboxRequest(path, key, fetchImpl, signal, { method = 'GET', query = {}, form = null } = {}) {
  const url = new URL(`${TORBOX_API}${path}`);
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, String(value));
  }
  let body;
  if (form) {
    body = new FormData();
    for (const [name, value] of Object.entries(form)) body.append(name, String(value));
  }
  const response = await fetchImpl(url.href, {
    method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
    body,
    redirect: 'manual',
    signal,
  });
  if (!response) throw new Error('TorBox returned no response');
  const buffer = await readBounded(response, TORBOX_MAX_BYTES);
  let payload = null;
  if (buffer) { try { payload = JSON.parse(new TextDecoder().decode(buffer)); } catch { payload = null; } }
  if (response.status < 200 || response.status >= 300 || !payload || payload.success === false) {
    const code = cleanText(payload?.error, 40) || `HTTP ${response.status}`;
    const error = new Error(code);
    error.torbox = code;
    error.httpStatus = response.status;
    throw error;
  }
  return payload.data;
}

// Which video inside a torrent to play: the requested episode for a series
// (a single-video torrent counts), the largest video for a film. Samples and
// extras are never picked.
/** Pick the requested episode or largest film video, never samples/extras. */
function chooseVideoFile(files, selector) {
  const videos = (Array.isArray(files) ? files : [])
    .filter((file) => file && typeof file === 'object')
    .map((file) => ({ ...file, path: String(file.name || file.short_name || '') }))
    .filter((file) => VIDEO_FILE_RE.test(file.path) && !/(?:^|[\/ ._-])(?:sample|trailer|extras?|featurettes?)(?:[\/ ._-]|$)/i.test(file.path));
  if (!videos.length) return null;
  const bySize = (a, b) => Number(b.size || 0) - Number(a.size || 0);
  if (selector.kind === 'episode' || selector.kind === 'anime') {
    // Anime files are usually "Show - 05.mkv"; a first-season IMDb episode
    // also accepts that naming, since anime packs rarely say "S01E05".
    const anime = (file) => animeEpisodeRe(selector.episode).test(file.path.split('/').pop());
    const matchers = selector.kind === 'anime'
      ? [anime]
      : [(file) => new RegExp(episodeFilePattern(selector.season, selector.episode)).test(file.path), ...(selector.season === 1 ? [anime] : [])];
    for (const match of matchers) {
      const hits = videos.filter(match).sort(bySize);
      if (hits.length) return hits[0];
    }
    return videos.length === 1 ? videos[0] : null;
  }
  return videos.sort(bySize)[0];
}

/** Build the public play selector for a movie or series episode. */
function playSelector(type, id) {
  const kitsu = parseKitsuId(id);
  if (kitsu) return kitsu.episode === null ? 'movie' : `ep${kitsu.episode}`;
  const [, season, episode] = id.split(':');
  return type === 'series' ? `${Number(season)}x${Number(episode)}` : 'movie';
}

/** Parse the public play selector into a movie or season/episode target. */
function parsePlaySelector(value) {
  if (value === 'movie') return { kind: 'movie' };
  const anime = /^ep(\d{1,4})$/.exec(value || '');
  if (anime) return { kind: 'anime', episode: Number(anime[1]) };
  const match = /^(\d{1,3})x(\d{1,4})$/.exec(value || '');
  return match ? { kind: 'episode', season: Number(match[1]), episode: Number(match[2]) } : null;
}

/** Ask TorBox which hashes are cached; failures fall back to P2P results. */
async function torboxCachedHashes(hashes, key, fetchImpl, report) {
  if (!hashes.length) return new Map();
  if (!sourceAllowed('torbox')) { report.torbox = 'paused'; return new Map(); }
  try {
    const data = await torboxRequest('/torrents/checkcached', key, fetchImpl, AbortSignal.timeout(TORBOX_CHECK_TIMEOUT_MS), {
      query: { hash: hashes.join(','), format: 'list', list_files: 'true' },
    });
    sourceSucceeded('torbox');
    const entries = Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data) : []);
    const cached = new Map();
    for (const entry of entries) {
      const hash = typeof entry?.hash === 'string' ? entry.hash.toLowerCase() : '';
      if (INFO_HASH_RE.test(hash)) cached.set(hash, entry);
    }
    report.torbox = `cached ${cached.size}`;
    return cached;
  } catch (error) {
    sourceFailed('torbox');
    report.torbox = error?.name === 'TimeoutError' ? 'timeout' : (error?.torbox ? `error ${error.torbox}` : 'network error');
    return new Map();
  }
}

// Swap cached torrents for TorBox HTTPS streams and put them first. The P2P
// copy of a cached torrent is dropped: the TorBox one plays the same file faster.
/** Promote cached torrents to token-bearing TorBox play URLs, keeping P2P fallbacks. */
async function applyTorbox(streams, { key, origin, token, type, id, fetchImpl, report, context = {} }) {
  const playHealth = sourceHealth.get('torbox-play');
  if (playHealth && playHealth.openUntil > Date.now()) {
    report.torbox = 'paused';
    return streams;
  }
  const hashes = [...new Set(streams.filter((stream) => stream.infoHash).map((stream) => stream.infoHash))].slice(0, 100);
  const cached = await torboxCachedHashes(hashes, key, fetchImpl, report);
  if (!cached.size) return streams;
  const selector = playSelector(type, id);
  const parsedSelector = parsePlaySelector(selector);
  const instant = [];
  const rest = [];
  const offered = new Set();
  for (const stream of streams) {
    if (!stream.infoHash || !cached.has(stream.infoHash)) { rest.push(stream); continue; }
    if (offered.has(stream.infoHash)) continue;
    const file = chooseVideoFile(cached.get(stream.infoHash).files, parsedSelector);
    // A cached pack without the requested episode can't play it; keep the P2P entry.
    if (Array.isArray(cached.get(stream.infoHash).files) && cached.get(stream.infoHash).files.length && !file) { rest.push(stream); continue; }
    offered.add(stream.infoHash);
    const [source, label] = String(stream.name).split(' · ');
    const filename = file ? cleanText(String(file.path).split('/').pop(), 255) : '';
    const size = Number(file?.size);
    instant.push(setStreamFacts({
      url: `${origin}/core-streams/${token}/play/${stream.infoHash}/${selector}`,
      name: `TorBox ⚡ · ${label || source}`,
      ...(stream.title ? { title: `${stream.title}\nCached on TorBox · via ${source}` } : {}),
      ...(stream.description ? { description: `${stream.description}\nCached on TorBox · via ${source}` } : {}),
      behaviorHints: {
        bingeGroup: `core-streams|torbox|${label || 'video'}`,
        ...(filename ? { filename } : {}),
        ...(Number.isSafeInteger(size) && size > 0 ? { videoSize: size } : {}),
        // Stremio's web player only handles MP4/WebM natively.
        ...(!/\.(?:mp4|webm)$/i.test(filename) ? { notWebReady: true } : {}),
      },
    }, { ...getStreamFacts(stream), cached: true, pack: false, ...(filename ? { filename } : {}) }));
  }
  instant.sort((a, b) => rankScore(b, context) - rankScore(a, context));
  return [...instant, ...rest];
}

/** Extract a bounded Cloudflare client IP hint for TorBox CDN selection. */
function clientIp(request) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  return /^[0-9a-f.:]{3,45}$/i.test(ip) ? ip : '';
}

/** Resolve a TorBox play request to a per-viewer CDN redirect, or a safe error. */
async function handleTorboxPlay(request, env, route, headers, fetchImpl, logEvent = null) {
  const startedAt = Date.now();
  const finish = (response, outcome) => {
    emitLog(logEvent, 'core_streams_play', { status: response.status, outcome, ms: Date.now() - startedAt });
    return response;
  };
  const key = torboxKey(env);
  if (!key) return finish(jsonResponse(404, { error: 'TorBox is not configured' }, headers), 'not_configured');
  const selector = parsePlaySelector(route.selector);
  if (!INFO_HASH_RE.test(route.hash) || !selector) return finish(jsonResponse(404, { error: 'not found' }, headers), 'not_found');
  const hash = route.hash.toLowerCase();
  const cache = torboxIdCache(key);
  if (!sourceAllowed('torbox-play')) {
    return finish(jsonResponse(503, { error: 'TorBox is temporarily unavailable' }, { ...headers, 'Retry-After': '30' }), 'paused');
  }
  const signal = AbortSignal.timeout(TORBOX_PLAY_TIMEOUT_MS);
  let torrentId;
  try {
    let torrent;
    // A torrent can be removed from the account after its id was cached. Only
    // retry a stale cached id, once; a fresh add that fails is reported as-is.
    for (let attempt = 0; attempt < 2; attempt++) {
      const ensured = await ensureTorboxTorrent(hash, key, fetchImpl, signal, logEvent);
      torrentId = ensured.id;
      try {
        torrent = await torboxRequest('/torrents/mylist', key, fetchImpl, signal, {
          query: { id: torrentId, bypass_cache: 'true' },
        });
        break;
      } catch (error) {
        if (error?.torbox !== 'ITEM_NOT_FOUND' || !ensured.cached || attempt === 1) throw error;
        if (cache.ids.get(hash) === torrentId) cache.ids.delete(hash);
      }
    }
    const file = chooseVideoFile(torrent?.files, selector);
    if (!file || !Number.isSafeInteger(Number(file.id)) || Number(file.id) < 0) {
      sourceSucceeded('torbox-play');
      return finish(jsonResponse(404, { error: torrent?.download_present === false ? 'TorBox is still preparing this torrent; try again shortly' : 'no matching video file in this torrent' }, headers), 'no_file');
    }
    const link = await torboxRequest('/torrents/requestdl', key, fetchImpl, signal, {
      query: { token: key, torrent_id: torrentId, file_id: Number(file.id), redirect: 'false', user_ip: clientIp(request) },
    });
    const location = normalizeHttpsUrl(typeof link === 'string' ? link : '');
    if (!location) throw Object.assign(new Error('bad link'), { torbox: 'BAD_LINK' });
    sourceSucceeded('torbox-play');
    return finish(new Response(null, { status: 302, headers: { ...headers, Location: location, 'Cache-Control': 'no-store' } }), 'success');
  } catch (error) {
    if (error?.torbox === 'ITEM_NOT_FOUND' && cache.ids.get(hash) === torrentId) cache.ids.delete(hash);
    if (torboxPlayOutage(error)) sourceFailed('torbox-play');
    else sourceDeadlineCancelled('torbox-play');
    const status = error?.name === 'TimeoutError' ? 504 : 502;
    return finish(jsonResponse(status, { error: `TorBox: ${error?.torbox || (status === 504 ? 'timed out' : 'unavailable')}` }, headers), status === 504 ? 'timeout' : 'error');
  }
}

/** Return the stream-only Stremio manifest for the private install token. */
function manifest() {
  return {
    id: 'uk.corebuilds.core-streams',
    version: '0.14.0',
    name: 'Core Streams',
    description: 'Quality-ranked streams with clean file details and fast repeat lookups: torrent add-ons and public indexes (YTS, The Pirate Bay, EZTV, Knaben, Nyaa for anime with dubs first), instant TorBox playback when configured, open media, and configurable sources.',
    resources: ['stream'],
    types: ['movie', 'series', 'anime'],
    catalogs: [],
    idPrefixes: ['tt', 'kitsu'],
  };
}

/**
 * Handle the private Core Streams Stremio protocol routes.
 * `rateLimit` is supplied by the parent Worker so the addon shares its existing
 * RL_PROXY_CUSTOM bucket. `headers` contains the Worker security/CORS headers.
 */
export async function handleCoreStreams(request, env, { headers = {}, rateLimit = async () => true, fetchImpl = fetch, logEvent = null } = {}) {
  const requestUrl = new URL(request.url);
  const route = parseRequestPath(requestUrl.pathname);
  // Players may probe a stream URL with HEAD before playing it.
  const allowedMethod = request.method === 'GET' || (request.method === 'HEAD' && route?.kind === 'play');
  if (!allowedMethod) return jsonResponse(405, { error: 'method not allowed' }, headers);
  if (!route) return jsonResponse(404, { error: 'not found' }, headers);

  const expectedToken = env && env.CORE_STREAMS_INSTALL_TOKEN;
  if (typeof expectedToken !== 'string' || !INSTALL_TOKEN_RE.test(expectedToken)) {
    return jsonResponse(503, { error: 'Core Streams is not configured' }, headers);
  }
  if (!INSTALL_TOKEN_RE.test(route.token) || !constantTimeEqual(route.token, expectedToken)) {
    return jsonResponse(404, { error: 'not found' }, headers);
  }

  if (route.kind === 'manifest') {
    return jsonResponse(200, manifest(), headers);
  }

  if (route.kind === 'play') {
    if (!(await rateLimit())) return jsonResponse(429, { error: 'rate limit exceeded' }, headers);
    return handleTorboxPlay(request, env, route, headers, fetchImpl, logEvent);
  }

  if (!validMediaRequest(route.type, route.id)) {
    return jsonResponse(200, { streams: [] }, headers);
  }

  if (!(await rateLimit())) return jsonResponse(429, { streams: [], error: 'rate limit exceeded' }, headers);

  const normalizedId = route.id.toLowerCase();
  const kitsu = parseKitsuId(normalizedId);
  const audio = ['dub', 'sub', 'any'].includes(env.CORE_STREAMS_ANIME_AUDIO) ? env.CORE_STREAMS_ANIME_AUDIO : 'dub';
  const torbox = torboxKey(env);
  const httpBase = configuredAddonBase(env.CORE_STREAMS_HTTP_SOURCE_MANIFEST);
  const maxPerResolution = envInteger(env.CORE_STREAMS_MAX_PER_RESOLUTION, 0, 0, MAX_STREAMS_TOTAL);
  const cacheSeconds = envInteger(env.CORE_STREAMS_CACHE_SECONDS, RESPONSE_CACHE_DEFAULT_SECONDS, 0, 300);
  // Hash every input that can change the answer or the account a play URL
  // belongs to. Raw tokens/keys/source URLs never become cache keys.
  const cacheKey = await responseCacheKey([
    'core-streams/0.14.0', requestUrl.origin, route.token, route.type, normalizedId,
    torbox || '', httpBase || '', maxPerResolution, audio,
  ]);
  const lookupStartedAt = Date.now();
  const { value, cache } = await responseCache.run(cacheKey, async () => {
    const track = (sourceId, promise) => {
      const startedAt = Date.now();
      return Promise.resolve(promise).then((result) => {
        emitLog(logEvent, 'core_streams_source', { source: sourceId, outcome: sourceOutcome(report[sourceId]), ms: Date.now() - startedAt });
        return result;
      }, (error) => {
        emitLog(logEvent, 'core_streams_source', { source: sourceId, outcome: 'error', ms: Date.now() - startedAt });
        throw error;
      });
    };
    // Kitsu ids go to the add-ons that understand them (Torrentio, TorrentsDB,
    // a configured add-on) and to Nyaa; the IMDb-keyed indexes and open media
    // have nothing to look up.
    const sources = SOURCES.filter((source) => (!source.types || source.types.includes(route.type))
      && !(kitsu && source.id === 'public-domain-movies'));
    if (httpBase && !sources.some((source) => source.base === httpBase)) {
      sources.push({ id: 'http-source', name: 'HTTP source', base: httpBase });
    }
    // Explicitly bound the header-wait fan-out to Cloudflare's six-connection
    // relaxed limit. Body reads remain bounded separately by each adapter.
    const limitedFetch = createHeaderLimiter(fetchImpl);
    const imdb = normalizedId.split(':')[0];
    const deadlineSignal = AbortSignal.timeout(REQUEST_DEADLINE_MS);
    const report = {};
    const metaPromise = kitsu
      ? track('kitsu', fetchKitsuMeta(kitsu.kitsuId, limitedFetch, deadlineSignal, report))
      : track('cinemeta', fetchCinemetaTitleYear(route.type, imdb, limitedFetch, deadlineSignal, report));
    const imdbIndexes = kitsu ? [] : [
      track('yts', fetchYts(route.type, normalizedId, limitedFetch, deadlineSignal, report)),
      track('tpb', fetchPirateBay(route.type, normalizedId, limitedFetch, deadlineSignal, report, metaPromise)),
      track('eztv', fetchEztv(route.type, normalizedId, limitedFetch, deadlineSignal, report, metaPromise)),
      track('knaben', fetchKnaben(route.type, normalizedId, limitedFetch, deadlineSignal, report, metaPromise)),
      track('open-media', fetchOpenMedia(route.type, normalizedId, limitedFetch, deadlineSignal, metaPromise).then((streams) => {
        if (route.type === 'movie') report['open-media'] = `ok ${streams.length}`;
        return streams;
      })),
    ];
    const responses = await Promise.all([
      ...sources.map((source) => track(source.id, fetchSource(source, route.type, normalizedId, limitedFetch, report, deadlineSignal))),
      ...imdbIndexes,
      track('nyaa', fetchNyaa(route.type, normalizedId, limitedFetch, deadlineSignal, report, metaPromise, audio)),
    ]);
    const meta = await metaPromise;
    const [, seasonText, episodeText] = normalizedId.split(':');
    const context = {
      anime: Boolean(meta?.anime),
      audio,
      season: kitsu ? meta?.season || 1 : (route.type === 'series' ? Number(seasonText) : null),
      episode: kitsu ? kitsu.episode : (route.type === 'series' ? Number(episodeText) : null),
    };
    // Rank within each provider, then interleave providers before de-duplicating.
    // This stops an early high-volume source from consuming the result cap and
    // hiding every later provider or the curated open-media matches.
    const seen = new Set();
    // A torrent with no file selection folds into a selected copy of itself;
    // different selections inside one torrent stay distinct.
    const bareAt = new Map(); // info hash -> index of its selection-less result
    const selectedHashes = new Set(); // info hashes that already have a selection
    const unique = [];
    for (const stream of interleaveStreamGroups(responses)) {
      const key = dedupeKey(stream);
      if (seen.has(key)) continue;
      seen.add(key);
      if (stream.infoHash) {
        if (stream.fileIdx === undefined && !stream.fileMustInclude) {
          if (selectedHashes.has(stream.infoHash) || bareAt.has(stream.infoHash)) continue;
          bareAt.set(stream.infoHash, unique.length);
        } else {
          selectedHashes.add(stream.infoHash);
          if (bareAt.has(stream.infoHash)) {
            const at = bareAt.get(stream.infoHash);
            bareAt.delete(stream.infoHash);
            unique[at] = stream;
            continue;
          }
        }
      }
      unique.push(stream);
    }
    const episodeRequest = route.type !== 'movie' && Number.isInteger(context.season) && Number.isInteger(context.episode)
      ? { season: context.season, episode: context.episode, entryNumbering: Boolean(kitsu) }
      : null;
    const showTitle = meta?.title || '';
    // Global quality pass after the fair interleaving/dedupe pass. Scores are
    // memoized per object, so sorting does not re-parse release text.
    const sorted = episodeRequest
      ? rankEpisodes(dropJunk(unique), episodeRequest, context, showTitle)
      : dropJunk(unique)
        .map((stream, index) => ({ stream, index, score: rankScore(stream, context) }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(({ stream }) => stream);
    // Curated open media is the only HTTPS path for some players; reserve its
    // slots before the general quality pool is truncated.
    const open = sorted.filter(isOpenMedia);
    const pool = [
      ...sorted.filter((stream) => !isOpenMedia(stream)).slice(0, MAX_STREAMS_TOTAL + 40 - open.length),
      ...open,
    ];
    const promoted = torbox
      ? await track('torbox', applyTorbox(pool, {
        key: torbox, origin: requestUrl.origin, token: route.token, type: route.type, id: normalizedId, fetchImpl: limitedFetch, report, context,
      }))
      : pool;
    // TorBox picked the episode file in each cached torrent: re-rank so a
    // cached exact copy and its new delivery score take their place.
    const ranked = episodeRequest && promoted !== pool ? rankEpisodes(promoted, episodeRequest, context, showTitle) : promoted;
    const capped = limitPerResolution(ranked, maxPerResolution);
    // Quality decides order, but the final 80 still keeps a best-effort seat
    // for every provider that returned something. Without this, a global sort
    // can let one high-volume 2160p source erase every independent fallback.
    const openStreams = capped.filter(isOpenMedia);
    const general = capped.filter((stream) => !isOpenMedia(stream));
    const seats = new Map();
    for (const stream of general) {
      const source = String(stream.name || '').split(' · ')[0];
      if (!seats.has(source)) seats.set(source, stream);
    }
    const room = Math.max(0, MAX_STREAMS_TOTAL - openStreams.length);
    const selected = general.slice(0, room);
    const selectedSet = new Set(selected);
    for (const seat of seats.values()) {
      if (selectedSet.has(seat) || room === 0) continue;
      if (selected.length < room) { selected.push(seat); selectedSet.add(seat); continue; }
      // Replace the lowest-ranked surplus result, not the head of the list.
      for (let i = selected.length - 1; i >= 0; i--) {
        const source = String(selected[i].name || '').split(' · ')[0];
        if (selected.filter((stream) => String(stream.name || '').split(' · ')[0] === source).length > 1) {
          selectedSet.delete(selected[i]);
          selected[i] = seat;
          selectedSet.add(seat);
          break;
        }
      }
    }
    // Cards are built last, from the final list, so ranking and provider seats
    // above still read each provider's own name.
    const finalStreams = [...openStreams, ...selected].slice(0, MAX_STREAMS_TOTAL)
      .map((stream) => formatStream(stream, { inferHeight: inferredHeight, inferSeeders: inferredSeeders }));
    const sourceStatus = Object.entries(report).map(([id, status]) => `${id}=${status}`).join('; ');
    const partial = Object.values(report).some((status) => !/^(?:ok|cached|skipped|cache hit)/.test(status));
    return { streams: finalStreams, sources: sourceStatus, partial };
  }, cacheSeconds);
  emitLog(logEvent, 'core_streams_lookup', {
    cache, scope: route.type, count: value.streams.length, partial: value.partial ? 1 : 0, ms: Date.now() - lookupStartedAt,
  });
  return jsonResponse(200, { streams: value.streams }, {
    ...headers, 'X-Core-Streams-Sources': value.sources, 'X-Core-Streams-Cache': cache,
  });
}

export const _coreStreamsTest = {
  rankEpisodes,
  streamFacts: getStreamFacts,
  setStreamFacts,
  formatStream: (stream) => formatStream(stream, { inferHeight: inferredHeight, inferSeeders: inferredSeeders }),
  parseRelease: (text) => parseRelease(text, inferredHeight),
  indexerStream,
  rankScore,
  classifyAnimeRelease,
  resetKitsuCache: () => kitsuCache.clear(),
  chooseVideoFile,
  movieTitleMatches,
  parsePlaySelector,
  resetTorboxIds: () => { torboxCache = emptyTorboxCache(); },
  ensureTorboxTorrent,
  fetchSource,
  fetchOpenMedia,
  resetCinemetaCache: () => cinemetaCache.clear(),
  resetResponseCache: () => responseCache.clear(),
  responseCacheStats: () => responseCache.stats(),
  dropJunk,
  limitPerResolution,
  fetchCinemetaTitleYear,
  episodeMatcher,
  seasonPackMatcher,
  episodeFilePattern,
  showTitleMatches,
  archiveMediaStreams,
  configuredAddonBase,
  locFilmStreams,
  declaredOpenLicense,
  normalizeMatchTitle,
  normalizeStream,
  inferredHeight,
  inferredSeeders,
  smartStreamScore,
  interleaveStreamGroups,
  fetchBoundedJson,
  fetchInternetArchiveFromMeta,
  fetchBlenderOpenMovie,
  parseRequestPath,
  resetSourceHealth: () => sourceHealth.clear(),
  validMediaRequest,
};
