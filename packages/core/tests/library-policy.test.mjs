/**
 * Library-preset usability — packages/core half of the 2026-09-06 audit fix.
 * The CLI golden-equivalence test diffs full templates against the
 * Configurator fixtures; this file pins the rule itself.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { generateTemplate } from '../src/generate-template.js';
import { LIBRARY_CAPABLE_SERVICE_IDS, hasLibraryCapableService } from '../src/library-policy.js';

const base = {
  device: 'generic',
  resolution: '1080p',
  content: 'all',
  formatter: 'family-v4',
};

test('EasyNews is not library-capable; debrid services are', () => {
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('easynews'));
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('seedr'));
  for (const id of ['torbox', 'realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'offcloud', 'easydebrid', 'pikpak']) {
    assert.ok(LIBRARY_CAPABLE_SERVICE_IDS.includes(id), id);
  }
  // the usenet route's aiostreams service keeps the library usable
  assert.ok(hasLibraryCapableService([{ id: 'easynews', enabled: true }, { id: 'stremio_nntp', enabled: true }, { id: 'aiostreams', enabled: true }]));
});

test('generateTemplate: EasyNews-only emits no library preset; TorBox keeps it', () => {
  const easy = generateTemplate({ ...base, service: 'easynews', multiServices: ['easynews'] });
  assert.ok(!(easy.config.presets || []).some(p => p.type === 'library'), 'EasyNews-only must not carry a Library preset');
  const tor = generateTemplate({ ...base, service: 'torbox-pro', multiServices: ['torbox-pro'] });
  assert.ok((tor.config.presets || []).some(p => p.type === 'library' && p.enabled !== false), 'TorBox keeps the Library addon');
});

test('generateTemplate: EasyNews + a debrid service keeps the library', () => {
  const tpl = generateTemplate({ ...base, service: 'multi', multiServices: ['easynews', 'alldebrid'] });
  assert.ok((tpl.config.presets || []).some(p => p.type === 'library' && p.enabled !== false));
});

test('the configurator copy of the list is identical (drift alarm across the two homes)', async () => {
  const configurator = await readFile(new URL('../../../configurator/src/core/install-policy.js', import.meta.url), 'utf8');
  const match = configurator.match(/LIBRARY_CAPABLE_SERVICE_IDS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(match, 'configurator list not found');
  const there = [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
  assert.deepEqual(there, [...LIBRARY_CAPABLE_SERVICE_IDS].sort(), 'the two lists must be changed together');
});
