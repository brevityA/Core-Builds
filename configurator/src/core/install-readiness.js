/**
 * Direct Install / Open-in-AIOStreams readiness policy — pure, no DOM, no
 * network, no credentials leave this module.
 *
 * When the configurator POSTs the generated config to an AIOStreams host
 * (`PUT/POST /api/v1/user`), the host validates credentials for every ENABLED
 * debrid service whose schema declares the credential option as required
 * (`packages/core/src/utils/crypt.ts` → UserDataSchema.safeParse with option
 * constraints). Posting an enabled service without its key fails the save with
 * "Option <credential> is required" and the install flow dies.
 *
 * `missingServiceCredentials()` is checked at render time (button disabled with
 * an inline reason) AND again at click time (backstop: no request leaves the
 * browser without the key) so the user gets a precise, inline failure instead.
 *
 * The unchanged escape hatch: `Export JSON` / `Import to AIOStreams` exports a
 * credential-less template and AIOStreams' own UI asks for keys during import.
 *
 * Scope notes:
 *  - `easynews` needs BOTH username and password.
 *  - `p2p` / `http` mirror lanes are free; they need no key.
 *  - `aiostreams`, `stremio_nntp`, `nzbdav`, `altmount`, `stremthru_newz`,
 *    `putio` (oauth) declare no plain required credential for our emission.
 *  - `debridio` is intentionally NOT listed: the configurator omits the
 *    Debridio preset entirely when no key is set, so a key-less config that
 *    enables the lane is valid to POST (covered by existing e2e).
 */

import { PROVIDER_CREDENTIALS } from '../data/credentials.js';

/**
 * Enabled service id -> credential ids that MUST be non-empty before a host
 * POST of the config. Emission maps these ids 1:1 to the state credential ids.
 */
export const REQUIRED_SERVICE_CREDENTIALS = Object.freeze({
  realdebrid: Object.freeze(['realdebrid']),
  alldebrid: Object.freeze(['alldebrid']),
  premiumize: Object.freeze(['premiumize']),
  debridlink: Object.freeze(['debridlink']),
  torbox: Object.freeze(['torbox']),
  offcloud: Object.freeze(['offcloud']),
  easydebrid: Object.freeze(['easydebrid']),
  pikpak: Object.freeze(['pikpak']),
  seedr: Object.freeze(['seedr']),
  debrider: Object.freeze(['debrider']),
  easynews: Object.freeze(['easynews', 'easynewsPass']),
});

function credentialLabel(credentialId) {
  return PROVIDER_CREDENTIALS[credentialId]?.label || credentialId;
}

/**
 * Missing credentials for the services that will actually ship in the template.
 *
 * @param {string[]} enabledServiceIds ids returned by `services()` (already
 *   filtered to the enabled set)
 * @param {Record<string,string>} [creds] state credentials snapshot
 * @returns {{service:string, credential:string, label:string}[]} one entry per
 *   missing key, in stable service order; empty when the config may be POSTed.
 */
export function missingServiceCredentials(enabledServiceIds = [], creds = {}) {
  const missing = [];
  for (const id of Array.isArray(enabledServiceIds) ? enabledServiceIds : []) {
    const required = REQUIRED_SERVICE_CREDENTIALS[id] || [];
    for (const credentialId of required) {
      if (!String(creds[credentialId] || '').trim()) {
        missing.push({ service: id, credential: credentialId, label: credentialLabel(credentialId) });
      }
    }
  }
  return missing;
}
