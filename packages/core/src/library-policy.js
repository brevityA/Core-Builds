/**
 * Library-preset usability rule — the packages/core half of the 2026-09-06
 * audit fix (defect 2), kept byte-identical in spirit to
 * configurator/src/core/install-policy.js. The CLI equivalence test
 * (cli/tests/package-equivalence.test.mjs) diffs CLI output against the
 * Configurator goldens, and configurator/tests/install-policy.test.mjs asserts
 * the two lists stay the same — change them together.
 *
 * AIOStreams generates the Library addon from the enabled services and rejects
 * the whole save when none can back it ("Library requires at least one usable
 * service"). These are the service ids upstream's LibraryPreset can use at the
 * pinned ref (v2.34.0 / e694b6a): the StremThru services plus nzbdav,
 * altmount, stremthru_newz and aiostreams. EasyNews, Seedr, Debridio, putio
 * and stremio_nntp are NOT library-capable.
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

/** True when at least one enabled service can back a Library preset. */
export function hasLibraryCapableService(services) {
  return (Array.isArray(services) ? services : []).some(
    service => service && service.enabled !== false && LIBRARY_CAPABLE.has(service.id),
  );
}
