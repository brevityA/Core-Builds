'use strict';

/*
 * Core Builds AIOStreams Proxy
 *
 * Fetches only the AIOStreams stream-result JSON route through the existing
 * Core Builds Cloudflare Worker. The worker's narrow AIOStreams path policy
 * remains in force; the worker is not used as a general-purpose URL or media
 * proxy. Playback URLs are returned to Nuvio and fetched directly by its player.
 */

var PROVIDER_NAME = 'Core Builds AIOStreams';
var WORKER_BASE = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev';
var WORKER_TIMEOUT_MS = 8000;
var MAX_STREAMS = 100;
var MAX_SUBTITLES = 20;

function getSettings() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.SCRAPER_SETTINGS) {
      return globalThis.SCRAPER_SETTINGS;
    }
  } catch (_error) {
    // Missing settings means this provider has not been configured yet.
  }
  return {};
}

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  var result = value.trim();
  if (maxLength && result.length > maxLength) result = result.slice(0, maxLength);
  return result;
}

function getManifestBase(manifestUrl) {
  var input = cleanString(manifestUrl, 4096);
  if (!input || typeof URL !== 'function') return '';

  var parsed;
  try { parsed = new URL(input); } catch (_error) { return ''; }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return '';

  var path = parsed.pathname.replace(/\/+$/, '');
  if (path.endsWith('/manifest.json')) path = path.slice(0, -'/manifest.json'.length);
  if (!/^\/stremio\/[^/]+\/[^/]+$/.test(path)) return '';

  return parsed.origin + path;
}

function normalizeId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  var id = String(value).trim();
  if (/^\d{1,16}$/.test(id)) return 'tmdb:' + id;
  if (/^tmdb:\d{1,16}$/i.test(id)) return 'tmdb:' + id.slice(id.indexOf(':') + 1);
  if (/^tt\d{6,12}$/i.test(id)) return id;
  return '';
}

function normalizeType(value) {
  var type = cleanString(String(value || ''), 16).toLowerCase();
  if (type === 'movie') return 'movie';
  if (type === 'tv' || type === 'series') return 'series';
  return '';
}

function toInteger(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Math.floor(value) === value ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function buildStreamPath(id, type, season, episode) {
  if (type === 'movie') return '/stream/movie/' + encodeURIComponent(id) + '.json';
  return '/stream/series/' + encodeURIComponent(id + ':' + season + ':' + episode) + '.json';
}

function fetchWorker(url, options) {
  var timeoutFetch = null;
  try {
    // Nuvio injects this helper into provider scope; globalThis keeps local tests
    // and other compatible runtimes straightforward.
    if (typeof fetchWithTimeout === 'function') timeoutFetch = fetchWithTimeout;
    else if (typeof globalThis !== 'undefined' && typeof globalThis.fetchWithTimeout === 'function') {
      timeoutFetch = globalThis.fetchWithTimeout;
    }
  } catch (_error) {
    timeoutFetch = null;
  }

  if (timeoutFetch) return timeoutFetch(url, options, WORKER_TIMEOUT_MS);
  if (typeof fetch !== 'function') return Promise.reject(new Error('fetch is unavailable'));
  return fetch(url, options);
}

function isHttpsUrl(value) {
  var url = cleanString(value, 8192);
  return /^https:\/\/[^\s]+$/i.test(url) && !/[\u0000-\u001f\\]/.test(url);
}

function cleanHeaders(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  var output = {};
  Object.keys(value).slice(0, 30).forEach(function (key) {
    var name = cleanString(key, 80);
    var headerValue = cleanString(value[key], 2048);
    if (/^[A-Za-z0-9-]+$/.test(name) && headerValue) output[name] = headerValue;
  });
  return Object.keys(output).length ? output : null;
}

function cleanSubtitles(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_SUBTITLES).reduce(function (result, subtitle) {
    if (!subtitle || typeof subtitle !== 'object' || !isHttpsUrl(subtitle.url)) return result;
    var item = {
      url: cleanString(subtitle.url, 8192),
      language: cleanString(subtitle.lang || subtitle.language, 16) || 'und',
      name: cleanString(subtitle.label || subtitle.name, 80) || 'Subtitle'
    };
    var headers = cleanHeaders(subtitle.headers);
    if (headers) item.headers = headers;
    result.push(item);
    return result;
  }, []);
}

function toNuvioStream(source) {
  if (!source || typeof source !== 'object' || !isHttpsUrl(source.url)) return null;

  var stream = {
    name: cleanString(source.name, 80) || PROVIDER_NAME,
    title: cleanString(source.title, 500) || cleanString(source.name, 80) || 'AIOStreams result',
    url: cleanString(source.url, 8192)
  };

  var quality = cleanString(source.quality, 32);
  if (quality) stream.quality = quality;

  var size = typeof source.size === 'number' ? source.size : Number(source.size);
  if (Number.isFinite(size) && size > 0) stream.size = size;

  var requestHeaders = source.behaviorHints && source.behaviorHints.proxyHeaders
    ? source.behaviorHints.proxyHeaders.request
    : null;
  var headers = cleanHeaders(requestHeaders) || cleanHeaders(source.headers);
  if (headers) stream.headers = headers;

  var subtitles = cleanSubtitles(source.subtitles);
  if (subtitles.length) stream.subtitles = subtitles;

  return stream;
}

function getStreams(tmdbId, mediaType, season, episode) {
  var settings = getSettings();
  var manifestBase = getManifestBase(settings.manifestUrl);
  var id = normalizeId(tmdbId);
  var type = normalizeType(mediaType);
  var seasonNumber = toInteger(season);
  var episodeNumber = toInteger(episode);

  if (!manifestBase || !id || !type) return Promise.resolve([]);
  if (type === 'series' && (seasonNumber === null || seasonNumber < 0 || episodeNumber === null || episodeNumber < 1)) {
    return Promise.resolve([]);
  }

  var path = buildStreamPath(id, type, seasonNumber, episodeNumber);
  var url = WORKER_BASE + '/proxy' + path + '?host=' + encodeURIComponent(manifestBase);
  var options = { method: 'GET', headers: { Accept: 'application/json' } };

  return Promise.resolve()
    .then(function () { return fetchWorker(url, options); })
    .then(function (response) {
      if (!response || response.ok !== true || typeof response.json !== 'function') return null;
      return response.json();
    })
    .then(function (payload) {
      if (!payload || !Array.isArray(payload.streams)) return [];
      return payload.streams
        .slice(0, MAX_STREAMS)
        .map(toNuvioStream)
        .filter(Boolean);
    })
    .catch(function () {
      // An unavailable worker/upstream must not break Nuvio's other providers.
      return [];
    });
}

function onSettings() {
  return Promise.resolve([
    { type: 'header', label: 'AIOStreams connection' },
    {
      type: 'info',
      label: 'This provider requests AIOStreams stream-result JSON through the Core Builds Cloudflare Worker. Nuvio then plays the returned HTTPS links directly.'
    },
    {
      type: 'text',
      key: 'manifestUrl',
      label: 'AIOStreams manifest URL',
      placeholder: 'https://aiostreams.example.com/stremio/UUID/PASSWORD/manifest.json',
      description: 'Paste the full HTTPS manifest URL from your AIOStreams config.',
      isPassword: true
    },
    {
      type: 'info',
      label: 'The manifest URL contains your AIOStreams access path. It is sent to the Core Builds Worker as the scoped upstream host; do not share it.'
    }
  ]);
}

module.exports = { getStreams: getStreams, onSettings: onSettings };
