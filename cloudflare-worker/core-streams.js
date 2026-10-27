// Core Streams: a small Stremio-compatible stream aggregator running on the
// existing Cloudflare Worker. It uses fixed add-on endpoints and narrowly
// allowlisted open-media APIs; it never scrapes arbitrary URLs or relays media.

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
const OPEN_MEDIA_TIMEOUT_MS = 4000;
const OPEN_MEDIA_MAX_BYTES = 768 * 1024;
const SOURCE_FAILURE_THRESHOLD = 3;
const SOURCE_BREAKER_COOLDOWN_MS = 30_000;
const sourceHealth = new Map(); // fixed provider IDs only; isolate-local best-effort breaker
const INSTALL_TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
const ID_RE = /^tt\d{6,12}(?::\d{1,3}:\d{1,3})?$/i;
const INFO_HASH_RE = /^[a-f0-9]{40}$/i;
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const RESERVED_HOST_RE = /(^|\.)(localhost|local|internal|intranet|home|lan|corp|arpa|test|invalid|example|onion)$/i;

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

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

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
  if (!/^\/(?:[A-Za-z0-9._~-]+\/)*manifest\.json$/.test(path)) return null;
  return parsed.origin + path.slice(0, -'/manifest.json'.length);
}

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
  return null;
}

function validMediaRequest(type, id) {
  if (!['movie', 'series'].includes(type) || typeof id !== 'string' || !ID_RE.test(id)) return false;
  const [imdb, season, episode] = id.split(':');
  if (!/^tt\d{6,12}$/i.test(imdb)) return false;
  if (type === 'movie') return season === undefined;
  return season !== undefined && Number(season) <= 999 && Number(episode) >= 1 && Number(episode) <= 999;
}

function sourceRequestUrl(base, type, id) {
  return `${base}/stream/${type}/${encodeURIComponent(id)}.json`;
}

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

function cleanText(value, maxLength, multiline = false) {
  if (typeof value !== 'string') return '';
  const normalized = multiline
    ? value.replace(/\r\n?|\u2028|\u2029/g, '\n').replace(/\t/g, ' ').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    : value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ');
  return normalized.trim().slice(0, maxLength);
}

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
      normalized.sources = stream.sources.slice(0, 20)
        .filter(isSafeTorrentSource);
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
  return normalized;
}

function dedupeKey(stream) {
  if (stream.infoHash) return `hash:${stream.infoHash}:${stream.fileIdx ?? ''}`;
  if (stream.ytId) return `youtube:${stream.ytId}`;
  return `url:${stream.url}`;
}

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

function inferredSeeders(stream) {
  const text = [stream?.name, stream?.title, stream?.description]
    .filter((part) => typeof part === 'string').join(' ');
  const matches = [...text.matchAll(/(?:seeders?|seeds?|👤)\s*[:=]?\s*(\d{1,6})/gi)];
  return matches.reduce((maximum, match) => Math.max(maximum, Number(match[1])), 0);
}

// Use only information already present in Stremio's stream card. This is a
// ranking heuristic, not a claim that a mislabeled resolution or seeder count
// has been independently verified. Preserve unknown-quality results as fallbacks.
function smartStreamScore(stream) {
  const text = [stream?.name, stream?.title, stream?.description, stream?.behaviorHints?.filename]
    .filter((part) => typeof part === 'string').join(' ').toLowerCase();
  let score = inferredHeight(stream) / 10;
  score += Math.min(inferredSeeders(stream), 500) / 20;
  if (typeof stream?.url === 'string') score += 12;
  if (typeof stream?.ytId === 'string') score += 8;
  if (/\b(?:bluray|blu-ray|web[ .-]?dl)\b/.test(text)) score += 5;
  if (/\b(?:cam|hdcam|hdts|telesync|telecine|screener)\b/.test(text)) score -= 150;
  return score;
}

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

function getSourceHealth(sourceId) {
  let state = sourceHealth.get(sourceId);
  if (!state) {
    state = { failures: 0, openUntil: 0, probeInFlight: false };
    sourceHealth.set(sourceId, state);
  }
  return state;
}

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

function sourceSucceeded(sourceId) {
  sourceHealth.set(sourceId, { failures: 0, openUntil: 0, probeInFlight: false });
}

function sourceFailed(sourceId) {
  const state = getSourceHealth(sourceId);
  state.probeInFlight = false;
  state.failures += 1;
  if (state.failures >= SOURCE_FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + SOURCE_BREAKER_COOLDOWN_MS;
  }
}

function sourceDeadlineCancelled(sourceId) {
  // The request-wide budget expired; this says nothing about source health.
  // Release a half-open probe without changing its failure count or cooldown.
  getSourceHealth(sourceId).probeInFlight = false;
}

function cancelBody(response) {
  try {
    const pending = response?.body?.cancel();
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  } catch { /* best-effort disposal */ }
}

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
  const match = path.match(/^\/licenses\/(by|by-sa)\/(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { url: url.href, label: match[1] === 'by-sa' ? `CC BY-SA ${match[2]}` : `CC BY ${match[2]}` };
}

async function fetchBoundedJson(url, fetchImpl, maxBytes = OPEN_MEDIA_MAX_BYTES, timeoutMs = OPEN_MEDIA_TIMEOUT_MS, deadlineSignal = null) {
  const requestSignal = AbortSignal.timeout(timeoutMs);
  const signal = deadlineSignal ? AbortSignal.any([requestSignal, deadlineSignal]) : requestSignal;
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    redirect: 'manual',
    signal,
  });
  if (!response) throw new Error('Open-media request returned no response');
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
  if (!buffer) throw new Error('Open-media response could not be read within size limit');
  try { return JSON.parse(new TextDecoder().decode(buffer)); } catch {
    throw new Error('Open-media response was not valid JSON');
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
  const yearValue = Number(meta.year || String(meta.released || '').slice(0, 4));
  const year = Number.isInteger(yearValue) && yearValue >= 1880 && yearValue <= 2200 ? yearValue : null;
  return title && year ? { title, year } : null;
}

async function fetchInternetArchiveFromMeta(id, expected, fetchImpl, deadlineSignal) {
  if (!sourceAllowed('internet-archive')) return [];
  try {
    const searchUrl = new URL('https://archive.org/advancedsearch.php');
    const escapedTitle = expected.title.replace(/([\\"])/g, '\\$1');
    searchUrl.searchParams.set('q', `mediatype:movies AND title:"${escapedTitle}"`);
    searchUrl.searchParams.append('fl[]', 'identifier');
    searchUrl.searchParams.append('fl[]', 'title');
    searchUrl.searchParams.set('rows', '6');
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
    const candidates = docs.slice(0, 2)
      .filter((doc) => doc && typeof doc.identifier === 'string'
        && /^[A-Za-z0-9][A-Za-z0-9_.-]{1,99}$/.test(doc.identifier)
        && typeof doc.title === 'string'
        && normalizeMatchTitle(doc.title) === normalizeMatchTitle(expected.title));
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
  } catch {
    if (deadlineSignal?.aborted) sourceDeadlineCancelled('internet-archive');
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
  } catch {
    if (deadlineSignal?.aborted) sourceDeadlineCancelled('blender-open-movies');
    else sourceFailed('blender-open-movies');
    return [];
  }
}

async function fetchOpenMedia(type, id, fetchImpl) {
  if (type !== 'movie') return [];
  const deadlineSignal = AbortSignal.timeout(SOURCE_TIMEOUT_MS);
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

  let expected = null;
  if (sourceAllowed('cinemeta')) {
    try {
      const metaPayload = await fetchBoundedJson(
        `https://v3-cinemeta.strem.io/meta/movie/${encodeURIComponent(imdb)}.json`,
        fetchImpl, OPEN_MEDIA_MAX_BYTES, OPEN_MEDIA_TIMEOUT_MS, deadlineSignal,
      );
      // A missing item or a valid but metadata-free response is not an upstream
      // outage. Transport, HTTP, body-size, and JSON errors throw above instead.
      sourceSucceeded('cinemeta');
      expected = cinemetaTitleYear(metaPayload);
    } catch {
      sourceFailed('cinemeta');
    }
  }

  const blenderStreams = await blenderPromise;
  if (!expected) return [...locStreams, ...blenderStreams];
  const archiveStreams = await fetchInternetArchiveFromMeta(imdb, expected, fetchImpl, deadlineSignal);
  return [...locStreams, ...archiveStreams, ...blenderStreams];
}

async function fetchSource(source, type, id, fetchImpl) {
  if (!sourceAllowed(source.id)) return [];
  const url = sourceRequestUrl(source.base, type, id);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    });
    if (!response || response.status < 200 || response.status >= 300) {
      cancelBody(response);
      sourceFailed(source.id);
      return [];
    }
    const contentLength = Number(response.headers && response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_RESPONSE_BYTES) {
      cancelBody(response);
      sourceFailed(source.id);
      return [];
    }
    const buffer = await readBounded(response, MAX_SOURCE_RESPONSE_BYTES);
    if (!buffer) {
      sourceFailed(source.id);
      return [];
    }
    let payload;
    try { payload = JSON.parse(new TextDecoder().decode(buffer)); } catch {
      sourceFailed(source.id);
      return [];
    }
    if (!payload || !Array.isArray(payload.streams)) {
      sourceFailed(source.id);
      return [];
    }
    sourceSucceeded(source.id);
    return payload.streams.slice(0, MAX_STREAMS_PER_SOURCE)
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
  } catch {
    // Providers are independent: one outage or timeout must not erase results
    // returned by the other configured providers. An isolate-local breaker also
    // stops repeatedly waiting on a provider that has failed three times.
    sourceFailed(source.id);
    return [];
  }
}

function manifest() {
  return {
    id: 'uk.corebuilds.core-streams',
    version: '0.8.0',
    name: 'Core Streams',
    description: 'Quality-ranked stream fallback with curated torrents, open media, and configurable sources.',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: [],
    idPrefixes: ['tt'],
  };
}

/**
 * Handle the private Core Streams Stremio protocol routes.
 * `rateLimit` is supplied by the parent Worker so the addon shares its existing
 * RL_PROXY_CUSTOM bucket. `headers` contains the Worker security/CORS headers.
 */
export async function handleCoreStreams(request, env, { headers = {}, rateLimit = async () => true, fetchImpl = fetch } = {}) {
  if (request.method !== 'GET') return jsonResponse(405, { error: 'method not allowed' }, headers);
  const route = parseRequestPath(new URL(request.url).pathname);
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

  if (!validMediaRequest(route.type, route.id)) {
    return jsonResponse(200, { streams: [] }, headers);
  }

  if (!(await rateLimit())) return jsonResponse(429, { streams: [], error: 'rate limit exceeded' }, headers);

  const sources = SOURCES.filter((source) => !source.types || source.types.includes(route.type));
  const httpBase = configuredAddonBase(env.CORE_STREAMS_HTTP_SOURCE_MANIFEST);
  if (httpBase && !sources.some((source) => source.base === httpBase)) {
    sources.push({ id: 'http-source', name: 'HTTP source', base: httpBase });
  }

  const normalizedId = route.id.toLowerCase();
  const responses = await Promise.all([
    ...sources.map((source) => fetchSource(source, route.type, normalizedId, fetchImpl)),
    fetchOpenMedia(route.type, normalizedId, fetchImpl),
  ]);
  // Rank within each provider, then interleave providers before de-duplicating.
  // This stops an early high-volume source from consuming the result cap and
  // hiding every later provider or the curated open-media matches.
  const seen = new Set();
  const streams = [];
  for (const stream of interleaveStreamGroups(responses)) {
    const key = dedupeKey(stream);
    if (seen.has(key)) continue;
    seen.add(key);
    streams.push(stream);
    if (streams.length >= MAX_STREAMS_TOTAL) break;
  }
  return jsonResponse(200, { streams }, headers);
}

export const _coreStreamsTest = {
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
