// Isolate-local helpers for Core Streams. Nothing here touches the shared
// Cloudflare Cache API: stream lists can contain token-bearing play URLs and
// account-specific TorBox availability, so they must not become CDN cache keys
// or shared cached responses. The cache is small, short-lived and best-effort.

export const RESPONSE_CACHE_MAX_ENTRIES = 64;
export const RESPONSE_CACHE_MAX_BYTES = 4 * 1024 * 1024;
export const RESPONSE_CACHE_DEFAULT_SECONDS = 90;
export const RESPONSE_CACHE_PARTIAL_SECONDS = 15;
export const SOURCE_HEADER_CONCURRENCY = 6;

/** Parse a bounded integer Worker variable, falling back for absent/invalid input. */
export function envInteger(value, fallback, minimum, maximum) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
}

/**
 * Build a credential-safe cache key. JSON array encoding separates inputs
 * unambiguously; SHA-256 keeps tokens, keys and source URLs out of the key.
 */
export async function responseCacheKey(parts) {
  const bytes = new TextEncoder().encode(JSON.stringify(parts));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a bounded isolate-local LRU response cache with single-flight loading.
 * `run` returns hit/coalesced/miss/bypass; partial responses use a shorter TTL.
 * Nothing is written to the shared Cloudflare Cache API.
 */
export function createResponseCache({
  maxEntries = RESPONSE_CACHE_MAX_ENTRIES,
  maxBytes = RESPONSE_CACHE_MAX_BYTES,
  now = Date.now,
} = {}) {
  const entries = new Map();
  const pending = new Map();
  let bytes = 0;
  let coalesced = 0; // requests that joined an in-flight load (diagnostics/tests)

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
    if (pending.has(key)) {
      coalesced++;
      return { value: await pending.get(key), cache: 'coalesced' };
    }
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
    clear() { entries.clear(); pending.clear(); bytes = 0; coalesced = 0; },
    stats() { return { entries: entries.size, bytes, pending: pending.size, coalesced }; },
  };
}

/** Return the signal's abort reason, or a generic AbortError when absent. */
export function abortError(signal) {
  return signal?.reason || Object.assign(new Error('operation aborted'), { name: 'AbortError' });
}

/**
 * Await a shared operation without letting one caller's signal cancel it.
 * The caller still stops waiting at its own deadline; the operation keeps its
 * own bounded lifetime and can be joined by other callers.
 */
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

/**
 * A provider timeout that is started only when its header-wait slot is granted.
 * Queue time is charged to the request-wide deadline, not to provider health.
 * The timer remains active through the bounded body read and is cancelled by
 * the adapter in `finally`.
 */
export function createRequestTimeout(timeoutMs, {
  setTimeout: schedule = globalThis.setTimeout,
  clearTimeout: cancel = globalThis.clearTimeout,
} = {}) {
  const controller = new AbortController();
  let timer = null;
  let started = false;
  return {
    signal: controller.signal,
    start() {
      if (started || controller.signal.aborted) return;
      started = true;
      timer = schedule(() => {
        const reason = typeof DOMException === 'function'
          ? new DOMException('provider request timed out', 'TimeoutError')
          : Object.assign(new Error('provider request timed out'), { name: 'TimeoutError' });
        controller.abort(reason);
      }, timeoutMs);
    },
    cancel() {
      if (timer !== null) cancel(timer);
      timer = null;
    },
  };
}

/**
 * Wrap fetch with an explicit header-wait concurrency cap. Cloudflare allows
 * six outgoing connections per invocation while waiting for headers; queued
 * calls are removed on abort and never consume a slot after their deadline.
 * `run` starts a task after a slot is granted and releases the slot when the
 * task settles (for fetch adapters, when headers arrive). Body reads remain
 * bounded separately and may keep their own provider timeout active.
 */
export function createHeaderLimiter(fetchImpl, limit = SOURCE_HEADER_CONCURRENCY) {
  let active = 0;
  const queue = [];
  const pump = () => {
    while (active < limit && queue.length) {
      const next = queue.shift();
      next.signal?.removeEventListener('abort', next.onAbort);
      if (next.signal?.aborted) {
        next.reject(abortError(next.signal));
        continue;
      }
      active++;
      next.resolve();
    }
  };
  const acquire = async (signal) => {
    if (signal?.aborted) throw abortError(signal);
    if (active < limit) {
      active++;
      return;
    }
    await new Promise((resolve, reject) => {
      const entry = { resolve, reject, signal, onAbort: null };
      entry.onAbort = () => {
        const index = queue.indexOf(entry);
        if (index >= 0) queue.splice(index, 1);
        reject(abortError(signal));
      };
      signal?.addEventListener('abort', entry.onAbort, { once: true });
      queue.push(entry);
    });
  };
  const run = async (task, signal) => {
    await acquire(signal);
    try {
      return await task(fetchImpl);
    } finally {
      active--;
      pump();
    }
  };
  const limited = (url, init = {}) => run((fetch) => fetch(url, init), init.signal);
  limited.run = (task, signal) => run(task, signal);
  return limited;
}
