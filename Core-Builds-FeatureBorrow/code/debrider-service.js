/**
 * Debrider — new debrid service (AIOStreams v2.10.0+).
 * Multi-debrid aggregator.
 * 
 * Add to SERVICE_IDS and service options in app.js.
 */

// Add to SVC_IDS array in sanitizeSharedConfig():
export const DEBRIDER_ID = 'debrider';

// Add to DEFS service opts:
export const DEBRIDER_OPT = {
  v: 'debrid',
  icon: `<svg width="44" height="44" viewBox="0 0 44 44" fill="none">
    <rect x="7" y="8" width="30" height="28" rx="5" stroke="#06b6d4" stroke-width="1.5" fill="#06b6d4" fill-opacity=".06"/>
    <text x="22" y="22" text-anchor="middle" fill="#06b6d4" font-size="7" font-weight="900" font-family="system-ui,sans-serif">DBR</text>
    <path d="M13 30h18" stroke="#06b6d4" stroke-width="1" stroke-linecap="round" stroke-opacity=".4"/>
    <text x="22" y="34" text-anchor="middle" fill="#06b6d4" font-size="4.5" font-weight="700" letter-spacing=".3">DEBRIDER</text>
  </svg>`,
  name: 'Debrider',
  desc: 'Multi-debrid aggregator · API key',
};

// Add to SVC_DESC:
export const DEBRIDER_DESC = {
  debrider: 'Multi-debrid aggregator — use multiple debrid services through one API',
};

// Add to SVC_AUTH:
export const DEBRIDER_AUTH = {
  debrider: 'API key',
};

// Add to SVC_CAT:
export const DEBRIDER_CAT = {
  debrider: 'debrid',
};

// Add to PROVIDER_CREDENTIALS:
export const DEBRIDER_CREDENTIAL = {
  debrider: {
    label: 'Debrider API Key',
    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    url: 'https://debrider.io/',
    linkLabel: 'Open dashboard',
  },
};

/**
 * Debrider is also available as a service in AIOStreams.
 * Add to the service list in buildFinal():
 * 
 * services.push({
 *   type: 'debrider',
 *   credentials: { apiKey: S.creds.debrider }
 * });
 */
