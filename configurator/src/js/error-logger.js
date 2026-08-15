/**
 * Core Builds — Error Logger
 * 
 * Captures all template creation errors, unhandled exceptions,
 * and network failures into a localStorage ring buffer.
 * 
 * Users can view/export the log from the Diagnostics modal.
 * 
 * Usage:
 *   import { initErrorLogger, logError, getErrorLog, clearErrorLog } from './error-logger.js';
 *   initErrorLogger();  // Call once at startup
 *   logError('build', 'Template generation failed', { service: 'torbox-pro', error: err });
 */

const LOG_KEY = 'coreBuildErrorLog';
const MAX_ENTRIES = 50;

/**
 * Initialize the error logger.
 * Captures unhandled errors, unhandled promise rejections,
 * and network failures globally.
 */
export function initErrorLogger() {
  // Capture unhandled errors
  window.addEventListener('error', (e) => {
    logError('unhandled', e.message || 'Unknown error', {
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack?.split('\n').slice(0, 5).join('\n'),
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    logError('unhandled-promise', reason?.message || String(reason), {
      stack: reason?.stack?.split('\n').slice(0, 5).join('\n'),
    });
  });

  // Capture fetch failures (patch global fetch)
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const start = Date.now();
    try {
      const res = await originalFetch.apply(this, args);
      if (!res.ok && res.status >= 400) {
        logError('fetch', `HTTP ${res.status} ${res.statusText}`, {
          url: sanitizeUrl(url),
          status: res.status,
          duration: Date.now() - start,
        });
      }
      return res;
    } catch (err) {
      logError('fetch', err.message || 'Network error', {
        url: sanitizeUrl(url),
        duration: Date.now() - start,
      });
      throw err;
    }
  };

  console.log('[CoreBuilds] Error logger initialized');
}

/**
 * Log an error to the ring buffer.
 * @param {string} category - Error category (e.g., 'build', 'fetch', 'unhandled', 'import', 'deploy')
 * @param {string} message - Human-readable error message
 * @param {Object} context - Additional context (sanitized before storage)
 */
export function logError(category, message, context = {}) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      cat: category,
      msg: String(message).slice(0, 500),
      ctx: sanitizeContext(context),
      url: location.pathname,
      ua: navigator.userAgent?.slice(0, 100),
    };

    const log = getErrorLog();
    log.unshift(entry);
    if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch (e) {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Get the full error log.
 * @returns {Array} Array of error entries, newest first
 */
export function getErrorLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear the error log.
 */
export function clearErrorLog() {
  localStorage.removeItem(LOG_KEY);
}

/**
 * Get error log as a formatted string for display/export.
 * @returns {string}
 */
export function formatErrorLog() {
  const log = getErrorLog();
  if (!log.length) return 'No errors logged.';

  return log.map((e, i) => {
    const ctx = e.ctx && Object.keys(e.ctx).length
      ? '\n  Context: ' + JSON.stringify(e.ctx)
      : '';
    return `[${i + 1}] ${e.ts} [${e.cat}] ${e.msg}${ctx}`;
  }).join('\n\n');
}

/**
 * Get a summary of recent errors for the diagnostics modal.
 * @param {number} count - Number of recent errors to include
 * @returns {Array<{category: string, message: string, time: string, count: number}>}
 */
export function getErrorSummary(count = 10) {
  const log = getErrorLog();
  if (!log.length) return [];

  // Group by category + message
  const groups = {};
  for (const entry of log) {
    const key = `${entry.cat}::${entry.msg}`;
    if (!groups[key]) {
      groups[key] = { category: entry.cat, message: entry.msg, time: entry.ts, count: 0 };
    }
    groups[key].count++;
  }

  return Object.values(groups).slice(0, count);
}

/**
 * Generate HTML for the error log section in the diagnostics modal.
 * @returns {string}
 */
export function errorLogHtml() {
  const log = getErrorLog();
  if (!log.length) {
    return `<div style="text-align:center;padding:16px;color:#6b7280;font-size:.78rem">
      No errors logged — everything is running clean ✅
    </div>`;
  }

  const summary = getErrorSummary(10);
  const rows = summary.map(e => {
    const icon = e.category === 'fetch' ? '🌐' : e.category === 'build' ? '🔧' : e.category === 'import' ? '📥' : '⚠️';
    return `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(248,113,113,.04);border:1px solid rgba(248,113,113,.1);margin-bottom:4px">
      <span style="flex-shrink:0;font-size:.9rem">${icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.72rem;font-weight:700;color:#e6edf3">${esc(e.category)}</div>
        <div style="font-size:.68rem;color:#8b949e;line-height:1.4;word-break:break-word">${esc(e.message)}</div>
        <div style="font-size:.6rem;color:#4b5563;margin-top:2px">${esc(e.time)} · ${e.count} occurrence${e.count > 1 ? 's' : ''}</div>
      </div>
    </div>`;
  }).join('');

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:.72rem;font-weight:700;color:#8b949e">${log.length} error${log.length > 1 ? 's' : ''} logged</div>
      <div style="display:flex;gap:6px">
        <button onclick="navigator.clipboard.writeText(window._formatErrorLog?.() || '')" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(0,212,255,.2);background:rgba(0,212,255,.06);color:#00d4ff;font-size:.65rem;font-weight:700;cursor:pointer">Copy Log</button>
        <button onclick="window._exportErrorLog?.()" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(0,212,255,.2);background:rgba(0,212,255,.06);color:#00d4ff;font-size:.65rem;font-weight:700;cursor:pointer">Export JSON</button>
        <button onclick="window._clearErrorLog?.()" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(248,113,113,.2);background:rgba(248,113,113,.06);color:#f87171;font-size:.65rem;font-weight:700;cursor:pointer">Clear</button>
      </div>
    </div>
    ${rows}
    <details style="margin-top:8px">
      <summary style="list-style:none;cursor:pointer;font-size:.68rem;color:#4b5563;display:flex;align-items:center;gap:4px">
        <span style="font-size:.55rem">▶</span> Full log (newest first)
      </summary>
      <pre style="margin-top:6px;padding:10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06);font-size:.65rem;color:#8b949e;max-height:300px;overflow-y:auto;white-space:pre-wrap;word-break:break-all">${esc(formatErrorLog())}</pre>
    </details>
  `;
}

/**
 * Export error log as a downloadable JSON file.
 */
export function exportErrorLog() {
  const log = getErrorLog();
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `core-builds-error-log-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

// ── Helpers ────────────────────────────────────────────────────────

function sanitizeUrl(url) {
  if (!url) return '';
  // Strip UUIDs and passwords from manifest URLs
  return String(url)
    .replace(/\/stremio\/[^/]+\/[^/]+\//g, '/stremio/{uuid}/{pwd}/')
    .replace(/password=[^&]*/gi, 'password=***')
    .replace(/apiKey=[^&]*/gi, 'apiKey=***')
    .replace(/token=[^&]*/gi, 'token=***')
    .slice(0, 300);
}

// Audit C4 (2026-08-14): the redaction denylist had drifted from the credential registry —
// nzbhydra / nzbhydraApiKey (shipped v2.90) were missing. Derive from the single source of
// truth instead of hand-maintaining; a unit test (credentials.test.mjs) now guards the sync.
import { PROVIDER_CREDENTIALS } from '../data/credentials.js';

const SENSITIVE_KEYS = new Set([
  ...Object.keys(PROVIDER_CREDENTIALS),
  // non-provider secrets that share the same channels
  'password', 'stremioPassword', 'instancePassword', 'basePassword',
  'token', 'authKey', 'apiKey',
]);

function sanitizeContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (SENSITIVE_KEYS.has(k) || k.toLowerCase().includes('password') || k.toLowerCase().includes('token')) {
      out[k] = typeof v === 'string' && v.length > 0 ? '••••' : v;
    } else if (typeof v === 'object' && v !== null) {
      out[k] = sanitizeContext(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
