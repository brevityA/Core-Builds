/**
 * Install policy — the rules a config must satisfy before it can be POSTed to
 * an AIOStreams host, plus the Library-preset usability rule. Pure: no DOM, no
 * network, no credentials ever leave the caller's scope.
 *
 * WHY THIS MODULE EXISTS
 *
 * Two host rejections were traced to rules AIOStreams enforces at save time
 * but Core Builds only discovered at 400-time:
 *
 *   1. "Library requires at least one usable service" — the Library addon is
 *      generated from the *services* array, and upstream rejects the whole
 *      config when no enabled service can back it (EasyNews cannot).
 *   2. "Option apiKey is required" — an enabled debrid service with an empty
 *      credential posts a config the host must refuse.
 *
 * Both rules are now asserted before anything leaves the app.
 */

import { PROVIDER_CREDENTIALS } from '../data/credentials.js';

/**
 * Service ids AIOStreams' Library addon can be generated from, read from the
 * pinned upstream source (LibraryPreset.supportedServices = StremThruPreset's
 * list + nzbdav + altmount + stremthru_newz + aiostreams) at v2.34.0 /
 * e694b6a. EasyNews, Seedr, Debridio, putio and stremio_nntp are NOT in that
 * list — a Library preset with only those enabled is rejected on save.
 */
export const LIBRARY_CAPABLE_SERVICE_IDS = Object.freeze([
  'alldebrid',
  'debridlink',
  'debrider',
  'easydebrid',
  'offcloud',
  'premiumize',
  'pikpak',
  'realdebrid',
  'torbox',
  'torrin',
  'nzbdav',
  'altmount',
  'stremthru_newz',
  'aiostreams',
]);

const LIBRARY_CAPABLE = new Set(LIBRARY_CAPABLE_SERVICE_IDS);

/**
 * True when at least one enabled service can back a Library preset. Accepts
 * the exact `services` array the generator emits (`[{ id, enabled,
 * credentials }]`) so the rule can never drift from what is actually posted.
 */
export function hasLibraryCapableService(services) {
  return (Array.isArray(services) ? services : []).some(
    service => service && service.enabled !== false && LIBRARY_CAPABLE.has(service.id),
  );
}

/**
 * Credentials each emitted service needs before the config can be POSTed.
 * `apiKey` services map 1:1 onto the S.creds key of the same name; EasyNews
 * needs its username AND password. P2P/HTTP need none. Debridio is absent by
 * design: its preset is simply omitted until a key exists (v2.93), so a
 * keyless Debridio never reaches the host as a rejected option.
 */
export const SERVICE_CREDENTIAL_REQUIREMENTS = Object.freeze({
  torbox: ['torbox'],
  realdebrid: ['realdebrid'],
  alldebrid: ['alldebrid'],
  premiumize: ['premiumize'],
  debridlink: ['debridlink'],
  offcloud: ['offcloud'],
  easydebrid: ['easydebrid'],
  pikpak: ['pikpak'],
  seedr: ['seedr'],
  debrider: ['debrider'],
  easynews: ['easynews', 'easynewsPass'],
});

/**
 * Every enabled service missing a required credential.
 * @param {Array<{id:string,enabled:boolean}>} services the emitted services array
 * @param {Record<string,string>} creds the credential map (S.creds shape)
 * @returns {{service:string, field:string, label:string}[]} one row per missing key
 */
export function missingDirectInstallCredentials(services, creds = {}) {
  const missing = [];
  for (const service of Array.isArray(services) ? services : []) {
    if (!service || service.enabled === false) continue;
    const fields = SERVICE_CREDENTIAL_REQUIREMENTS[service.id];
    if (!fields) continue;
    for (const field of fields) {
      if (String(creds[field] || '').trim()) continue;
      missing.push({
        service: service.id,
        field,
        label: PROVIDER_CREDENTIALS[field]?.label || `${service.id} ${field === service.id ? 'API key' : 'credential'}`,
      });
    }
  }
  return missing;
}
