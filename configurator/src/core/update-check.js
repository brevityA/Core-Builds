/**
 * Update-check — pure helpers for detecting newer template versions and
 * extracting changelog ranges. No DOM, no fetch (fetch orchestration lives in
 * the app). Deterministic and unit-testable.
 */

// Parse "v0.9.1", "2.10.9", "3.5.3" -> [3,5,3]. Non-numeric parts are ignored.
export function parseVersion(v) {
  const s = String(v || '').replace(/^v/i, '').trim();
  const parts = s.split('.').map(n => parseInt(n, 10));
  const nums = parts.filter(n => Number.isFinite(n));
  if (!nums.length) return null;
  while (nums.length < 3) nums.push(0);
  return nums;
}

// isNewer(a, b): true if version a is strictly newer than version b.
export function isNewer(a, b) {
  const A = parseVersion(a), B = parseVersion(b);
  if (!A || !B) return false;
  for (let i = 0; i < 3; i++) {
    if (A[i] !== B[i]) return A[i] > B[i];
  }
  return false; // equal
}

// Extract changelog entries strictly newer than `from` and up to (incl.) `to`.
// `md` is the raw text of CHANGELOG.md. Headers look like `## 3.5.3 (date)`.
// Best-effort: entries that fail to parse are skipped; results are capped.
export function parseChangelogRange(md, from, to) {
  const lines = String(md || '').split('\n');
  const entries = []; // {version, lines}
  let current = null;
  const headerRe = /^#{1,4}\s*(?:\[?v?)?(\d+(?:\.\d+){1,3})\]?(?:\s*[-–—(]\s*.*)?\s*$/i;
  for (const raw of lines) {
    const m = raw.match(headerRe);
    if (m) {
      current = { version: m[1], lines: [] };
      entries.push(current);
      continue;
    }
    if (current) current.lines.push(raw);
  }
  const out = [];
  for (const e of entries) {
    const v = parseVersion(e.version);
    if (!v) continue;
    // Only entries strictly newer than `from` and at or below `to`.
    if (!isNewer(e.version, from)) continue;
    if (isNewer(e.version, to)) continue;
    const body = e.lines.map(l => l.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);
    out.push({ version: e.version, body: body.slice(0, 8) });
    if (out.length >= 5) break;
  }
  return out;
}

// Rate limiting: shouldCheck(now, lastTs, intervalMs) — true if we should run a
// check (first time or interval elapsed).
export function shouldCheck(now, lastTs, intervalMs = 60 * 60 * 1000) {
  if (!lastTs) return true;
  return (now - Number(lastTs)) >= intervalMs;
}

// Sanitise a stored-template record (only public metadata; never credentials).
export function normalizeTemplateMeta(meta = {}) {
  const sourceUrl = String(meta.sourceUrl || '').trim();
  const changelogUrl = String(meta.changelogUrl || '').trim();
  if (!/^https:\/\//i.test(sourceUrl)) return null;
  const version = String(meta.version || '').trim();
  if (!version) return null;
  return { sourceUrl, changelogUrl, version, name: String(meta.name || '').slice(0, 120) };
}
