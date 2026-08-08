/**
 * Regex whitelist checker — finds regex patterns in a generated config that
 * are NOT on the host allowlist (Vidhin05's, which ElfHosted/ForTheWeak
 * validate against) or use constructs ElfHosted rejects (inline lookbehind),
 * and strips them on request. Pure, deterministic.
 */
import { REGEX_ALLOWLIST } from '../data/regex-allowlist.js';

const ALLOWED = REGEX_ALLOWLIST; // {normalizedPattern: name}

// Inline lookbehind is the documented ElfHosted blocker: patterns using
// (?<= ... ) or (?<! ... ) are rejected even when they're on Vidhin05's list.
const LOOKBEHIND_RE = /\(\?<[=!]/;

function normalizePattern(p) {
  const s = String(p || '').trim();
  if (s.startsWith('/') && s.lastIndexOf('/') > 0) return s.slice(1, s.lastIndexOf('/'));
  return s;
}

export const REGEX_FIELDS = ['rankedRegexPatterns', 'preferredRegexPatterns', 'excludedRegexPatterns', 'regexOverrides'];

export function isAllowed(pattern) {
  return Object.prototype.hasOwnProperty.call(ALLOWED, normalizePattern(pattern));
}

export function hasLookbehind(pattern) {
  return LOOKBEHIND_RE.test(String(pattern || ''));
}

// Return [{field, name, pattern, reason}] for every pattern that would be
// rejected by a host: not on the allowlist, OR uses inline lookbehind.
export function nonWhitelistedPatterns(config = {}) {
  const out = [];
  for (const field of REGEX_FIELDS) {
    const list = config[field] || [];
    list.forEach((entry, i) => {
      const pattern = typeof entry === 'string' ? entry : entry?.pattern;
      if (!pattern) return;
      const name = typeof entry === 'string' ? `${field} #${i + 1}` : (entry?.name || `${field} #${i + 1}`);
      if (!isAllowed(pattern)) {
        out.push({ field, name, pattern: normalizePattern(pattern), reason: 'not on host allowlist' });
      } else if (hasLookbehind(pattern)) {
        out.push({ field, name, pattern: normalizePattern(pattern), reason: 'inline lookbehind (blocked by ElfHosted)' });
      }
    });
  }
  return out;
}

// Return a shallow copy of config with host-rejected patterns removed.
export function stripNonWhitelisted(config = {}) {
  const next = { ...config };
  for (const field of REGEX_FIELDS) {
    const list = next[field] || [];
    const kept = list.filter((entry) => {
      const pattern = typeof entry === 'string' ? entry : entry?.pattern;
      return !pattern || (isAllowed(pattern) && !hasLookbehind(pattern));
    });
    if (kept.length !== list.length) next[field] = kept;
  }
  return next;
}
