/**
 * Template-to-host routing.
 *
 * A template without an explicit entry is treated as compatible with every
 * public host, subject to the per-host capability checks performed by
 * scripts/validate-template-host-compat.mjs.
 *
 * Use an explicit entry when a template is intentionally limited to a subset of
 * hosts, or when a host needs to be excluded because of a known incompatibility.
 * An entry must change something: one equal to DEFAULT_TEMPLATE_ROUTING, or one
 * keyed by an id no template has, is refused by tests/template-host-compat.test.mjs.
 */
export const DEFAULT_TEMPLATE_ROUTING = Object.freeze({
  hosts: 'all',
  excludedHosts: [],
});

// No template needs an exclusion today. Anime templates use `anime-tosho-new`
// (AIOStreams 2.36.0+, PRESET_MIN_VERSIONS) and were kept off Omni's while it ran
// 2.35.9; it runs 2.37.0 since the 2026-11-21 audit (HOST_META).
export const TEMPLATE_HOST_ROUTING = Object.freeze({});
