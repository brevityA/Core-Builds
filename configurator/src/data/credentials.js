export const PROVIDER_CREDENTIALS = {
  torbox:        { label: 'TorBox API Key',        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', url: 'https://torbox.app/settings', linkLabel: 'Get key' },
  realdebrid:    { label: 'Real-Debrid API Key',   placeholder: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',     url: 'https://real-debrid.com/apitoken', linkLabel: 'Get key' },
  alldebrid:     { label: 'AllDebrid API Key',      placeholder: 'XXXXXXXXXXXXXXXX',                    url: 'https://alldebrid.com/apikeys', linkLabel: 'Get key' },
  premiumize:    { label: 'Premiumize API Key',     placeholder: 'XXXXXXXXXXXXXXXX',                    url: 'https://www.premiumize.me/account', linkLabel: 'Open account' },
  debridlink:    { label: 'Debrid-Link API Key',    placeholder: 'XXXXXXXXXXXXXXXX',                    url: 'https://debrid-link.com/webapp#/account/api', linkLabel: 'Get key' },
  offcloud:      { label: 'Offcloud API Key',       placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://offcloud.com/#/account/api', linkLabel: 'Get key' },
  offcloudEmail: { label: 'Offcloud Email',         placeholder: 'you@example.com',                     url: 'https://offcloud.com/#/account', linkLabel: 'Open account' },
  offcloudPass:  { label: 'Offcloud Password',      placeholder: 'your-password',                       url: 'https://offcloud.com/#/account', linkLabel: 'Open account' },
  easynews:      { label: 'EasyNews Username',      placeholder: 'your-username',                       url: 'https://www.easynews.com/account', linkLabel: 'Open account' },
  easynewsPass:  { label: 'EasyNews Password',      placeholder: 'your-password',                       url: 'https://www.easynews.com/account', linkLabel: 'Open account' },
  nzbgeek:       { label: 'NZBGeek API Key',        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://nzbgeek.info/dashboard.php?call=profile', linkLabel: 'Get key' },
  debridio:      { label: 'Debridio API Key',       placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://debridio.com/', linkLabel: 'Open dashboard' },
  easydebrid:    { label: 'EasyDebrid API Key',     placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://easydebrid.com/', linkLabel: 'Open account' },
  pikpak:        { label: 'PikPak Email',           placeholder: 'you@example.com',                     url: 'https://mypikpak.com/', linkLabel: 'Open account' },
  pikpakPass:    { label: 'PikPak Password',        placeholder: 'your-password',                       url: 'https://mypikpak.com/', linkLabel: 'Open account' },
  seedr:         { label: 'Seedr Encoded Token (from MediaFusion)', placeholder: 'paste the token MediaFusion gives you', url: 'https://mediafusion.elfhosted.com/configure', linkLabel: 'Authorise at MediaFusion' },
  debrider:      { label: 'Debrider API Key',       placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://debrider.io/', linkLabel: 'Open dashboard' },
  streamnzb:     { label: 'StreamNZB Manifest URL', placeholder: 'https://your-streamnzb-instance/manifest.json', url: '', linkLabel: 'Use your manifest URL' },
  nzbnoob:       { label: 'NZBnoob API Key',        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://nzbnoob.com', linkLabel: 'Get key' },
  althub:        { label: 'altHUB API Key',          placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://althub.co.za', linkLabel: 'Get key' },
  usenetcrawler: { label: 'Usenet Crawler API Key',  placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://usenet-crawler.com', linkLabel: 'Get key' },
  drunkenslug:   { label: 'DrunkenSlug API Key',     placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://drunkenslug.com', linkLabel: 'Get key' },
  nzbfinder:     { label: 'NZBFinder API Key',       placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://nzbfinder.ws', linkLabel: 'Get key' },
  jackett:       { label: 'Jackett API Key',         placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'http://localhost:9117/UI/Dashboard', linkLabel: 'Get key from Jackett' },
  prowlarr:      { label: 'Prowlarr API Key',        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'http://localhost:9696/settings/general', linkLabel: 'Get key from Prowlarr' },
  subdl:         { label: 'SubDL API Key',           placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://subdl.com/panel/api', linkLabel: 'Get key' },
  tmdbToken:     { label: 'TMDB Read Access Token',  placeholder: 'eyJhbGciOiJSUzI1NiJ9…',              url: 'https://www.themoviedb.org/settings/api', linkLabel: 'Get key' },
  tmdbApiKey:    { label: 'TMDB API Key',            placeholder: 'abc123def456…',                       url: 'https://www.themoviedb.org/settings/api', linkLabel: 'Get key' },
  nzbhydra:      { label: 'NZBHydra2 URL',           placeholder: 'http://localhost:5076',                url: 'https://github.com/theotherp/nzbhydra2', linkLabel: 'GitHub' },
  nzbhydraApiKey:{ label: 'NZBHydra2 API Key',       placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',     url: 'https://github.com/theotherp/nzbhydra2', linkLabel: 'GitHub' },
};

/**
 * Services whose AIOStreams credentials are not a single `apiKey`. Each pair maps a
 * PROVIDER_CREDENTIALS key (what the form stores in S.creds) to the credential id
 * AIOStreams validates. All listed ids are `required: true` upstream
 * (packages/core/src/utils/constants.ts, SERVICE_DETAILS), so an enabled service
 * missing any of them makes the whole config fail to save.
 */
export const SERVICE_CREDENTIAL_FIELDS = Object.freeze({
  offcloud: Object.freeze([['offcloud', 'apiKey'], ['offcloudEmail', 'email'], ['offcloudPass', 'password']]),
  pikpak: Object.freeze([['pikpak', 'email'], ['pikpakPass', 'password']]),
  seedr: Object.freeze([['seedr', 'encodedToken']]),
});

/** Form keys a service needs, in display order (falls back to the service id itself). */
export function serviceCredentialKeys(serviceId) {
  return (SERVICE_CREDENTIAL_FIELDS[serviceId] || [[serviceId]]).map(([key]) => key);
}

/** AIOStreams `credentials` object for a service, from the stored form values. */
export function serviceCredentials(serviceId, creds = {}) {
  const fields = SERVICE_CREDENTIAL_FIELDS[serviceId];
  if (!fields) return creds[serviceId] ? { apiKey: creds[serviceId] } : {};
  const out = {};
  for (const [key, id] of fields) if (creds[key]) out[id] = creds[key];
  return out;
}
