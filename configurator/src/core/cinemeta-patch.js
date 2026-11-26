// Cinemeta patch, done in the browser on the user's own Stremio addon collection.
//
// Stremio keeps each installed addon's manifest inside the account's collection,
// so hiding Cinemeta's rows or search is a change to that copy, written back with
// AddonCollectionSet. This is what Cinebye does client-side; it has no server API
// (`/api/patch` is a 404), which is why the old Full Stack step never patched.
//
// Kept on purpose: Cinemeta's `last-videos` and `calendar-videos` catalogs (they
// feed Stremio's notifications and calendar) and, unless asked, its `meta`
// resource, so a title still opens if the metadata addon is unreachable.

export const CINEMETA_PATCHES = Object.freeze(['removeSearch', 'removeCatalogs', 'removeMeta']);
export const DEFAULT_CINEMETA_PATCHES = Object.freeze(['removeSearch', 'removeCatalogs']);
export const CINEMETA_MANIFEST_URL = 'https://v3-cinemeta.strem.io/manifest.json';

const BOARD_CATALOGS = new Set(['top', 'year', 'imdbRating']);
const SEARCH_ONLY_IDS = new Set(['cinemeta.search']);

export function isCinemeta(addon) {
  if (!addon || typeof addon !== 'object') return false;
  if (addon.manifest?.name === 'Cinemeta') return true;
  return typeof addon.transportUrl === 'string' && /^https?:\/\/v3-cinemeta\.strem\.io\//.test(addon.transportUrl);
}

const extraNames = c => (Array.isArray(c.extra) ? c.extra.map(e => e?.name) : []).concat(Array.isArray(c.extraSupported) ? c.extraSupported : []);
const hasSearch = c => extraNames(c).includes('search');

function withoutSearch(c) {
  const out = { ...c };
  if (Array.isArray(c.extra)) out.extra = c.extra.filter(e => e?.name !== 'search');
  if (Array.isArray(c.extraSupported)) out.extraSupported = c.extraSupported.filter(n => n !== 'search');
  if (Array.isArray(c.extraRequired)) out.extraRequired = c.extraRequired.filter(n => n !== 'search');
  return out;
}

// A catalog whose search extra is required only answers searches: it drops off the board.
function searchOnly(c) {
  const out = { ...c };
  if (Array.isArray(c.extra)) out.extra = c.extra.map(e => (e?.name === 'search' ? { ...e, isRequired: true } : e));
  const req = Array.isArray(c.extraRequired) ? c.extraRequired.filter(n => n !== 'search') : [];
  out.extraRequired = [...req, 'search'];
  return out;
}

/** Returns a patched copy of a Cinemeta manifest. Unknown patch names are ignored. */
export function patchCinemetaManifest(manifest, patches = DEFAULT_CINEMETA_PATCHES) {
  const want = new Set((patches || []).filter(p => CINEMETA_PATCHES.includes(p)));
  const m = { ...manifest };
  let catalogs = Array.isArray(manifest.catalogs) ? manifest.catalogs.slice() : [];
  if (want.has('removeSearch')) {
    catalogs = catalogs.filter(c => !SEARCH_ONLY_IDS.has(c.id)).map(c => (BOARD_CATALOGS.has(c.id) && hasSearch(c) ? withoutSearch(c) : c));
  }
  if (want.has('removeCatalogs')) {
    catalogs = catalogs.flatMap(c => {
      if (!BOARD_CATALOGS.has(c.id)) return [c];
      // Search still wanted: keep the catalog that carries it, as search only.
      if (!want.has('removeSearch') && hasSearch(c)) return [searchOnly(c)];
      return [];
    });
  }
  m.catalogs = catalogs;
  if (want.has('removeMeta') && Array.isArray(manifest.resources)) {
    m.resources = manifest.resources.filter(r => (typeof r === 'string' ? r : r?.name) !== 'meta');
  }
  return m;
}

/**
 * Patches Cinemeta inside a Stremio addon collection.
 * Returns { addons, patched, reason } — `addons` is a new array; the input is not changed.
 */
export function patchCinemetaInCollection(addons, patches = DEFAULT_CINEMETA_PATCHES) {
  if (!Array.isArray(addons)) return { addons, patched: false, reason: 'no-collection' };
  const idx = addons.findIndex(isCinemeta);
  if (idx < 0) return { addons, patched: false, reason: 'not-installed' };
  const entry = addons[idx];
  if (!entry.manifest || typeof entry.manifest !== 'object') return { addons, patched: false, reason: 'no-manifest' };
  const manifest = patchCinemetaManifest(entry.manifest, patches);
  const next = addons.slice();
  next[idx] = { ...entry, manifest };
  return { addons: next, patched: true, reason: 'ok' };
}

/** Puts back the original Cinemeta manifest (fetched from CINEMETA_MANIFEST_URL by the caller). */
export function resetCinemetaInCollection(addons, originalManifest) {
  if (!Array.isArray(addons)) return { addons, patched: false, reason: 'no-collection' };
  const idx = addons.findIndex(isCinemeta);
  if (idx < 0) return { addons, patched: false, reason: 'not-installed' };
  if (!originalManifest || originalManifest.name !== 'Cinemeta') return { addons, patched: false, reason: 'no-manifest' };
  const next = addons.slice();
  next[idx] = { ...addons[idx], manifest: originalManifest };
  return { addons: next, patched: true, reason: 'ok' };
}

// ── AIOMetadata ──
export const AIOMETADATA_BASE = 'https://aiometadata.elfhosted.com';

/** A configured AIOMetadata install: `<host>/stremio/<id>[/<config>]/manifest.json`. */
export function isConfiguredAioMetadata(addon) {
  const u = addon?.transportUrl;
  if (typeof u !== 'string') return false;
  if (addon.manifest?.id && addon.manifest.id !== 'com.aio.metadata') return false;
  // Current AIOMetadata serves /stremio/<id>/manifest.json; older installs carry a second segment.
  return /\/stremio\/[^/]+(?:\/[^/]+)?\/manifest\.json$/.test(u) && (addon.manifest?.id === 'com.aio.metadata' || /aiometadata/i.test(u));
}

/** The bare manifest earlier versions installed: no config, so no catalogs and no metadata. */
export function isBareAioMetadata(addon) {
  return addon?.transportUrl === `${AIOMETADATA_BASE}/manifest.json`;
}

/**
 * The smallest config AIOMetadata's own configure page would save: its defaults for
 * language, providers, art and API keys (every key present, empty unless given, as
 * configure/src/contexts/ConfigContext.tsx sends them). `catalogs` is left out so the
 * addon serves its default catalogs and search. ElfHosted supplies TMDB and TVDB keys.
 * An RPDB key turns on RPDB rating posters; an MDBList key enables its ratings and lists.
 */
export function aioMetadataDefaultConfig({ language = 'en-US', mdblistKey = '', rpdbKey = '' } = {}) {
  const art = { poster: 'meta', background: 'meta', logo: 'meta' };
  const clean = v => (typeof v === 'string' ? v.trim() : '');
  const rpdb = clean(rpdbKey);
  return {
    language,
    providers: { movie: 'tmdb', series: 'tvdb', anime: 'mal', anime_id_provider: 'imdb', forceAnimeForDetectedImdb: false },
    artProviders: { movie: { ...art }, series: { ...art }, anime: { poster: 'meta', background: 'imdb', logo: 'imdb' }, englishArtOnly: false, originalLangFallback: false },
    apiKeys: { gemini: '', tmdb: '', tvdb: '', fanart: '', rpdb, topPoster: '', mdblist: clean(mdblistKey), openrouter: '', publicmetadb: '' },
    posterRatingProvider: rpdb ? 'rpdb' : 'none',
  };
}

/** Keeps only known patch names, in a fixed order. */
export function sanitizeCinemetaPatches(value) {
  const list = Array.isArray(value) ? value : [];
  return CINEMETA_PATCHES.filter(p => list.includes(p));
}
