/**
 * ChillLink policy — the rules for the Chillio install target. Pure: no DOM, no
 * network, no credentials leave the caller's scope. Mirrors the style of
 * host-routing.js / install-policy.js so the UI layer only renders decisions.
 *
 * WHY THIS MODULE EXISTS
 *
 * Chillio (https://chillio.app) consumes addons over the ChillLink Protocol
 * (https://link.chillio.app/documentation). AIOStreams implements that protocol
 * natively (upstream PR Viren070/AIOStreams#586, released 2.20.0) on an
 * authenticated router mounted at `/chilllink/:uuid/:encryptedPassword` with
 * `/manifest` and `/streams` sub-routes. Given the same uuid/encryptedPassword
 * the Stremio manifest uses, the ChillLink base URL is a pure string derivation
 * — no extra request and no dependency on link.chillio.app.
 *
 * Two hard upstream constraints drive the rules here:
 *
 *   1. The ChillLink transformer only emits http/usenet/debrid/live streams.
 *      P2P (torrent) streams have no direct URL and are dropped, so a P2P build
 *      installed into Chillio "works" but plays nothing. The gate below stops
 *      that before any config is posted.
 *   2. The router requires the password segment — there is no keyless
 *      `/chilllink/u/:uuid` route the way Stremio has /stremio/u/:uuid.
 */

import { isVersionAtLeast } from './host-capability-policy.js';

/** First AIOStreams release that serves the /chilllink router. */
export const MIN_CHILLLINK_AIOSTREAMS_VERSION = '2.20.0';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build a ChillLink base URL from the same parts the Stremio manifest URL uses.
 * Throws on programmer error (callers hold a validated POST response); user
 * input should go through chillLinkFromStremioManifest(), which is tolerant.
 *
 * @param {{host:string, uuid:string, encryptedPassword:string}} parts
 * @returns {string} e.g. https://aiostreams.elfhosted.com/chilllink/<uuid>/<epwd>
 */
export function buildChillLinkUrl({ host, uuid, encryptedPassword } = {}) {
  let base;
  try {
    base = new URL(host);
  } catch {
    throw new Error('chilllink: host must be an absolute http(s) URL');
  }
  if (base.protocol !== 'https:' && base.protocol !== 'http:') {
    throw new Error('chilllink: host must be an http(s) URL');
  }
  if (!UUID_RE.test(String(uuid || ''))) {
    throw new Error('chilllink: uuid must be a valid UUID');
  }
  const epwd = String(encryptedPassword == null ? '' : encryptedPassword);
  if (!epwd) {
    throw new Error('chilllink: encryptedPassword is required — ChillLink has no keyless route');
  }
  // The segment lands in a path position. Callers pass the already-encoded
  // encryptedPassword AIOStreams returns; reject anything that would split it.
  if (/[/?#]/.test(epwd)) {
    throw new Error('chilllink: encryptedPassword must be a single URL path segment');
  }
  return `${base.origin}/chilllink/${uuid}/${epwd}`;
}

/**
 * Derive the ChillLink base URL from a Stremio manifest URL of the shape
 * `https://host/stremio/<uuid>/<encryptedPassword>/manifest.json`.
 * Tolerant by design: returns null for anything that is not an authenticated
 * Stremio manifest (keyless manifests, pasted non-AIOStreams URLs, garbage),
 * so the modal can simply hide the Chillio tab instead of erroring.
 *
 * @param {string} stremioUrl
 * @returns {string|null}
 */
export function chillLinkFromStremioManifest(stremioUrl) {
  if (typeof stremioUrl !== 'string' || !stremioUrl.trim()) return null;
  let url;
  try {
    url = new URL(stremioUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.indexOf('stremio');
  // Need stremio/<uuid>/<encryptedPassword>/manifest.json — four segments.
  if (at === -1 || parts.length < at + 4) return null;
  const uuid = parts[at + 1];
  const encryptedPassword = parts[at + 2];
  if (parts[at + 3] !== 'manifest.json') return null;
  if (!UUID_RE.test(uuid)) return null;
  try {
    return buildChillLinkUrl({ host: url.origin, uuid, encryptedPassword });
  } catch {
    return null;
  }
}

/**
 * Can this service class be played through ChillLink?
 *
 * @param {{service?: string}} request the config about to be installed
 * @returns {{status:'ok'|'blocked', reasons:string[]}} blocked means never
 *   offer the Chillio target for this config; the transformer would drop every
 *   stream of this type.
 */
export function chillLinkGate({ service } = {}) {
  if (service === 'p2p') {
    return {
      status: 'blocked',
      reasons: [
        'Chillio cannot play torrent (P2P) streams — the ChillLink protocol only carries direct HTTP, Usenet, debrid and live URLs, so this config would return zero sources. Pick a debrid or HTTP service, or keep the Stremio target.',
      ],
    };
  }
  return { status: 'ok', reasons: [] };
}

/**
 * Does the AIOStreams version the selected host runs predate ChillLink?
 * A null/unknown version never blocks: the offline registry is advisory and a
 * live /api/v1/status probe is the stronger signal elsewhere in the app.
 *
 * @param {string|null|undefined} version e.g. '2.36.0'
 * @returns {{status:'ok'|'blocked', reasons:string[]}}
 */
export function chillLinkVersionDecision(version) {
  if (!version) return { status: 'ok', reasons: [] };
  if (!isVersionAtLeast(String(version), MIN_CHILLLINK_AIOSTREAMS_VERSION)) {
    return {
      status: 'blocked',
      reasons: [
        `This host runs AIOStreams ${version}; ChillLink needs ${MIN_CHILLLINK_AIOSTREAMS_VERSION}+, so the /chilllink route does not exist there.`,
      ],
    };
  }
  return { status: 'ok', reasons: [] };
}
