/**
 * Hand-written host-capability overrides.
 *
 * This file is the ONLY place where per-host restrictions are asserted by hand.
 * It is merged at load time with the generated upstream contract
 * (src/config/generated/*) and with whatever a live probe reports, so nothing
 * here duplicates data the sync script can derive.
 *
 * Every restriction below is sourced from a public, re-checkable surface:
 *  - `${base}/api/v1/status` -> data.version / data.channel /
 *    data.settings.regexAccess.level / data.settings.customHtml
 *  - the AIOStreams README / Docker Hub description for the community instance
 *
 * Checked 2026-08-31 against the live status endpoints; a probe always wins
 * over these defaults, which exist for the offline / CORS-blocked path.
 */

/** Access levels AIOStreams exposes for user-supplied regex (utils/regex-access.ts). */
export const REGEX_ACCESS_LEVELS = Object.freeze(['none', 'trusted', 'all']);

/**
 * Restriction kinds the gate understands.
 * - `preset`      a preset type the host refuses to resolve
 * - `streamType`  a stream type the host does not serve
 * - `regex`       user-supplied regex patterns are limited to a whitelist
 * - `feature`     a config key that needs a newer AIOStreams than the host runs
 */
export const RESTRICTION_KINDS = Object.freeze(['preset', 'streamType', 'regex', 'feature']);

export const HOST_CAPABILITY_OVERRIDES = Object.freeze({
  elfhosted: {
    label: 'ElfHosted (community)',
    kind: 'community',
    // "Torrentio, AnimeKitsu, and Torrent Catalogs are disabled here, respecting
    // the Torrentio developer's request that hosts not scrape their instance.
    // P2P and HTTP streams are also disabled to reduce liability."
    //   -- data.settings.customHtml, https://aiostreams.elfhosted.com/api/v1/status
    disabledPresetIds: ['torrentio', 'anime-kitsu', 'torrent-catalogs'],
    blockedStreamTypes: ['p2p', 'http'],
    regexAccess: 'none',
    // `regexAccess: 'none'` restricts regex to what the host publishes; it does
    // not forbid it. These are the synced-regex sources ElfHosted allows, read
    // from data.settings.regexAccess.urls at its own /api/v1/status. Verified
    // subset — a live probe supersedes this list and marks it complete.
    allowedRegexUrls: [
      'https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json',
    ],
    rateLimited: true,
    reasons: {
      preset: 'disabled on the ElfHosted community instance (Torrentio developer request)',
      streamType: 'P2P and HTTP streams are disabled on the ElfHosted community instance',
      regex: 'ElfHosted community runs REGEX_FILTER_ACCESS=none — only whitelisted patterns are accepted',
    },
  },
  'elfhosted-private': {
    label: 'ElfHosted (private / paid)',
    kind: 'private',
    // Paid single-tenant instances are owner-configured; ElfHosted advertises
    // "owner-level config, and rate limits you're not splitting with the
    // internet" (same customHtml). Treated as unrestricted until probed.
    disabledPresetIds: [],
    blockedStreamTypes: [],
    regexAccess: 'trusted',
    rateLimited: false,
    requiresProbe: true,
  },
  fortheweak: {
    label: "Yeb's / ForTheWeak",
    kind: 'community',
    disabledPresetIds: [],
    blockedStreamTypes: [],
    regexAccess: 'trusted',
    rateLimited: true,
  },
  midnight: {
    label: "Midnight's",
    kind: 'community',
    disabledPresetIds: [],
    blockedStreamTypes: [],
    regexAccess: 'trusted',
    rateLimited: true,
  },
  kuu: { label: "Kuu's", kind: 'community', disabledPresetIds: [], blockedStreamTypes: [], regexAccess: 'trusted', rateLimited: true },
  atbp: { label: 'ATBP', kind: 'community', disabledPresetIds: [], blockedStreamTypes: [], regexAccess: 'trusted', rateLimited: true },
  wizaardd: { label: 'Wizaardd', kind: 'community', disabledPresetIds: [], blockedStreamTypes: [], regexAccess: 'trusted', rateLimited: true },
  viren: {
    label: "Viren's Nightly",
    kind: 'nightly',
    disabledPresetIds: [],
    blockedStreamTypes: [],
    regexAccess: 'trusted',
    rateLimited: true,
  },
  omni: { label: "Omni's (legacy)", kind: 'community', disabledPresetIds: [], blockedStreamTypes: [], regexAccess: 'trusted', rateLimited: true },
  torbox: {
    label: 'TorBox-hosted AIOStreams',
    kind: 'vendor',
    // TorBox operates its own AIOStreams deployment for subscribers. Capability
    // details are not published on a status endpoint we can read without an
    // account, so nothing is asserted beyond "probe before trusting".
    disabledPresetIds: [],
    blockedStreamTypes: [],
    regexAccess: 'trusted',
    rateLimited: false,
    requiresProbe: true,
    unverified: true,
  },
  custom: {
    label: 'Self-hosted / Docker',
    kind: 'self-hosted',
    // Defaults come from AIOStreams' own env defaults: REGEX_FILTER_ACCESS and
    // SEL_SYNC_ACCESS default to the restrictive setting unless the operator
    // opts in, so we assume `trusted` and let the probe correct us.
    disabledPresetIds: [],
    blockedStreamTypes: [],
    regexAccess: 'trusted',
    rateLimited: false,
    requiresProbe: true,
  },
});

/**
 * Config keys that only exist from a given AIOStreams version onwards, so a
 * host running an older build would drop or reject them.
 *
 * Every entry is dated from the upstream CHANGELOG at the pinned ref — nothing
 * here is guessed. Keys whose introduction version could not be established
 * from the changelog are deliberately absent rather than estimated.
 *   - variants / activeVariants: "add configuration variants with CEL" -> 2.33.0
 *   - variantSelectorLocation:   "variants: support path param based selector
 *                                 and make default"                   -> 2.33.2
 */
export const FEATURE_MIN_VERSIONS = Object.freeze({
  variants: '2.33.0',
  activeVariants: '2.33.0',
  variantSelectorLocation: '2.33.2',
});

/**
 * Legacy keys that are NOT in the current UserDataSchema but that AIOStreams
 * still rewrites into current keys before validation
 * (`packages/core/src/utils/config.ts`, the migration pass that runs ahead of
 * `UserDataSchema.safeParse`). They must survive the gate or the user silently
 * loses the setting.
 *
 * `addonPassword` and `accessToken` are migrated upstream too but are
 * deliberately excluded here: they are credentials and must never ride along in
 * an exported template.
 */
export const LEGACY_MIGRATED_CONFIG_KEYS = Object.freeze([
  'nzbFailover',        // -> failover { enabled, maxAttempts, position, ... }
  'alwaysPrecache',     // -> precacheSelector
  'precacheCondition',  // -> precacheSelector
  'rpdbUseRedirectApi', // -> posterService
  'showStatistics',     // -> statistics.*
  'statisticsPosition', // -> statistics.*
]);

/**
 * Config keys Core Builds still emits that the pinned upstream schema does not
 * define. AIOStreams uses a plain `z.object`, so these are stripped server-side
 * rather than rejected — they are dead payload, and we drop them ourselves so
 * the exported JSON matches what the host will actually store.
 */
export const KNOWN_DEAD_CONFIG_KEYS = Object.freeze([
  'enhanceResults',
  'seadexBestOnly',
  'excludedStreamSources',
  'maxResults',
  'maxResultsPerResolution',
  'minSeeders',
]);
