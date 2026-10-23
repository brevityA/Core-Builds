/**
 * PenguPlay as an HTTP backup source (v3.19).
 *
 * The preset needs a personal manifest URL from a pengu.uk account, and AIOStreams
 * refuses a save unless that URL is http(s) and ends in /manifest.json. So the
 * generators emit it only with such a URL, serving streams only, after every other
 * stream source so it fills gaps instead of leading.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { generateTemplate } from '../../packages/core/src/generate-template.js';
import { OPTIONAL_SCRAPER_DEFS, penguplayPreset, withPenguplay } from '../src/data/scrapers.js';
import * as coreScrapers from '../../packages/core/src/scrapers.js';
import { PROVIDER_CREDENTIALS } from '../src/data/credentials.js';

const URL_OK = 'https://pengu.example/u/demo4u/manifest.json';
const build = (extra = {}) => generateTemplate({ service: 'torbox-pro', optionalScrapers: ['penguplay'], credentials: { penguplay: URL_OK }, ...extra }, {}).config.presets;
const isStream = p => [...(p.resources || []), ...(p.options?.resources || [])].includes('stream');

test('a valid manifest URL emits a stream-only PenguPlay after the last stream source', () => {
  for (const outputProfile of ['advanced', 'stable', 'balanced', 'labs']) {
    const presets = build({ outputProfile });
    const at = presets.findIndex(p => p.type === 'penguplay');
    assert.ok(at >= 0, `${outputProfile}: PenguPlay kept`);
    const pengu = presets[at];
    assert.equal(pengu.options.manifestUrl, URL_OK);
    assert.deepEqual(pengu.options.resources, ['stream']);
    assert.ok(pengu.options.timeout > 0);
    assert.equal(presets.slice(at + 1).filter(isStream).length, 0, `${outputProfile}: nothing streams after the backup`);
    assert.equal(presets.filter(p => p.type === 'penguplay').length, 1);
  }
});

test('no URL, or one AIOStreams would refuse, emits nothing', () => {
  for (const url of ['', '   ', 'pengu.uk', 'ftp://pengu.example/manifest.json', 'https://pengu.example/configure', undefined]) {
    assert.equal(penguplayPreset(url), null, String(url));
    assert.ok(!build({ credentials: { penguplay: url } }).some(p => p.type === 'penguplay'), String(url));
  }
  assert.ok(!generateTemplate({ service: 'torbox-pro', credentials: { penguplay: URL_OK } }, {}).config.presets.some(p => p.type === 'penguplay'), 'not selected');
});

test('withPenguplay leaves a list that already has one alone', () => {
  const existing = [{ type: 'penguplay', instanceId: 'mine', options: { resources: ['stream'] } }];
  assert.equal(withPenguplay(existing, ['penguplay'], URL_OK), existing);
});

test('the toggle collects the URL, and the CLI shares the same definition', () => {
  const def = OPTIONAL_SCRAPER_DEFS.find(d => d.id === 'penguplay');
  assert.equal(def.presetType, 'penguplay');
  assert.ok(PROVIDER_CREDENTIALS[def.credKey], 'a credential field exists for the manifest URL');
  assert.deepEqual(coreScrapers.OPTIONAL_SCRAPER_DEFS.find(d => d.id === 'penguplay'), def);
  assert.deepEqual(coreScrapers.penguplayPreset(URL_OK), penguplayPreset(URL_OK));
});

test('an imported PenguPlay is switched off when its URL would be refused, and takes an edited URL', async () => {
  const { mergeImportedPresets, importedSourceState } = await import('../src/core/template-update-policy.js');
  const imported = [{ type: 'penguplay', instanceId: 'pengu-imp', enabled: true, options: { name: 'PenguPlay', manifestUrl: URL_OK, timeout: 7000 } }];
  assert.equal(importedSourceState({ presets: imported }).creds.penguplay, URL_OK, 'the imported URL reaches the field');
  const ctx = creds => ({ optionalScrapers: ['penguplay'], subtitleAddons: [], creds });
  const kept = mergeImportedPresets([], imported, ctx({ penguplay: URL_OK })).find(p => p.type === 'penguplay');
  assert.equal(kept.enabled, true);
  const broken = mergeImportedPresets([], imported, ctx({ penguplay: 'https://pengu.example/configure' })).find(p => p.type === 'penguplay');
  assert.equal(broken.enabled, false, 'AIOStreams would refuse the save');
});
