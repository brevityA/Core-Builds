// Isolate-local helpers for Core Streams. Nothing here touches the shared
// Cloudflare Cache API: stream lists can contain token-bearing play URLs and
// account-specific TorBox availability, so they must not become CDN cache keys
// or shared cached responses. The cache is small, short-lived and best-effort.

export const RESPONSE_CACHE_MAX_ENTRIES = 64;
export const RESPONSE_CACHE_MAX_BYTES = 4 * 1024 * 1024;
export const RESPONSE_CACHE_DEFAULT_SECONDS = 90;
export const RESPONSE_CACHE_PARTIAL_SECONDS = 15;
export const SOURCE_HEADER_CONCURRENCY = 6;

export function envInteger(value, fallback, minimum, maximum) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
}

// SHA-256 keeps install tokens, TorBox keys and configured source URLs out of
// cache keys. The inputs are length-prefixed JSON, so concatenation is unambiguous.
export async function responseCacheKey(parts) {
  const bytes = new TextEncoder().encode(JSON.stringify(parts));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createResponseCache({
  maxEntries = RESPONSE_CACHE_MAX_ENTRIES,
  maxBytes = RESPONSE_CACHE_MAX_BYTES,
  now = Date.now,
} = {}) {
  const entries = new Map();
  const pending = new Map();
  let bytes = 0;

  const remove = (key) => {
    const entry = entries.get(key);
    if (entry) { bytes -= entry.bytes; entries.delete(key); }
  };
  const trim = () => {
    while (entries.size > maxEntries || bytes > maxBytes) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      remove(oldest);
    }
  };
  const get = (key) => {
    const entry = entries.get(key);
    if (!entry) return null;
    if (entry.expires <= now()) { remove(key); return null; }
    // Refresh LRU position without extending the TTL.
    entries.delete(key);
    entries.set(key, entry);
    return entry.value;
  };
  const set = (key, value, ttlSeconds) => {
    if (!value || !Array.isArray(value.streams) || !value.streams.length || ttlSeconds <= 0) return false;
    const size = JSON.stringify(value).length * 2; // UTF-16 upper bound for this JSON payload.
    if (size > maxBytes) return false;
    remove(key);
    entries.set(key, { value, bytes: size, expires: now() + ttlSeconds * 1000 });
    bytes += size;
    trim();
    return true;
  };

  // Single-flight is useful even when caching is disabled: two simultaneous
  // requests for the same episode should not double every provider call.
  const run = async (key, load, ttlSeconds = 0) => {
    const cached = ttlSeconds > 0 ? get(key) : null;
    if (cached) return { value: cached, cache: 'hit' };
    if (pending.has(key)) return { value: await pending.get(key), cache: 'coalesced' };
    const promise = (async () => load())();
    pending.set(key, promise);
    try {
      const value = await promise;
      if (ttlSeconds > 0 && value?.streams?.length) {
        const ttl = value.partial ? Math.min(ttlSeconds, RESPONSE_CACHE_PARTIAL_SECONDS) : ttlSeconds;
        set(key, value, ttl);
      }
      return { value, cache: ttlSeconds > 0 ? 'miss' : 'bypass' };
    } finally {
      if (pending.get(key) === promise) pending.delete(key);
    }
  };

  return {
    run,
    get,
    set,
    clear() { entries.clear(); pending.clear(); bytes = 0; },
    stats() { return { entries: entries.size, bytes, pending: pending.size }; },
  };
}

export function abortError(signal) {
  return signal?.reason || Object.assign(new Error('operation aborted'), { name: 'AbortError' });
}

// Await a shared operation without letting one caller's signal cancel it. The
// caller still stops waiting at its own deadline; the operation keeps its own
// bounded lifetime and can be joined by other callers.
export function awaitWithSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError(signal));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
      (error) => { signal.removeEventListener('abort', onAbort); reject(error); },
    );
  });
}

// Cloudflare allows six outgoing connections per invocation while waiting for
// response headers. Queue explicitly instead of letting the runtime reorder a
// larger fan-out implicitly. A slot is released as soon as headers arrive; the
// bounded body reader still applies afterwards.
export function createHeaderLimiter(fetchImpl, limit = SOURCE_HEADER_CONCURRENCY) {
  let active = 0;
  const queue = [];
  const abortReason = (signal) => signal?.reason
    || Object.assign(new Error('header wait aborted'), { name: 'AbortError' });
  const pump = () => {
    while (active < limit && queue.length) {
      const next = queue.shift();
      next.signal?.removeEventListener('abort', next.onAbort);
      if (next.signal?.aborted) {
        next.reject(abortReason(next.signal));
        continue;
      }
      active++;
      next.resolve();
    }
  };
  return async (...args) => {
    const signal = args[1]?.signal;
    if (signal?.aborted) throw abortReason(signal);
    if (active >= limit) {
      await new Promise((resolve, reject) => {
        const entry = { resolve, reject, signal, onAbort: null };
        entry.onAbort = () => {
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          reject(abortReason(signal));
        };
        signal?.addEventListener('abort', entry.onAbort, { once: true });
        queue.push(entry);
      });
    } else {
      active++;
    }
    try {
      return await fetchImpl(...args);
    } finally {
      active--;
      pump();
    }
  };
}
