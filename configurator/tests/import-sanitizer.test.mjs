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
