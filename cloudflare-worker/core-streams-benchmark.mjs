import { isIP } from 'node:net';
import { performance } from 'node:perf_hooks';

export const BENCHMARK_CASES = Object.freeze([
  { type: 'movie', id: 'tt0133093', title: 'The Matrix', group: 'popular' },
  { type: 'movie', id: 'tt0111161', title: 'The Shawshank Redemption', group: 'popular' },
  { type: 'movie', id: 'tt0468569', title: 'The Dark Knight', group: 'popular' },
  { type: 'movie', id: 'tt1254207', title: 'Big Buck Bunny', group: 'open-media' },
  { type: 'movie', id: 'tt1727587', title: 'Sintel', group: 'open-media' },
  { type: 'movie', id: 'tt0205480', title: 'A Trip Down Market Street Before the Fire', group: 'open-media' },
  { type: 'series', id: 'tt0903747:1:1', title: 'Breaking Bad S01E01', group: 'episode' },
  { type: 'series', id: 'tt0944947:1:1', title: 'Game of Thrones S01E01', group: 'episode' },
]);

const MAX_JSON_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_DELAY_MS = 1_000;

export function readManifestUrl(raw, variableName) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(`${variableName} is not set`);
  }
  if (raw.trim().length > 8192) throw new Error(`${variableName} is too long`);
  let url;
  try { url = new URL(raw.trim()); } catch {
    throw new Error(`${variableName} is not a valid URL`);
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const reservedSuffixes = ['.localhost', '.local', '.internal', '.test', '.example', '.invalid', '.onion', '.arpa'];
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || isIP(hostname)
    || !hostname.includes('.') || reservedSuffixes.some((suffix) => hostname.endsWith(suffix))
    || ['localhost', 'example.com', 'example.net', 'example.org'].includes(hostname)) {
    throw new Error(`${variableName} must use a public HTTPS host without userinfo or an IP literal`);
  }
  if (!url.pathname.endsWith('/manifest.json')) {
    throw new Error(`${variableName} must point to a Stremio manifest.json`);
  }
  return url;
}

export function streamRequestUrl(manifestUrl, media) {
  const url = new URL(manifestUrl.href || manifestUrl);
  url.pathname = `${url.pathname.slice(0, -'manifest.json'.length)}stream/${media.type}/${encodeURIComponent(media.id)}.json`;
  return url;
}

export function resolutionHint(stream) {
  const text = [stream?.name, stream?.title, stream?.description, stream?.behaviorHints?.filename]
    .filter((part) => typeof part === 'string').join(' ').toLowerCase();
  const match = text.match(/(?:^|\D)(4320|2160|1440|1080|900|720|576|540|480|360|240)p(?:\D|$)/);
  if (match) return Number(match[1]);
  if (/\b(?:4k|uhd)\b/.test(text) || /\b3840\s*x\s*2160\b/.test(text)) return 2160;
  if (/\b2560\s*x\s*1440\b/.test(text)) return 1440;
  if (/\b1920\s*x\s*1080\b/.test(text)) return 1080;
  if (/\b1280\s*x\s*720\b/.test(text)) return 720;
  return null;
}

function advertisedType(stream) {
  if (typeof stream?.infoHash === 'string') return 'torrent';
  if (typeof stream?.ytId === 'string') return 'youtube';
  if (typeof stream?.url === 'string' && /^https:\/\//i.test(stream.url)) return 'direct';
  return 'other';
}

function hasSeederHint(stream) {
  const text = [stream?.name, stream?.title, stream?.description]
    .filter((part) => typeof part === 'string').join(' ');
  return /(?:👤\s*\d+|\b\d+\s*seeders?\b|\bseeders?\s*[:=]?\s*\d+)/i.test(text);
}

export function summarizeStreams(streams) {
  const resultCount = streams.length;
  const topFive = streams.slice(0, 5);
  const resolutions = streams.map(resolutionHint).filter(Number.isInteger);
  const first1080pIndex = streams.findIndex((stream) => (resolutionHint(stream) || 0) >= 1080);
  const types = { direct: 0, torrent: 0, youtube: 0, other: 0 };
  for (const stream of streams) types[advertisedType(stream)]++;
  return {
    resultCount,
    topFiveCount: topFive.length,
    topFive1080pHints: topFive.filter((stream) => (resolutionHint(stream) || 0) >= 1080).length,
    first1080pPosition: first1080pIndex < 0 ? null : first1080pIndex + 1,
    resolutionHintCount: resolutions.length,
    maxAdvertisedResolution: resolutions.length ? Math.max(...resolutions) : null,
    seedHintCount: streams.filter(hasSeederHint).length,
    types,
  };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeProvider(providerName, rows) {
  const attempted = rows.filter((row) => row.status !== 'unsupported');
  const successful = rows.filter((row) => row.status === 200);
  const withResults = successful.filter((row) => row.metrics.resultCount > 0);
  return {
    provider: providerName,
    cases: rows.length,
    attempted: attempted.length,
    http200: successful.length,
    nonEmpty: withResults.length,
    coveragePct: attempted.length ? Math.round((withResults.length / attempted.length) * 1000) / 10 : null,
    medianLatencyMs: median(successful.map((row) => row.latencyMs)),
    medianResultCount: median(successful.map((row) => row.metrics.resultCount)),
    topFive1080pHintCases: successful.filter((row) => row.metrics.topFive1080pHints > 0).length,
    cases: rows,
  };
}

async function readJsonBounded(response) {
  if (!response.body) return null;
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) throw new Error('response_too_large');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BYTES) {
        await reader.cancel().catch(() => {});
        throw new Error('response_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try { return JSON.parse(new TextDecoder().decode(joined)); } catch {
    throw new Error('invalid_json');
  }
}

export async function fetchManifest(manifestUrl, fetchImpl = fetch) {
  const response = await fetchImpl(manifestUrl, {
    method: 'GET', redirect: 'manual', headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status !== 200) {
    try { await response.body?.cancel(); } catch {}
    throw new Error(`manifest_http_${response.status}`);
  }
  const manifest = await readJsonBounded(response);
  if (!manifest || !Array.isArray(manifest.resources) || !manifest.resources.includes('stream')
    || !Array.isArray(manifest.types)) {
    throw new Error('invalid_stream_manifest');
  }
  return manifest;
}

export async function queryCase(manifestUrl, manifest, media, fetchImpl = fetch) {
  if (!manifest.types.includes(media.type)) return { status: 'unsupported', latencyMs: null, metrics: null };
  const started = performance.now();
  try {
    const response = await fetchImpl(streamRequestUrl(manifestUrl, media), {
      method: 'GET', redirect: 'manual', headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const latencyMs = Math.round(performance.now() - started);
    if (response.status !== 200) {
      try { await response.body?.cancel(); } catch {}
      return { status: response.status, latencyMs, metrics: null };
    }
    const payload = await readJsonBounded(response);
    const streams = Array.isArray(payload?.streams) ? payload.streams.filter((stream) => stream && typeof stream === 'object') : [];
    return { status: 200, latencyMs, metrics: summarizeStreams(streams) };
  } catch (error) {
    // Deliberately omit error.message: fetch exceptions can include the full
    // manifest URL, which may contain a private install token.
    return { status: error?.message === 'invalid_json' ? 'invalid_json'
      : error?.message === 'response_too_large' ? 'response_too_large'
        : error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'network_error',
    latencyMs: Math.round(performance.now() - started), metrics: null };
  }
}

function safeManifestError(error) {
  const code = error?.message;
  if (/^manifest_http_\d{3}$/.test(code || '')
    || ['invalid_json', 'response_too_large', 'invalid_stream_manifest'].includes(code)) return code;
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout';
  return 'network_error';
}

export async function runBenchmark(providers, cases = BENCHMARK_CASES, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const delayMs = Math.max(0, options.delayMs ?? DEFAULT_DELAY_MS);
  const providerManifests = await Promise.all(providers.map(async (provider) => {
    try {
      return { ...provider, manifest: await fetchManifest(provider.manifestUrl, fetchImpl), manifestError: null };
    } catch (error) {
      // Fetch exceptions can include the complete URL, including install tokens.
      return { ...provider, manifest: null, manifestError: safeManifestError(error) };
    }
  }));
  const rowsByProvider = new Map(providerManifests.map((provider) => [provider.name, []]));
  for (let index = 0; index < cases.length; index++) {
    const media = cases[index];
    await Promise.all(providerManifests.map(async (provider) => {
      const row = provider.manifest
        ? await queryCase(provider.manifestUrl, provider.manifest, media, fetchImpl)
        : { status: 'manifest_error', latencyMs: null, metrics: null };
      rowsByProvider.get(provider.name).push({ ...media, ...row });
    }));
    if (delayMs && index < cases.length - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return {
    limitations: [
      'Resolution, seed, and stream-type values are inferred from addon output and are not verified.',
      'This measures stream-list responses only; it does not attempt media playback or establish rights.',
      'A failed or empty response may reflect provider outages, catalogue gaps, or title/ID matching differences.',
    ],
    summaries: providerManifests.map((provider) => summarizeProvider(provider.name, rowsByProvider.get(provider.name))),
    manifestErrors: providerManifests.filter((provider) => provider.manifestError)
      .map((provider) => ({ provider: provider.name, error: provider.manifestError })),
  };
}
