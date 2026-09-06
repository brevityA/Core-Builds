/**
 * "Library only when a service actually backs it" contract.
 *
 * AIOStreams' LibraryPreset.supportedServices (packages/core/src/presets/
 * library.ts @ v2.34.0) rejects a config whose Library preset has no usable
 * service with "The library requires at least one usable service to be
 * configured". EasyNews is not a library service, and a seeded / credential-
 * free selection has none either. The emission now consults
 * hasLibraryCapableService() so the preset is dropped (via addonPolicy's
 * enabled:false semantics) instead of killing the install on save.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { addonPolicy, assertAddonPolicy, hasLibraryCapableService, LIBRARY_CAPABLE_SERVICES } from '../src/core/addon-policy.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('easynews alone cannot drive the Library preset', () => {
  assert.equal(hasLibraryCapableService(['easynews']), false);
  assert.equal(hasLibraryCapableService(['easynews', 'stremio_nntp']), false);
});

test('debrid services and the usenet engine can drive it', () => {
  assert.equal(hasLibraryCapableService(['torbox']), true);
  assert.equal(hasLibraryCapableService(['realdebrid']), true);
  assert.equal(hasLibraryCapableService(['easynews', 'torbox']), true, 'easynews + a debrid keeps the library');
  assert.equal(hasLibraryCapableService(['aiostreams']), true, 'the usenet lane service qualifies');
});

test('an empty service set has no library', () => {
  assert.equal(hasLibraryCapableService([]), false);
  assert.equal(hasLibraryCapableService(undefined), false);
  assert.equal(hasLibraryCapableService(['p2p2p']), false);
});

test('the upstream service list is not trimmed by accident', () => {
  // Mirrored from LibraryPreset.supportedServices @ v2.34.0 — every StremThru
  // service plus the usenet engines. If upstream grows the list, extend it
  // here deliberately.
  assert.deepEqual([...LIBRARY_CAPABLE_SERVICES].sort(), [
    'aiostreams', 'alldebrid', 'altmount', 'debrider', 'debridlink', 'easydebrid',
    'nzbdav', 'offcloud', 'pikpak', 'premiumize', 'realdebrid', 'stremthru_newz',
    'torbox', 'torrin',
  ]);
});

test('addonPolicy drops the disabled library preset out of the template', () => {
  const result = assertAddonPolicy(addonPolicy({}, [
    { type: 'library', instanceId: 'lib-1', enabled: false, options: { name: 'Library' } },
    { type: 'torrentio', instanceId: 'tio-1', enabled: true, options: { name: 'Torrentio' }, resources: ['stream'] },
  ]));
  assert.equal(result.presets.some(p => p.type === 'library'), false);
  assert.equal(result.presets.length, 1);
});

test('the main-lane library emission consults the service list, not just isP2P', () => {
  assert.match(
    app,
    /type:'library', instanceId:'lib-1', enabled:hasLibraryCapableService\(services\(\)\.map\(service => service\.id\)\)/,
    'app.js must gate the Library preset on enabled service ids (the old enabled:!isP2P broke easynews-only installs)'
  );
  assert.doesNotMatch(app, /instanceId:'lib-1', enabled:!isP2P/);
});
