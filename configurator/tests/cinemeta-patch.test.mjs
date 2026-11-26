import test from 'node:test';
import assert from 'node:assert/strict';
import {
  patchCinemetaManifest, patchCinemetaInCollection, resetCinemetaInCollection, isCinemeta,
  isConfiguredAioMetadata, isBareAioMetadata, aioMetadataDefaultConfig, sanitizeCinemetaPatches,
} from '../src/core/cinemeta-patch.js';

// Shape of the live v3-cinemeta.strem.io manifest (genre options trimmed).
const manifest = () => ({
  id: 'com.linvo.cinemeta', name: 'Cinemeta', resources: ['catalog', 'meta', 'addon_catalog'],
  catalogs: [
    { type: 'movie', id: 'top', extra: [{ name: 'genre', options: ['Action'] }, { name: 'search' }, { name: 'skip' }], extraSupported: ['search', 'genre', 'skip'] },
    { type: 'series', id: 'top', extra: [{ name: 'genre', options: ['Action'] }, { name: 'search' }, { name: 'skip' }], extraSupported: ['search', 'genre', 'skip'] },
    { type: 'movie', id: 'year', extra: [{ name: 'genre', options: ['2026'], isRequired: true }, { name: 'skip' }], extraRequired: ['genre'], extraSupported: ['genre', 'skip'] },
    { type: 'movie', id: 'imdbRating', extra: [{ name: 'genre', options: ['Action'] }, { name: 'skip' }], extraSupported: ['genre', 'skip'] },
    { type: 'series', id: 'last-videos', extra: [{ name: 'lastVideosIds', isRequired: true }], extraRequired: ['lastVideosIds'] },
    { type: 'series', id: 'calendar-videos', extra: [{ name: 'calendarVideosIds', isRequired: true }], extraRequired: ['calendarVideosIds'] },
  ],
});
const ids = m => m.catalogs.map(c => `${c.type}/${c.id}`);

test('search and catalogs: only notifications and calendar remain', () => {
  const m = patchCinemetaManifest(manifest(), ['removeSearch', 'removeCatalogs']);
  assert.deepEqual(ids(m), ['series/last-videos', 'series/calendar-videos']);
  assert.deepEqual(m.resources, ['catalog', 'meta', 'addon_catalog']);
});

test('search only: board rows stay, the search extra goes', () => {
  const m = patchCinemetaManifest(manifest(), ['removeSearch']);
  assert.equal(m.catalogs.length, 6);
  const top = m.catalogs[0];
  assert.ok(!top.extra.some(e => e.name === 'search'));
  assert.ok(!top.extraSupported.includes('search'));
});

test('catalogs only: search survives as a search-only catalog', () => {
  const m = patchCinemetaManifest(manifest(), ['removeCatalogs']);
  assert.deepEqual(ids(m), ['movie/top', 'series/top', 'series/last-videos', 'series/calendar-videos']);
  for (const c of m.catalogs.slice(0, 2)) {
    assert.equal(c.extra.find(e => e.name === 'search').isRequired, true);
    assert.deepEqual(c.extraRequired, ['search']);
  }
});

test('metadata: meta resource removed only when asked', () => {
  assert.deepEqual(patchCinemetaManifest(manifest(), ['removeMeta']).resources, ['catalog', 'addon_catalog']);
});

test('the input manifest is never changed', () => {
  const m = manifest(); const before = JSON.stringify(m);
  patchCinemetaManifest(m, ['removeSearch', 'removeCatalogs', 'removeMeta']);
  assert.equal(JSON.stringify(m), before);
});

test('collection patch finds Cinemeta and keeps every other addon as it was', () => {
  const other = { transportUrl: 'https://x/manifest.json' };
  const addons = [other, { transportUrl: 'https://v3-cinemeta.strem.io/manifest.json', flags: { protected: true }, manifest: manifest() }];
  const r = patchCinemetaInCollection(addons, ['removeCatalogs', 'removeSearch']);
  assert.equal(r.patched, true);
  assert.equal(r.addons[0], other);
  assert.deepEqual(r.addons[1].flags, { protected: true });
  assert.equal(addons[1].manifest.catalogs.length, 6);
  assert.equal(patchCinemetaInCollection([other]).reason, 'not-installed');
  assert.equal(patchCinemetaInCollection([{ transportUrl: 'https://v3-cinemeta.strem.io/manifest.json' }]).reason, 'no-manifest');
});

test('reset puts back the original manifest', () => {
  const patched = patchCinemetaInCollection([{ transportUrl: 'https://v3-cinemeta.strem.io/manifest.json', manifest: manifest() }]).addons;
  const r = resetCinemetaInCollection(patched, manifest());
  assert.equal(r.addons[0].manifest.catalogs.length, 6);
  assert.equal(resetCinemetaInCollection(patched, { name: 'Other' }).patched, false);
  // Removed from the account: added back at the end, everything else in place.
  const other = { transportUrl: 'https://x/manifest.json' };
  const back = resetCinemetaInCollection([other], manifest());
  assert.equal(back.reason, 'added');
  assert.equal(back.addons[0], other);
  assert.deepEqual(back.addons[1], { transportUrl: 'https://v3-cinemeta.strem.io/manifest.json', transportName: 'http', flags: {}, manifest: manifest() });
  assert.deepEqual(resetCinemetaInCollection([other], null).addons, [other]);
});

test('AIOMetadata detection tells a configured install from the empty bare manifest', () => {
  assert.equal(isBareAioMetadata({ transportUrl: 'https://aiometadata.elfhosted.com/manifest.json' }), true);
  assert.equal(isConfiguredAioMetadata({ transportUrl: 'https://aiometadata.elfhosted.com/manifest.json' }), false);
  assert.equal(isConfiguredAioMetadata({ transportUrl: 'https://aiometadata.elfhosted.com/stremio/abc/manifest.json' }), true);
  assert.equal(isConfiguredAioMetadata({ transportUrl: 'https://meta.example/stremio/abc/manifest.json', manifest: { id: 'com.aio.metadata' } }), true);
  assert.equal(isConfiguredAioMetadata({ transportUrl: 'https://aio.elfhosted.com/stremio/u/p/manifest.json', manifest: { id: 'com.aiostreams.viren070' } }), false);
  assert.equal(isConfiguredAioMetadata({ transportUrl: 'https://aiometadata.elfhosted.com/stremio/abc/eyJjb25m/manifest.json', manifest: { id: 'com.aio.metadata' } }), true, 'older two-segment installs');
  assert.equal(isCinemeta({ manifest: { name: 'Cinemeta' } }), true);
});

test('the AIOMetadata config is the configure page defaults, with no keys and no catalogs', () => {
  const c = aioMetadataDefaultConfig();
  assert.equal(c.language, 'en-US');
  assert.equal(c.providers.series, 'tvdb');
  assert.equal(c.catalogs, undefined);
  // Every key present and empty, as AIOMetadata's configure page sends them.
  assert.deepEqual(Object.values(c.apiKeys), Array(Object.keys(c.apiKeys).length).fill(''));
  assert.equal(c.posterRatingProvider, 'none');
  assert.ok(!JSON.stringify(c.artProviders).includes('fanart'), 'fanart art would make a fanart key required');
});

test('optional MDBList and RPDB keys go where AIOMetadata reads them', () => {
  const c = aioMetadataDefaultConfig({ mdblistKey: ' mdb-1 ', rpdbKey: 'rp-1' });
  assert.equal(c.apiKeys.mdblist, 'mdb-1');
  assert.equal(c.apiKeys.rpdb, 'rp-1');
  assert.equal(c.posterRatingProvider, 'rpdb');
  assert.deepEqual(sanitizeCinemetaPatches(['removeMeta', 'bogus', 'removeSearch']), ['removeSearch', 'removeMeta']);
  assert.deepEqual(sanitizeCinemetaPatches('x'), []);
});
