/**
 * Regex whitelist checker — finds regex patterns in a generated config that
 * are NOT on the host allowlist (Vidhin05's, which ElfHosted/ForTheWeak
 * validate against), and strips them on request. Pure, deterministic.
 */
import { REGEX_ALLOWLIST } from '../data/regex-allowlist.js';

const ALLOWED = REGEX_ALLOWLIST; // {normalizedPattern: name}

function normalizePattern(p) {
  const s = String(p || '').trim();
  if (s.startsWith('/') && s.lastIndexOf('/') > 0) return s.slice(1, s.lastIndexOf('/'));
  return s;
}

export const REGEX_FIELDS = ['rankedRegexPatterns', 'preferredRegexPatterns', 'excludedRegexPatterns', 'regexOverrides'];

export function isAllowed(pattern) {
  return Object.prototype.hasOwnProperty.call(ALLOWED, normalizePattern(pattern));
}

// Return [{field, name, pattern}] for every pattern not on the allowlist.
export function nonWhitelistedPatterns(config = {}) {
  const out = [];
  for (const field of REGEX_FIELDS) {
    const list = config[field] || [];
    list.forEach((entry, i) => {
      const pattern = typeof entry === 'string' ? entry : entry?.pattern;
      if (!pattern) return;
      if (!isAllowed(pattern)) {
        out.push({ field, name: typeof entry === 'string' ? `${field} #${i + 1}` : (entry?.name || `${field} #${i + 1}`), pattern: normalizePattern(pattern) });
      }
    });
  }
  return out;
}

// Return a shallow copy of config with non-whitelisted patterns removed.
export function stripNonWhitelisted(config = {}) {
  const next = { ...config };
  for (const field of REGEX_FIELDS) {
    const list = next[field] || [];
    const kept = list.filter((entry, i) => {
      const pattern = typeof entry === 'string' ? entry : entry?.pattern;
      return !pattern || isAllowed(pattern);
    });
    if (kept.length !== list.length) next[field] = kept;
  }
  return next;
}
