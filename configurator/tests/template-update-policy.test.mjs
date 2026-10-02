import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUpdateTemplate, importedSourceState, mergeImportedPresets, inheritUpdateCredentials } from '../src/core/template-update-policy.js';

const source = (type, instanceId, options = {}, enabled = true) => ({ type, instanceId, enabled, resources: ['stream'], options: { name: instanceId, timeout: 5000, ...options } });

for (const wrapper of [config => config, config => ({ config }), config => [{ config }]]) {
  test('import accepts a config, template, or single-template export without mutating it', () => {
    const input = wrapper({ services: [{ id: 'torbox', enabled: true }], presets: [source('meteor', 'custom-meteor')] });
    const before = structuredClone(input);
    const result = normalizeUpdateTemplate(input);
    assert.equal(result.config.presets[0].instanceId, 'custom-meteor');
    result.config.presets[0].options.name = 'changed';
    assert.deepEqual(input, before);
  });
}

test('malformed and ambiguous imports fail with actionable errors', () => {
  for (const value of [null, 5, 'no', {}, { config: null }, { config: { services: {} } }]) assert.throws(() => normalizeUpdateTemplate(value), TypeError);
  assert.throws(() => normalizeUpdateTemplate([]), /Choose one template/);
  assert.throws(() => normalizeUpdateTemplate([{ config: { presets: [] } }, { config: { presets: [] } }]), /Choose one template/);
  assert.throws(() => normalizeUpdateTemplate({ presets: [source('meteor', 'same'), source('comet', 'same')] }), /Duplicate preset instanceId/);
  assert.throws(() => normalizeUpdateTemplate({ presets: [{ type: 'meteor', options: {} }] }), /instanceId/);
});

test('optional imports detect keyless toggles and extract nested Newznab keys locally', () => {
  const state = importedSourceState({ presets: [
    source('webstreamr', 'web'), source('zilean', 'zilean'),
    source('newznab', 'slug', { api: { url: 'https://drunkenslug.com/api/', apiKey: 'LOCAL-SLUG' } }),
    source('debridio', 'db', { debridioApiKey: 'LOCAL-DEBRIDIO' }),
  ] });
  // Zilean is not a toggle since v3.14 (always included with a torrent debrid), so it
  // is retained as an imported preset rather than reported as an optional scraper.
  assert.deepEqual(state.optionalScrapers, ['webstreamr', 'drunkenslug']);
  assert.equal(state.creds.drunkenslug, 'LOCAL-SLUG');
  assert.equal(state.creds.debridio, 'LOCAL-DEBRIDIO');
});

test('an arbitrary URL substring is not mistaken for a known indexer', () => {
  const state = importedSourceState({ presets: [source('newznab', 'custom', { api: { url: 'https://evil.invalid/path/https://drunkenslug.com/api', apiKey: 'LOCAL' } })] });
  assert.deepEqual(state.optionalScrapers, []);
  assert.equal(state._importedPresets[0].options.api.apiKey, 'LOCAL');
});

test('multiple custom instances retain their IDs, options, credentials and timeouts', () => {
  const imported = [source('newznab', 'one', { api: { url: 'https://one.invalid/api', apiKey: 'ONE' } }), source('newznab', 'two', { api: { url: 'https://two.invalid/api', apiKey: 'TWO' } })];
  const generated = [source('newznab', 'canned', { api: { url: 'https://canned.invalid/api' } }), source('comet', 'comet')];
  const before = structuredClone(imported);
  const result = mergeImportedPresets(generated, imported);
  assert.deepEqual(result.slice(0, 2), imported);
  assert.deepEqual(result.map(p => p.instanceId), ['one', 'two', 'comet']);
  result[0].options.api.apiKey = 'changed';
  assert.deepEqual(imported, before);
});

test('an explicitly disabled source suppresses its generated replacement', () => {
  const result = mergeImportedPresets([source('meteor', 'canned')], [source('meteor', 'mine', {}, false)]);
  assert.equal(result.length, 1);
  assert.equal(result[0].enabled, false);
});

test('optional toggles disable imported sources and new toggles add a single generated instance', () => {
  const original = [source('webstreamr', 'mine')];
  assert.equal(mergeImportedPresets([], original, { optionalScrapers: [] })[0].enabled, false);
  const result = mergeImportedPresets([source('webstreamr', 'canned'), source('yastream', 'new')], original, { optionalScrapers: ['webstreamr', 'yastream'] });
  assert.deepEqual(result.map(p => p.instanceId), ['mine', 'new']);
});

test('disabled duplicate endpoints are not inadvertently enabled by a shared toggle', () => {
  const result = mergeImportedPresets([], [source('webstreamr', 'active'), source('webstreamr', 'disabled', {}, false)], { optionalScrapers: ['webstreamr'] });
  assert.equal(result[0].enabled, true);
  assert.equal(result[1].enabled, false);
});

test('a re-entered known source key replaces its imported value only in the clone', () => {
  const original = [source('debridio', 'db', { debridioApiKey: 'OLD' })];
  const result = mergeImportedPresets([], original, { creds: { debridio: 'NEW' } });
  assert.equal(result[0].options.debridioApiKey, 'NEW');
  assert.equal(original[0].options.debridioApiKey, 'OLD');
});

test('distinct credentials on same-provider instances survive without an explicit key edit', () => {
  const presets = [
    source('newznab', 'slug-one', { api: { url: 'https://drunkenslug.com/api', apiKey: 'ONE' } }),
    source('newznab', 'slug-two', { api: { url: 'https://drunkenslug.com/api', apiKey: 'TWO' } }),
    source('debridio', 'db-off', { debridioApiKey: 'DISABLED-KEY' }, false),
  ];
  const state = importedSourceState({ presets });
  const result = mergeImportedPresets([], presets, { ...state, creds: { debridio: '', ...state.creds } });
  assert.deepEqual(result, presets);
});

test('NZBHydra URL and API key remain separate and only intentional changes replace them', () => {
  const presets = [source('nzbhydra', 'hydra', { api: { url: 'https://hydra.invalid/api', apiKey: 'HYDRA-KEY' } })];
  const state = importedSourceState({ presets });
  assert.deepEqual(mergeImportedPresets([], presets, state), presets);
  const edited = mergeImportedPresets([], presets, { ...state, creds: { nzbhydra: 'https://other.invalid/api', nzbhydraApiKey: 'NEW-KEY' } });
  assert.equal(edited[0].options.api.url, 'https://other.invalid/api');
  assert.equal(edited[0].options.api.apiKey, 'NEW-KEY');
});

test('Debrider and imported Jackett/Prowlarr credentials use upstream option names', () => {
  const presets = [source('debrider', 'debrider', { apiKey: 'DEBRIDER' }), source('jackett', 'jackett', { jackettApiKey: 'JACKETT' }), source('prowlarr', 'prowlarr', { prowlarrApiKey: 'PROWLARR' })];
  const state = importedSourceState({ presets });
  assert.equal(state.creds.debrider, 'DEBRIDER');
  assert.equal(state.creds.jackett, 'JACKETT');
  assert.equal(state.creds.prowlarr, 'PROWLARR');
  assert.deepEqual(mergeImportedPresets([], presets, state), presets);
});

test('explicitly adding a known indexer does not discard custom Newznab instances', () => {
  const original = [source('newznab', 'one', { api: { url: 'https://one.invalid/api', apiKey: 'ONE' } })];
  const added = source('newznab', 'slug', { api: { url: 'https://drunkenslug.com/api', apiKey: 'SLUG' } });
  const result = mergeImportedPresets([added], original, { optionalScrapers: ['drunkenslug'], creds: { drunkenslug: 'SLUG' } });
  assert.deepEqual(result, [...original, added]);
});

test('explicit service, catalog and subtitle deselection also disables imported instances', () => {
  const presets = [source('debridio', 'db', { debridioApiKey: 'LOCAL' }), source('tmdb-addon', 'catalog'), source('subdl', 'subs', { subDlApiKey: 'SUBS', language: ['EN'] })];
  const state = importedSourceState({ presets });
  const result = mergeImportedPresets([], presets, { ...state, multiServices: ['torbox-pro'], catalogs: [], subtitleAddons: [] });
  assert.ok(result.every(p => p.enabled === false));
  assert.equal(result[0].options.debridioApiKey, 'LOCAL');
  assert.equal(result[2].options.subDlApiKey, 'SUBS');
});

test('unchanged shared selections do not enable disabled duplicate service instances', () => {
  const presets = [source('debridio', 'db-one', { debridioApiKey: 'ONE' }), source('debridio', 'db-off', { debridioApiKey: 'OFF' }, false)];
  const state = importedSourceState({ presets });
  const result = mergeImportedPresets([], presets, { ...state, multiServices: ['debridio'] });
  assert.deepEqual(result, presets);
});

test('explicitly clearing a required preset key disables it instead of exporting a broken enabled source', () => {
  const presets = [source('debridio', 'db', { debridioApiKey: 'LOCAL' })];
  const result = mergeImportedPresets([], presets, { creds: { debridio: '' }, multiServices: ['debridio'] });
  assert.equal(result[0].enabled, false);
  assert.equal(result[0].options.debridioApiKey, '');
  assert.equal(presets[0].options.debridioApiKey, 'LOCAL');
});

test('explicitly clearing known Newznab keys disables those instances without changing the import', () => {
  for (const [credKey, url] of [
    ['drunkenslug', 'https://drunkenslug.com/api'],
    ['nzbgeek', 'https://api.nzbgeek.info/api'],
  ]) {
    const presets = [source('newznab', 'indexer', { api: { url, apiKey: 'LOCAL-INDEXER' } })];
    const state = importedSourceState({ presets });
    const result = mergeImportedPresets([], presets, { ...state, creds: { ...state.creds, [credKey]: '' } });
    assert.equal(result[0].enabled, false, credKey);
    assert.equal(result[0].options.api.apiKey, '');
    assert.equal(presets[0].options.api.apiKey, 'LOCAL-INDEXER');
  }
});

test('cleared NZBHydra URL or previously supplied key disables it, but an originally keyless endpoint is preserved', () => {
  const presets = [source('nzbhydra', 'hydra', { api: { url: 'https://hydra.invalid/api', apiKey: 'LOCAL-HYDRA' } })];
  const state = importedSourceState({ presets });
  for (const key of ['nzbhydra', 'nzbhydraApiKey']) {
    const result = mergeImportedPresets([], presets, { ...state, creds: { ...state.creds, [key]: '' } });
    assert.equal(result[0].enabled, false, key);
    assert.equal(result[0].options.api[key === 'nzbhydra' ? 'url' : 'apiKey'], '');
    assert.deepEqual(presets[0].options.api, { url: 'https://hydra.invalid/api', apiKey: 'LOCAL-HYDRA' });
  }
  const keyless = [source('nzbhydra', 'public-hydra', { api: { url: 'https://public.invalid/api', apiKey: '' } })];
  assert.deepEqual(mergeImportedPresets([], keyless, importedSourceState({ presets: keyless })), keyless);
});

test('a saved key is never carried to an imported endpoint-bound preset at a new address', () => {
  // CodeRabbit (#777): an imported NZBHydra/Jackett/Prowlarr at a new URL with a blank
  // key inherited the previous setup's key, which a private install would send there.
  const saved = { nzbhydra: 'https://old-hydra.invalid', nzbhydraApiKey: 'OLD-KEY', jackettUrl: 'https://old-jackett.invalid', jackett: 'OLD-J', prowlarrUrl: 'https://p.invalid', prowlarr: 'P-KEY' };
  const imported = { nzbhydra: 'https://new-hydra.invalid', nzbhydraApiKey: '', jackettUrl: 'https://new-jackett.invalid', jackett: '', prowlarrUrl: 'https://p.invalid/', prowlarr: '' };
  const creds = inheritUpdateCredentials(saved, imported);
  assert.equal(creds.nzbhydra, 'https://new-hydra.invalid');
  assert.equal(creds.nzbhydraApiKey, '', 'old NZBHydra key must not follow a new URL');
  assert.equal(creds.jackett, '', 'old Jackett key must not follow a new URL');
  assert.equal(creds.prowlarr, 'P-KEY', 'same endpoint keeps its key');

  const presets = [
    source('nzbhydra', 'hydra', { api: { url: 'https://new-hydra.invalid', apiKey: '' } }),
    source('jackett', 'jk', { jackettUrl: 'https://new-jackett.invalid', jackettApiKey: '' }),
  ];
  // Even if a caller passes the stale saved credentials straight through, a key is
  // only ever written next to the URL it was entered for.
  const merged = mergeImportedPresets([], presets, { creds: saved });
  const hydra = merged.find(p => p.type === 'nzbhydra').options.api;
  assert.ok(hydra.apiKey === '' || hydra.url === saved.nzbhydra, `NZBHydra key ended up next to ${hydra.url}`);
  assert.equal(merged.find(p => p.type === 'jackett').options.jackettApiKey, '', 'merge must not write a key for another URL');
  assert.equal(merged.find(p => p.type === 'jackett').options.jackettUrl, 'https://new-jackett.invalid');
});
