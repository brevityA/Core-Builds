/**
 * NZB Failover — AIOStreams v2.25.0+
 * 
 * When a Usenet stream fails to resolve, AIOStreams can automatically
 * try the next NZB. Configurable position and max retries.
 */

/**
 * NZB failover options for the Fine-Tune panel.
 */
export const NZB_FAILOVER_OPTIONS = {
  position: {
    label: 'NZB Failover Position',
    desc: 'When to try NZB failover relative to torrent streams',
    options: [
      { v: 'before-torrents', label: 'Before Torrents', desc: 'Try NZBs first, failover to torrents' },
      { v: 'after-torrents', label: 'After Torrents', desc: 'Try torrents first, failover to NZBs' },
      { v: 'disabled', label: 'Disabled', desc: 'No NZB failover' },
    ],
  },
  maxNzbs: {
    label: 'Max Failover NZBs',
    desc: 'Maximum number of NZBs to try before giving up',
    options: [
      { v: 1, label: '1' },
      { v: 2, label: '2' },
      { v: 3, label: '3' },
      { v: 5, label: '5' },
    ],
  },
};

/**
 * Generate NZB failover config for the template.
 * @param {Object} opts
 * @param {string} opts.position - 'before-torrents' | 'after-torrents' | 'disabled'
 * @param {number} opts.maxNzbs - Max NZBs to try
 * @returns {Object|null}
 */
export function generateNzbFailoverConfig(opts) {
  if (!opts.position || opts.position === 'disabled') return null;

  return {
    nzbFailover: {
      enabled: true,
      position: opts.position === 'before-torrents' ? 'before' : 'after',
      maxFailoverNzbs: opts.maxNzbs || 3,
    }
  };
}
