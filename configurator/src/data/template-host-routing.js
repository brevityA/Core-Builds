/**
 * Template-to-host routing.
 *
 * A template without an explicit entry is treated as compatible with every
 * public host, subject to the per-host capability checks performed by
 * scripts/validate-template-host-compat.mjs.
 *
 * Use an explicit entry when a template is intentionally limited to a subset of
 * hosts, or when a host needs to be excluded because of a known incompatibility.
 */
export const DEFAULT_TEMPLATE_ROUTING = Object.freeze({
  hosts: 'all',
  excludedHosts: [],
});

// Anime templates use `anime-tosho-new`, which needs AIOStreams 2.36.0
// (PRESET_MIN_VERSIONS). Omni's runs 2.35.9 (HOST_META), so they are not routed
// there. Drop the exclusion once HOST_META.omni reports 2.36.0 or later.
const ANIME_TOSHO_NEW_ROUTING = Object.freeze({ hosts: 'all', excludedHosts: ['omni'] });

export const TEMPLATE_HOST_ROUTING = Object.freeze({
  'brevity.core-nexus-anime': ANIME_TOSHO_NEW_ROUTING,
  'brevity.core-nexus-anime-lite': ANIME_TOSHO_NEW_ROUTING,
  'brevity.core-nexus-anime-4k': ANIME_TOSHO_NEW_ROUTING,
  'brevity.core-nexus-anime-4k-lite': ANIME_TOSHO_NEW_ROUTING,
  'brevity.core-nexus-anime-dub': ANIME_TOSHO_NEW_ROUTING,
  'brevity.core-nexus-anime-dub-lite': ANIME_TOSHO_NEW_ROUTING,
  'brevity.core-nexus-anime-dub-4k': ANIME_TOSHO_NEW_ROUTING,
  'core-nexus-anime-4k-labs': ANIME_TOSHO_NEW_ROUTING,
  'core-stable-torbox-1080p': {
    hosts: 'all',
    excludedHosts: [],
  },
  'core-stable-torbox-4k': {
    hosts: 'all',
    excludedHosts: [],
  },
});
