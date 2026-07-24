/**
 * Sanitized console logger — outputs debug info without leaking credentials.
 * Use this instead of raw console.log for any state/credential output.
 */

const SENSITIVE_KEYS = new Set([
  'stremioPassword', 'instancePassword', 'basePassword',
  'torbox', 'realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'offcloud',
  'easynews', 'easynewsPass', 'nzbgeek', 'debridio', 'debrider', 'easydebrid',
  'pikpak', 'seedr', 'nzbnoob', 'althub', 'usenetcrawler', 'drunkenslug',
  'nzbfinder', 'jackett', 'prowlarr', 'streamnzb', 'subdl',
  'tmdbToken', 'tmdbApiKey', 'authKey', 'apiKey', 'password', 'token',
]);

const MASK = '••••';

/**
 * Sanitize an object by masking sensitive values.
 * @param {Object} obj
 * @returns {Object} Sanitized copy
 */
export function sanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key) || key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('apikey')) {
      out[key] = typeof value === 'string' && value.length > 0 ? MASK : value;
    } else if (typeof value === 'object' && value !== null) {
      out[key] = sanitize(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Log sanitized state to console.
 * @param {Object} S - The state object
 * @param {string} label - Context label
 */
export function logState(S, label = 'State') {
  const clean = sanitize(S);
  console.log(`[CoreBuilds] ${label}:`, JSON.stringify(clean, null, 2));
}

/**
 * Log a sanitized error with context.
 * @param {string} context - Where the error happened
 * @param {Error|string} error - The error
 * @param {Object} extra - Extra context (will be sanitized)
 */
export function logError(context, error, extra = {}) {
  const clean = sanitize(extra);
  console.error(`[CoreBuilds] ${context}:`, error?.message || error, clean);
}

/**
 * Log a network request (without leaking query params with keys).
 * @param {string} method - HTTP method
 * @param {string} url - Request URL (will be stripped of path passwords)
 * @param {number} status - Response status
 * @param {number} ms - Latency in ms
 */
export function logRequest(method, url, status, ms) {
  // Strip any password from URL path
  const safeUrl = url.replace(/\/stremio\/[^/]+\/[^/]+\//, '/stremio/{uuid}/{pwd}/');
  const statusColor = status >= 200 && status < 300 ? '✅' : status >= 400 ? '✕' : '⚠';
  console.log(`[CoreBuilds] ${statusColor} ${method} ${safeUrl} → ${status} (${ms}ms)`);
}

/**
 * Create a debug dump that's safe to share (e.g., in a GitHub issue).
 * @param {Object} S - The state object
 * @returns {string} JSON string, sanitized
 */
export function createDebugDump(S) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    state: sanitize(S),
    localStorage: Object.keys(localStorage).filter(k => k.startsWith('coreBuild')).reduce((acc, k) => {
      try { acc[k] = JSON.parse(localStorage.getItem(k)); } catch { acc[k] = '(not JSON)'; }
      return acc;
    }, {}),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    theme: document.documentElement.getAttribute('data-theme'),
  }, null, 2);
}
