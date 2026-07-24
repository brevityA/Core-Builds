/**
 * Knaben preset — add to OPTIONAL_SCRAPER_DEFS in scrapers.js
 * 
 * Knaben is a torrent indexer proxy that searches The Pirate Bay, 1337x,
 * Nyaa.si, and more. Built into AIOStreams since v2.13.0.
 * Already used by Tam-Taro and TVFlix templates.
 */

// Add this entry to the OPTIONAL_SCRAPER_DEFS array in scrapers.js:
export const KNABEN_SCRAPER = {
  id: 'knaben',
  label: 'Knaben',
  desc: 'Proxy search across TPB, 1337x, Nyaa.si, and more',
  presetType: 'knaben',
  cat: 'debrid',
  color: '#e11d48',
  // No credKey — Knaben is free, no API key needed
};

// Also add these new scraper entries:
export const NEW_SCRAPERS = [
  {
    id: 'knaben',
    label: 'Knaben',
    desc: 'Proxy search across TPB, 1337x, Nyaa.si, and more',
    presetType: 'knaben',
    cat: 'debrid',
    color: '#e11d48',
  },
  {
    id: 'zilean',
    label: 'Zilean',
    desc: 'DMM hashlist scraper — instant-cached results',
    presetType: 'zilean',
    cat: 'debrid',
    color: '#8b5cf6',
  },
  {
    id: 'jackett',
    label: 'Jackett',
    desc: 'Connect your Jackett instance — searches 50+ indexers',
    presetType: 'jackett',
    cat: 'debrid',
    color: '#0ea5e9',
    credKey: 'jackett',
    needsUrl: true,
  },
  {
    id: 'prowlarr',
    label: 'Prowlarr',
    desc: 'Connect your Prowlarr instance — indexer management',
    presetType: 'prowlarr',
    cat: 'debrid',
    color: '#f97316',
    credKey: 'prowlarr',
    needsUrl: true,
  },
  {
    id: 'torznab',
    label: 'Torznab',
    desc: 'Configure any Torznab API — torrent indexers via Jackett/Prowlarr',
    presetType: 'torznab',
    cat: 'debrid',
    color: '#14b8a6',
    credKey: 'torznab',
    needsUrl: true,
  },
];

// Add these to PROVIDER_CREDENTIALS in credentials.js:
export const NEW_CREDENTIALS = {
  jackett: {
    label: 'Jackett API Key',
    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    url: 'http://localhost:9117/UI/Dashboard',
    linkLabel: 'Get key from Jackett',
  },
  prowlarr: {
    label: 'Prowlarr API Key',
    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    url: 'http://localhost:9696/settings/general',
    linkLabel: 'Get key from Prowlarr',
  },
  torznab: {
    label: 'Torznab Instance URL',
    placeholder: 'http://localhost:9117/api/v2.0/indexers/xxx/results/torznab',
    url: '',
    linkLabel: 'Use your Torznab URL',
  },
};
