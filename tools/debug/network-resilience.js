/**
 * Network resilience utilities — retry, fallback, and offline detection.
 * Supplements the existing fetchWithTimeout / raceHostFetch / writeHostFetch.
 */

/**
 * Retry a fetch with exponential backoff.
 * @param {Function} fn - Async function to call
 * @param {Object} opts
 * @param {number} opts.maxRetries - Max retry attempts (default 2)
 * @param {number} opts.baseDelay - Base delay in ms (default 1000)
 * @param {Function} opts.onRetry - Called on each retry with (attempt, error)
 * @returns {Promise}
 */
export async function withRetry(fn, opts = {}) {
  const { maxRetries = 2, baseDelay = 1000, onRetry } = opts;
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
        if (typeof onRetry === 'function') onRetry(i + 1, e);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

/**
 * Offline detection — shows a banner when the user goes offline.
 * Call initOfflineDetection() once at startup.
 */
export function initOfflineDetection() {
  const show = () => {
    let el = document.getElementById('cbOfflineBanner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cbOfflineBanner';
      el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:10px 16px;background:rgba(245,158,11,.12);border-top:1px solid rgba(245,158,11,.3);color:#fbbf24;font-size:.82rem;font-weight:600;text-align:center;backdrop-filter:blur(8px);transition:transform .3s';
      el.textContent = '📡 You appear to be offline — some features may not work';
      document.body.appendChild(el);
    }
    el.style.transform = 'translateY(0)';
  };
  const hide = () => {
    const el = document.getElementById('cbOfflineBanner');
    if (el) el.style.transform = 'translateY(100%)';
  };
  window.addEventListener('offline', show);
  window.addEventListener('online', hide);
  if (!navigator.onLine) show();
}

/**
 * Detect if a fetch failure is CORS-related (common with public AIOStreams hosts).
 * Returns { isCors: boolean, suggestion: string }
 */
export function diagnoseNetworkError(error, url) {
  if (!error) return { isCors: false, suggestion: '' };

  const msg = String(error.message || error).toLowerCase();

  // CORS blocked
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('cors')) {
    return {
      isCors: true,
      suggestion: 'This host may block browser requests (CORS). The CORS proxy will be used automatically on retry.',
    };
  }

  // Timeout
  if (msg.includes('abort') || msg.includes('timeout') || msg.includes('timed out')) {
    return {
      isCors: false,
      suggestion: 'The host timed out. It may be overloaded or down. Try a different host or retry in a moment.',
    };
  }

  // DNS / unreachable
  if (msg.includes('ename') || msg.includes('enotfound') || msg.includes('dns')) {
    return {
      isCors: false,
      suggestion: 'Could not resolve the host. Check the URL or try a different instance.',
    };
  }

  return { isCors: false, suggestion: '' };
}

/**
 * Health check probe for a single host.
 * Returns { ok: boolean, latency: number, version: string, error: string }
 */
export async function probeHost(host, timeout = 4000) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(`${host}/api/v1/status`, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, latency: Date.now() - start, version: '', error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => ({}));
    const version = data?.data?.version || data?.version || '';
    return { ok: true, latency: Date.now() - start, version, error: '' };
  } catch (e) {
    return { ok: false, latency: Date.now() - start, version: '', error: e.message };
  }
}

/**
 * Check all hosts and return sorted by latency.
 * @param {Array<[string, string]>} entries - Array of [label, url] pairs
 * @param {number} timeout - Probe timeout in ms
 * @returns {Promise<Array<{label: string, url: string, ok: boolean, latency: number, version: string, error: string}>>}
 */
export async function probeAllHosts(entries, timeout = 4000) {
  const results = await Promise.all(entries.map(async ([label, url]) => {
    const probe = await probeHost(url, timeout);
    return { label, url, ...probe };
  }));
  return results.sort((a, b) => {
    if (a.ok !== b.ok) return a.ok ? -1 : 1;
    return a.latency - b.latency;
  });
}
