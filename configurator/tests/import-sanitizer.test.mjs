import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTemplateForRemoteImport } from '../src/core/import-template.js';

function tplWith(presets, extraRoot = {}) {
  return { config: { presets, ...extraRoot } };
}

test('sanitize: enabled preset with stripped credential is disabled (debridioApiKey class rejection)', () => {
  const tpl = tplWith([
    { type: 'torrentio', instanceId: 'eff', enabled: true, options: { name: 'Torrentio', timeout: 10000 } },
    { type: 'debridio', instanceId: '994', enabled: true, options: { name: 'Debridio Scraper', timeout: 6500, resources: ['stream'], debridioApiKey: 'REAL-KEY-123' } },
  ]);
  const out = sanitizeTemplateForRemoteImport(tpl);
  const [tor, dbio] = out.config.presets;
  assert.equal(tor.enabled, true, 'untouched keyless preset stays enabled');
  assert.equal(dbio.enabled, false, 'preset that lost its key must ship disabled — otherwise the save is rejected (Brisk report)');
  assert.equal('debridioApiKey' in dbio.options, false, 'key never crosses the share link');
  assert.equal(dbio.options.name, 'Debridio Scraper');
});

test('sanitize: already-disabled keyed preset keeps its shape (minus the key)', () => {
  const tpl = tplWith([
    { type: 'debridio', instanceId: 'x', enabled: false, options: { name: 'Debridio Scraper', debridioApiKey: 'K' } },
  ]);
  const out = sanitizeTemplateForRemoteImport(tpl);
  assert.equal(out.config.presets[0].enabled, false);
  assert.equal('debridioApiKey' in out.config.presets[0].options, false);
});

test('sanitize: built-in public RPDB free-tier id survives (poster redirects keep working)', () => {
  const tpl = { config: { rpdbApiKey: 't0-free-rpdb', presets: [] } };
  const out = sanitizeTemplateForRemoteImport(tpl);
  assert.equal(out.config.rpdbApiKey, 't0-free-rpdb');
});

test('sanitize: real RPDB user key is stripped, services credentials blanked', () => {
  const tpl = { config: { rpdbApiKey: 'real-user-key', presets: [], services: [{ id: 'torbox', enabled: true, credentials: { apiKey: 'SECRET' } }] } };
  const out = sanitizeTemplateForRemoteImport(tpl);
  assert.equal(out.config.rpdbApiKey, undefined);
  assert.deepEqual(out.config.services[0].credentials, {});
  assert.equal(out.config.services[0].enabled, true, 'service rows are capability records, not shared secrets');
});

test('preserved installation URLs and URL credentials never reach public import links', () => {
  const template = tplWith([
    { type: 'custom', instanceId: 'custom', options: { manifestUrl: 'https://private.invalid/OPAQUE-PATH-KEY/manifest.json' } },
    { type: 'newznab', instanceId: 'nzb', enabled: true, options: { api: { url: 'https://user:USER-PASS@indexer.invalid/api?apiKey=QUERY-KEY' } } },
    { type: 'streamnzb', instanceId: 'snzb', enabled: true, options: { url: 'https://private.invalid/STREAM-PATH-KEY/manifest.json' } },
    { type: 'meteor', instanceId: 'safe', enabled: true, options: { url: 'https://meteor.invalid/public.json' } },
  ], { groups: { enabled: true, groupings: [{ name: 'Private', addons: ['custom', 'nzb', 'snzb'] }, { name: 'Public', addons: ['safe', 'nzb'] }] } });
  const before = structuredClone(template);
  const result = sanitizeTemplateForRemoteImport(template);
  assert.doesNotMatch(JSON.stringify(result), /OPAQUE-PATH-KEY|USER-PASS|QUERY-KEY|STREAM-PATH-KEY/);
  assert.deepEqual(result.config.presets.map(p => p.enabled), [false, false, false, true]);
  assert.equal(result.config.presets[3].options.url, 'https://meteor.invalid/public.json');
  assert.deepEqual(result.config.groups.groupings, [{ name: 'Public', addons: ['safe'] }]);
  assert.deepEqual(template, before);
});

test('groups disable when sharing removes the last usable source', () => {
  const template = tplWith([{ type: 'custom', instanceId: 'private', enabled: true, options: { manifestUrl: 'https://private.invalid/secret/manifest.json' } }], {
    groups: { enabled: true, groupings: [{ name: 'Only source', addons: ['private'] }] },
  });
  assert.deepEqual(sanitizeTemplateForRemoteImport(template).config.groups, { enabled: false, groupings: [] });
});

test('public import strips accessKey options and query credentials, disabling dependent sources', () => {
  const template = { config: { presets: [
    { type: 'custom', instanceId: 'access-key', enabled: true, options: { accessKey: 'PRIVATE-ACCESS', url: 'https://api.invalid/list?accessKey=PRIVATE-QUERY' } },
  ] } };
  const result = sanitizeTemplateForRemoteImport(template);
  assert.equal(result.config.presets[0].enabled, false);
  assert.equal(result.config.presets[0].options.url, '');
  assert.ok(!JSON.stringify(result).includes('PRIVATE-'));
  assert.equal(template.config.presets[0].options.accessKey, 'PRIVATE-ACCESS');
});

test('preset credentials objects are not mistaken for service capability rows', () => {
  const template = { config: { presets: [{ type: 'custom', instanceId: 'nested-creds', options: { credentials: { username: 'LOCAL-USER', password: 'LOCAL-PASSWORD' } } }] } };
  const result = sanitizeTemplateForRemoteImport(template);
  assert.deepEqual(result.config.presets[0].options.credentials, {});
  assert.equal(result.config.presets[0].enabled, false);
  assert.ok(!JSON.stringify(result).includes('LOCAL-'));
});
