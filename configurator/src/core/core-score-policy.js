/**
 * Core Score — a single, explainable 0–100 quality number per stream.
 *
 * This is Core Builds' differentiator: the statistical-filtering engine made
 * visible. Every stream is scored on quality tier, bitrate position vs the IQR
 * Tukey fence, resolution fit, HDR/DV, source trust, seeders and freshness —
 * and every point is *explainable* (see `scoreStream` trace).
 *
 * Pure module — no DOM, no fetch, deterministic. Unit-testable in isolation.
 */

// ── Quality tier base scores ──────────────────────────────────────────
const TIER_BASE = {
  'bluray remux': 100, 'remux': 100, 'bluray': 88, 'blu-ray': 88,
  'web-dl': 76, 'webdl': 76, 'webrip': 64, 'web-rip': 64, 'hdtv': 45,
  'cam': 10, 'ts': 10, 'scr': 10, 'hdrip': 40, 'dvdrip': 35,
};
const TIER_MEDIAN_BITRATE = { // Mbps heuristic per tier for the bitrate component
  100: 55, 88: 42, 76: 18, 64: 12, 45: 6, 40: 8, 35: 5, 10: 3,
};

const WEIGHTS = { tier: .30, bitrate: .25, resolution: .15, hdr: .10, source: .10, seeders: .05, freshness: .05 };

// ── Helpers ───────────────────────────────────────────────────────────
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
function tierOf(quality) {
  const q = String(quality || '').toLowerCase();
  if (!q) return 40;
  for (const [key, base] of Object.entries(TIER_BASE)) {
    if (q.includes(key)) return base;
  }
  return 40;
}
function resolutionFit(res, preferred = ['2160p', '1080p']) {
  const r = String(res || '').toLowerCase();
  if (!r) return 60;
  if (preferred.includes(r)) return 100;
  if (['720p', '1440p'].includes(r)) return 75;
  if (['480p', '360p', 'sd'].includes(r)) return 40;
  return 60;
}
function hdrScore(tags) {
  const t = String(tags || '').toUpperCase();
  if (t.includes('DV') || t.includes('DOLBY VISION')) return 100;
  if (t.includes('HDR10+')) return 95;
  if (t.includes('HDR10')) return 85;
  if (t.includes('HLG')) return 75;
  if (t.includes('SDR')) return 60;
  return 60;
}
function sourceScore(stream) {
  if (stream.library) return 100;
  if (stream.seadex === 'best' || stream.seadexBest) return 95;
  if (stream.cached) return 85;
  if (stream.indexer) return 80;
  if (stream.seadex) return 78;
  return 60;
}
function seedersScore(seeders) {
  const n = num(seeders);
  if (n === null) return null;            // unknown — neutral
  if (n >= 500) return 100;
  if (n >= 100) return 85;
  if (n >= 20) return 70;
  return 50;
}
function freshnessScore(ageDays) {
  const n = num(ageDays);
  if (n === null) return null;
  if (n <= 30) return 100;
  if (n <= 90) return 85;
  if (n <= 365) return 70;
  return 55;
}

/**
 * Bitrate score vs the tier's IQR Tukey fence.
 * If explicit q1/iqr/q3 stats are supplied (from the generator's IQR
 * machinery) use them; otherwise fall back to a tier-median heuristic.
 * A stream above q3+1.5·IQR or below q1−1.5·IQR is an outlier → penalty.
 */
function bitrateScore(bitrateMbps, tierBase, stats) {
  const b = num(bitrateMbps);
  if (b === null) return null;
  const median = stats?.median ?? TIER_MEDIAN_BITRATE[tierBase] ?? 20;
  if (stats?.q1 != null && stats?.q3 != null && stats?.iqr != null) {
    if (b > stats.q3 + 1.5 * stats.iqr) return 55;   // outlier high — suspicious
    if (b < stats.q1 - 1.5 * stats.iqr) return 35;   // outlier low — likely junk
    return clamp(50 + ((b - median) / (median || 1)) * 30, 40, 100);
  }
  return clamp(50 + ((b - median) / (median || 1)) * 30, 35, 100);
}

/**
 * Score a stream. `stream` uses the parsed AIOStreams field names
 * (resolution, quality, bitrate, visualTags, seeders, age, cached,
 * library, seadex, indexer, releaseGroup…). `ctx` carries preferences and
 * optional IQR stats + the active gates.
 *
 * Returns { score, summary, breakdown, gates } — fully explainable.
 */
export function scoreStream(stream = {}, ctx = {}) {
  const tierBase = tierOf(stream.quality);
  const preferred = ctx.preferredResolutions || ['2160p', '1080p'];
  const parts = {
    tier: { label: 'Quality tier', points: tierBase, max: 100, note: String(stream.quality || 'unknown').toUpperCase() || '—' },
    resolution: { label: 'Resolution fit', points: resolutionFit(stream.resolution, preferred), max: 100, note: String(stream.resolution || 'unknown') },
    hdr: { label: 'HDR / Visual', points: hdrScore(stream.visualTags), max: 100, note: String(stream.visualTags || 'SDR') },
    bitrate: { label: 'Bitrate vs tier', points: bitrateScore(stream.bitrate, tierBase, ctx.tierStats), max: 100, note: stream.bitrate ? `${stream.bitrate} Mbps` : 'unknown' },
    source: { label: 'Source trust', points: sourceScore(stream), max: 100, note: sourceNote(stream) },
    seeders: { label: 'Seeders', points: seedersScore(stream.seeders), max: 100, note: stream.seeders != null ? `${stream.seeders}` : 'unknown' },
    freshness: { label: 'Freshness', points: freshnessScore(stream.age), max: 100, note: stream.age != null ? `${stream.age}d` : 'unknown' },
  };
  // Components with unknown values drop their weight into the known ones.
  let totalW = 0, acc = 0;
  for (const [k, p] of Object.entries(parts)) {
    if (p.points === null) continue;
    totalW += WEIGHTS[k];
    acc += p.points * WEIGHTS[k];
  }
  let score = totalW > 0 ? Math.round(acc / totalW) : 50;

  // ── Gates consistency: a stream your filters would remove can't rank top ──
  const gates = [];
  const floor = ctx.adaptiveFloor != null ? ctx.adaptiveFloor : 50;
  if (score < floor) gates.push({ name: 'Adaptive Score Floor', passed: false, note: `below floor ${floor}` });
  else gates.push({ name: 'Adaptive Score Floor', passed: true, note: `≥ ${floor}` });
  if (ctx.scoreIqrGuard != null && score < ctx.scoreIqrGuard) {
    gates.push({ name: 'Score IQR Guard', passed: false, note: `below guard ${ctx.scoreIqrGuard}` });
    score = Math.min(score, 49);
  } else {
    gates.push({ name: 'Score IQR Guard', passed: true, note: ctx.scoreIqrGuard != null ? `≥ ${ctx.scoreIqrGuard}` : 'not active' });
  }
  score = clamp(score, 0, 100);

  const rank = score >= 75 ? '🟢' : score >= 50 ? '🟡' : '🔴';
  return {
    score,
    rank,
    summary: `${rank} Core ${score} — ${parts.tier.note}${parts.bitrate.note !== 'unknown' ? ` · ${parts.bitrate.points >= 80 ? '+' : ''}${parts.bitrate.points - 70 > 0 ? parts.bitrate.points - 70 : parts.bitrate.points - 50} bitrate` : ''}${parts.hdr.note !== 'SDR' && parts.hdr.note !== 'unknown' ? ` · ${parts.hdr.note}` : ''}${stream.cached ? ' · cached' : ''}`,
    breakdown: parts,
    gates,
  };
}

function sourceNote(stream) {
  if (stream.library) return 'Library';
  if (stream.seadexBest || stream.seadex === 'best') return 'SeaDex best';
  if (stream.cached) return 'Cached';
  if (stream.indexer) return String(stream.indexer);
  if (stream.seadex) return 'SeaDex';
  return 'Public';
}

/**
 * Best-effort Core Score from a *formatted* stream line (Test Drive output),
 * which only has name/description text. Detects resolution, quality, cached
 * and HDR markers, then runs the same engine on the partial object.
 */
export function scoreFormattedStream(stream = {}, ctx = {}) {
  const text = `${stream.name || ''} ${stream.description || ''}`;
  const low = text.toLowerCase();
  const pick = (re) => { const m = low.match(re); return m ? (m[1] !== undefined ? m[1] : m[0]) : null; };
  const parsed = {
    quality: pick(/bluray remux|blu-ray remux|remux|bluray|blu-ray|web-dl|webrip|web-rip|hdtv|cam|ts|scr/i),
    resolution: pick(/2160p|1080p|1440p|720p|480p|4k/i),
    visualTags: pick(/dolby vision|hdr10\+|hdr10|hlg|hdr|dv/i),
    cached: /⚡|✅|instant|plays fast/i.test(text) ? true : (/⏳|uncached/i.test(text) ? false : undefined),
    library: /library|your media|torbox library/i.test(text) ? true : undefined,
    seadex: /seadex|sea dex|best release|⭐ best/i.test(text) ? true : undefined,
    seeders: pick(/🌱\s*(\d+)/i),
    age: pick(/⏱\s*(\d+)/i),
    bitrate: pick(/(\d+(?:\.\d+)?)\s*mbps/i),
  };
  const result = scoreStream(parsed, ctx);
  result.partial = true; // computed from formatted info, not parsed fields
  result.parsed = parsed;
  return result;
}
