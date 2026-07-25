/**
 * Core Builds — Competitive Feature Implementations
 * 
 * Features borrowed from:
 * - TVFlix: Age Limits / Kids Mode
 * - Tam-Taro: Library Boost
 * - AIOStreams v2.31: NZB Failover exposure
 * - Duck Tools: One-click full setup preset
 */

// ── 1. AGE LIMITS / KIDS MODE (from TVFlix) ──────────────────────
// Add to S state: ageLimit: 'none'
// Add to Fine-Tune panel UI
// Add to eses() function

const AGE_RATINGS = [
  { v: 'none', label: 'No Limit', desc: 'Show all content' },
  { v: 'G',    label: 'G — General', desc: 'All ages' },
  { v: 'PG',   label: 'PG', desc: 'Parental guidance suggested' },
  { v: 'PG-13', label: 'PG-13', desc: 'Parents strongly cautioned' },
  { v: 'R',    label: 'R — Restricted', desc: 'Under 17 requires parent' },
  { v: 'NC-17', label: 'NC-17', desc: 'No one 17 and under' },
];

/**
 * Generate age rating ESE expression.
 * When ageLimit is set, filters streams by TMDB certification.
 */
function ageRatingESE(limit) {
  if (!limit || limit === 'none') return null;
  // Map rating to max allowed TMDB certification values
  const certMap = {
    'G':    ['G', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-Y7-FV'],
    'PG':   ['G', 'PG', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-Y7-FV', 'TV-PG'],
    'PG-13': ['G', 'PG', 'PG-13', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-Y7-FV', 'TV-PG', 'TV-14'],
    'R':    ['G', 'PG', 'PG-13', 'R', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-Y7-FV', 'TV-PG', 'TV-14', 'TV-MA'],
    'NC-17': null, // No filtering needed for NC-17 — everything passes
  };
  const allowed = certMap[limit];
  if (!allowed) return null;
  const certArgs = allowed.map(c => `'${c}'`).join(',');
  return {
    enabled: true,
    expression: `/* Age Limit — max ${limit} */ certification(streams, ${certArgs})`
  };
}

// ── 2. LIBRARY BOOST (from Tam-Taro) ─────────────────────────────
// Add to S state: libraryBoost: 'default'
// Add to Fine-Tune panel UI
// Modifies sort order to put library streams first

const LIBRARY_BOOST_OPTIONS = [
  { v: 'none',    label: 'No Boost', desc: 'Library streams sorted normally' },
  { v: 'default', label: 'Default', desc: 'Library streams rank first within each quality tier' },
  { v: 'strong',  label: 'Strong', desc: 'Library streams always at the very top, above all other signals' },
];

/**
 * Get library boost sort key to insert into sort criteria.
 * Returns null if no boost, or a sort key object.
 */
function libraryBoostSortKey(mode) {
  if (!mode || mode === 'none') return null;
  if (mode === 'strong') return { key: 'library', direction: 'desc' };
  // 'default' — already handled by existing sort criteria (library key is present)
  return null;
}

// ── 3. NZB FAILOVER (from AIOStreams v2.31) ──────────────────────
// Add to S state: nzbFailover: false, nzbFailoverPosition: 'after-torrents', maxFailoverNzbs: 3
// Add to Fine-Tune panel UI

const NZB_FAILOVER_OPTIONS = {
  position: [
    { v: 'before-torrents', label: 'Before Torrents', desc: 'Try Usenet first, then torrents' },
    { v: 'after-torrents', label: 'After Torrents', desc: 'Try torrents first, then Usenet (recommended)' },
  ],
  maxNzbs: [
    { v: 1, label: '1 NZB' },
    { v: 2, label: '2 NZBs' },
    { v: 3, label: '3 NZBs (recommended)' },
    { v: 5, label: '5 NZBs' },
  ],
};

// ── 4. ONE-CLICK FULL SETUP (from Duck Tools QuackStart) ────────
// A single preset that checks all the boxes: AIOMetadata + Cinemeta patch + addon ordering

const FULL_SETUP_PRESET = {
  id: 'full-setup',
  label: 'Full Setup',
  desc: 'AIOStreams + AIOMetadata + Cinemeta patch — one click',
  icon: '⚡',
};

// ── 5. BANDWIDTH ESTIMATOR (from TVFlix) ─────────────────────────
// Add to Fine-Tune panel — estimates safe bitrate/speed settings

const BANDWIDTH_TIERS = [
  { speed: 25,  label: '25 Mbps',  desc: 'Basic broadband' },
  { speed: 50,  label: '50 Mbps',  desc: 'Standard home WiFi' },
  { speed: 100, label: '100 Mbps', desc: 'Fast broadband' },
  { speed: 200, label: '200 Mbps', desc: 'Fibre / gigabit' },
  { speed: 500, label: '500 Mbps+', desc: 'High-speed fibre' },
];

/**
 * Suggest max results and stream pool based on bandwidth.
 */
function bandwidthSuggestion(speedMbps) {
  if (!speedMbps || speedMbps < 25) return { pool: 'normal', maxResults: 20, note: 'Basic connection — smaller pool for faster results' };
  if (speedMbps < 50) return { pool: 'normal', maxResults: 30, note: 'Standard connection — normal pool' };
  if (speedMbps < 100) return { pool: 'large', maxResults: 50, note: 'Fast connection — larger pool for better selection' };
  if (speedMbps < 200) return { pool: 'large', maxResults: 75, note: 'Very fast — large pool, can handle big files' };
  return { pool: 'max', maxResults: 100, note: 'High-speed — maximum pool for best results' };
}

// ── 6. CONTENT TYPE HINTS (from TVFlix) ──────────────────────────
// Add to Content Preferences step

const CONTENT_HINTS = {
  'all':   { label: 'Everything', desc: 'Movies, TV, Anime — balanced for all content types' },
  'live':  { label: 'Movies & TV Only', desc: 'No anime scrapers or SeaDex — faster for western content' },
  'mixed': { label: 'Movies + Anime', desc: 'Movies/TV + SeaDex anime releases' },
  'anime': { label: 'Anime Only', desc: 'SeaDex best-only — confirmed best anime releases' },
};

// ── 7. EXCLUDE UNCACHED (already implemented, just documenting) ──
// S.excludeUncached: boolean
// When true, adds ESE: cached(streams) — removes all uncached streams

// ── 8. TEMPLATE HEALTH SCORE (already implemented) ───────────────
// S.healthScore: number (0-100)
// Displayed on Review step as a ring gauge

// ── 9. AUTO-UPDATE BANNER (already implemented) ──────────────────
// S.templateVersion: string
// Shows "Update available" banner when template is outdated

// ── Export all for use in app.js ─────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AGE_RATINGS,
    ageRatingESE,
    LIBRARY_BOOST_OPTIONS,
    libraryBoostSortKey,
    NZB_FAILOVER_OPTIONS,
    FULL_SETUP_PRESET,
    BANDWIDTH_TIERS,
    bandwidthSuggestion,
    CONTENT_HINTS,
  };
}
