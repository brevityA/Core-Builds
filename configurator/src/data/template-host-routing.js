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

export const TEMPLATE_HOST_ROUTING = Object.freeze({
  'core-stable-torbox-1080p': {
    hosts: 'all',
    excludedHosts: [],
  },
  'core-stable-torbox-4k': {
    hosts: 'all',
    excludedHosts: [],
  },
});
