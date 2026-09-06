import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/generate-template.js';
import { LIBRARY_CAPABLE_SERVICES, hasLibraryCapableService } from '../src/addon-policy.js';

// The Library gate, host-truth side: AIOStreams' LibraryPreset.supportedServices
// (packages/core/src/presets/library.ts @ v2.34.0) decides whether a config
// can carry an enabled Library preset. EasyNews is NOT on that list ("The
// library requires at least one usable service to be configured"), so an
// EasyNews-only template must not emit Library, and adding a load-bearing
// debrid service must bring it back.

const BASE = {
  device: 'generic',
  resolution: '1080p',
  architecture: 'standard',
  content: 'all',
  credentials: {},
};

test('library gate: the supported-services list mirrors the host contract', () => {
  assert.ok(LIBRARY_CAPABLE_SERVICES.includes('torbox'), 'StremThru debrid services back the Library preset');
  assert.ok(LIBRARY_CAPABLE_SERVICES.includes('realdebrid'));
  assert.ok(LIBRARY_CAPABLE_SERVICES.includes('aiostreams'), 'built-in usenet engine backs the Library preset');
  assert.ok(!LIBRARY_CAPABLE_SERVICES.includes('easynews'), 'EasyNews can never back the Library preset');
  assert.ok(!hasLibraryCapableService(['easynews']));
  assert.ok(hasLibraryCapableService(['easynews', 'torbox']));
});

test('EasyNews-only emits no Library preset', () => {
  const template = generateTemplate({ ...BASE, service: 'easynews', multiServices: [] });
  const library = (template.config.presets || []).find(p => p.type === 'library');
  assert.equal(library, undefined, 'Library must be omitted — the host 400s the save otherwise');
  const easynews = (template.config.services || []).find(s => s.id === 'easynews');
  assert.ok(easynews?.enabled, 'the EasyNews service itself must stay enabled');
});

test('EasyNews + a debrid service keeps the Library preset', () => {
  const template = generateTemplate({ ...BASE, service: 'multi', multiServices: ['easynews', 'torbox-pro'], credentials: { torbox: 'test-key' } });
  const library = (template.config.presets || []).find(p => p.type === 'library');
  assert.ok(library, 'Library must be emitted — TorBox is a usable service');
  assert.notEqual(library.enabled, false);
});

test('the pure-usenet lane keeps Library via the built-in usenet engine', () => {
  const template = generateTemplate({ ...BASE, service: 'usenet', multiServices: [] });
  const library = (template.config.presets || []).find(p => p.type === 'library');
  assert.ok(library, 'the aiostreams/nntp usenet engine qualifies, so Library must be emitted');
});

test('the P2P lane emits no Library preset', () => {
  const template = generateTemplate({ ...BASE, service: 'p2p', multiServices: [] });
  const library = (template.config.presets || []).find(p => p.type === 'library');
  assert.equal(library, undefined);
});
