/**
 * 2026-10-02 accuracy audit: every claim the configurator makes, and every
 * setting it emits, checked against upstream AIOStreams (main dd9a87c) and the
 * live /api/v1/status of all eight public hosts. Each test below pins one
 * finding that would otherwise make AIOStreams refuse a save, or make the UI
 * say something untrue.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OPTIONAL_SCRAPER_DEFS } from '../src/data/scrapers.js';
import { PROVIDER_CREDENTIALS, SERVICE_CREDENTIAL_FIELDS, serviceCredentials, serviceCredentialKeys } from '../src/data/credentials.js';
import { UPSTREAM_REMOVED_PRESET_IDS } from '../src/data/host-capabilities.js';
import { parseHostStatus, resolveHostCapabilities, knownHostKeys } from '../src/core/host-capability-policy.js';
import { generateAgeRatingESE } from '../src/data/agerating.js';
import { generateTemplate } from '../../packages/core/src/generate-template.js';
import { applyOutputProfile } from '../src/core/output-profile-policy.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('presets upstream removed are not offered as toggles', () => {
  // validatePreset() throws for DISABLED presets, so one toggle refused the whole save.
  for (const id of UPSTREAM_REMOVED_PRESET_IDS) {
    assert.ok(!OPTIONAL_SCRAPER_DEFS.some(d => d.presetType === id), `${id} is still a toggle`);
  }
});

test('upstream-removed presets are gated on every host, probed or not', () => {
  for (const key of knownHostKeys()) {
    const caps = resolveHostCapabilities(key, null);
    for (const id of UPSTREAM_REMOVED_PRESET_IDS) assert.ok(caps.disabledPresetIds.includes(id), `${key} lets ${id} through`);
  }
});

test('the live probe reads settings.presets DISABLED, not only the prose notice', () => {
  const probe = parseHostStatus({ data: { version: '2.35.7', settings: { customHtml: '', presets: [
    { ID: 'comet' },
    { ID: 'bitmagnet', DISABLED: { reason: 'Not configured', disabled: true } },
    { ID: 'torrentio', DISABLED: { reason: 'x', disabled: true } },
    { ID: 'meteor', DISABLED: { reason: 'soft', disabled: false } },
  ] } } });
  assert.deepEqual(probe.disabledPresetIds.sort(), ['bitmagnet', 'torrentio']);
});

test('Knaben and Zilean are not toggle cards: the builder always adds them with a torrent debrid', () => {
  assert.ok(!OPTIONAL_SCRAPER_DEFS.some(d => ['knaben', 'zilean'].includes(d.id)));
});

test('Brazuca Torrents is described as P2P and is not gated behind a debrid service', () => {
  // Upstream: SUPPORTED_SERVICES [], SUPPORTED_STREAM_TYPES [p2p].
  const def = OPTIONAL_SCRAPER_DEFS.find(d => d.id === 'brazuca-torrents');
  assert.match(def.desc, /P2P/);
  assert.doesNotMatch(def.desc, /debrid/i);
  assert.doesNotMatch(app, /debridOnly(Ids)? = \[[^\]]*brazuca/);
});

test('Offcloud, PikPak and Seedr send the credential fields AIOStreams requires', () => {
  const creds = { offcloud: 'k', offcloudEmail: 'e', offcloudPass: 'p', pikpak: 'pe', pikpakPass: 'pp', seedr: 'tok', alldebrid: 'ad' };
  assert.deepEqual(serviceCredentials('offcloud', creds), { apiKey: 'k', email: 'e', password: 'p' });
  assert.deepEqual(serviceCredentials('pikpak', creds), { email: 'pe', password: 'pp' });
  assert.deepEqual(serviceCredentials('seedr', creds), { encodedToken: 'tok' });
  assert.deepEqual(serviceCredentials('alldebrid', creds), { apiKey: 'ad' });
  for (const [service, fields] of Object.entries(SERVICE_CREDENTIAL_FIELDS)) {
    for (const [key] of fields) assert.ok(PROVIDER_CREDENTIALS[key], `${service}: form key ${key} has no registry entry`);
  }
  assert.deepEqual(serviceCredentialKeys('pikpak'), ['pikpak', 'pikpakPass']);
  assert.doesNotMatch(PROVIDER_CREDENTIALS.pikpak.label, /API Key/);
  assert.doesNotMatch(PROVIDER_CREDENTIALS.seedr.label, /API Key/);
});

test('the CLI generator maps the same credential fields', () => {
  const tpl = generateTemplate({ service: 'offcloud', credentials: { offcloud: 'k', offcloudEmail: 'e', offcloudPass: 'p' } }, {});
  const svc = tpl.config.services.find(s => s.id === 'offcloud');
  assert.deepEqual(svc.credentials, { apiKey: 'k', email: 'e', password: 'p' });
});

test('a Seedr-only build emits no StremThru preset (StremThru cannot use Seedr)', () => {
  const types = generateTemplate({ service: 'seedr' }, {}).config.presets.map(p => p.type);
  assert.ok(!types.includes('stremthruStore') && !types.includes('stremthruTorz'), types.join(','));
  assert.ok(types.includes('mediafusion'), 'MediaFusion is the one preset that supports Seedr');
});

test('the age-rating filter emits nothing: AIOStreams SEL has no certification()', () => {
  for (const rating of ['G', 'PG', 'PG-13', 'R', 'NC-17', 'none']) assert.equal(generateAgeRatingESE(rating), null, rating);
  assert.doesNotMatch(app, /data-action="set-age-limit"/, 'the Age Rating control must not be offered');
});

test('the Recommended Stack modal no longer repeats the false claims', () => {
  for (const bad of [/StremThru Torz usenet/, /Knaben usenet/, /pinned c1d044c/, /webstreamrmbg/, /Configurator webtools \(this patch\)/, /Primary: Torrentio/]) {
    assert.doesNotMatch(app, bad);
  }
});

test('troubleshooter and Stream Pool numbers come from the build, not stale copy', () => {
  assert.doesNotMatch(app, /107-entry/);
  assert.doesNotMatch(app, /The 8 default excluded regex patterns/);
  assert.doesNotMatch(app, /normal:'30–35 results'/);
  assert.match(app, /function streamPoolTargets\(/);
});

test('Anime content gets AnimeTosho on the default profile, only with a torrent debrid service', () => {
  // AnimeTosho is a Torznab built-in: with no StremThru-capable service it fails the
  // whole save, so P2P / EasyNews anime builds must not carry it enabled.
  const types = (input) => generateTemplate(input, {}).config.presets.filter(p => p.enabled !== false).map(p => p.type);
  assert.ok(types({ service: 'torbox-pro', content: 'anime' }).includes('animetosho'));
  assert.ok(types({ service: 'torbox-pro', content: 'mixed' }).includes('animetosho'));
  assert.ok(!types({ service: 'torbox-pro', content: 'all' }).includes('animetosho'));
  assert.ok(!types({ service: 'p2p', content: 'anime' }).includes('animetosho'));
  assert.ok(!types({ service: 'easynews', content: 'anime' }).includes('animetosho'));
  const ctx = { service: 'torbox-pro', resolution: '1080p', langs: ['English'], langExclusive: false, sizeLimit: 'unlimited', bandwidthMbps: 0, multiServices: ['torbox-pro'], optionalScrapers: [] };
  const balanced = applyOutputProfile(generateTemplate({ service: 'torbox-pro', content: 'anime' }, {}), 'balanced', ctx);
  assert.ok(balanced.config.presets.some(p => p.type === 'animetosho'), 'Balanced must keep AnimeTosho');
});

test('Brazuca (P2P-only) is gated on HTTP builds and allowed on P2P', () => {
  const fnSrc = app.match(/function optionalScraperLaneBlock\(id\) \{[\s\S]*?\n\}/)?.[0];
  const laneBlockFor = new Function('S', `${fnSrc}\nreturn optionalScraperLaneBlock;`);
  assert.ok(laneBlockFor({ service: 'http' })('brazuca-torrents'), 'HTTP builds never emit it, so the card must say so');
  assert.equal(laneBlockFor({ service: 'p2p' })('brazuca-torrents'), '');
});

test('both scraper pickers apply the host gate (Bitmagnet on hosts that strip it)', () => {
  assert.match(app, /function optionalScraperHostBlock\(id\)/);
  assert.match(app, /optionalScraperHostBlock\(d\.id\) \|\| optionalScraperLaneBlock\(d\.id\)/, 'main carousel');
  assert.match(app, /const scraperCards=OPTIONAL_SCRAPER_DEFS\.map\(d=>\{const why=[^;]*optionalScraperHostBlock\(d\.id\)/, 'additional-services picker');
});

test('Stream Pool lists every exit threshold the builder uses', () => {
  const src = app.match(/function streamPoolTargets\(pool\) \{[\s\S]*?\n\}/)?.[0];
  const targets = (S, pool) => new Function('S', `${src}\nreturn streamPoolTargets;`)(S)(pool);
  assert.deepEqual(targets({ resolution: 'ultrawide' }, 'normal').counts, [[15, '1080p'], [5, '2160p']]);
  assert.deepEqual(targets({ resolution: 'mixed' }, 'large').counts, [[22, '1080p'], [12, '2160p']]);
  assert.deepEqual(targets({ resolution: '4k' }, 'max'), { counts: [[25, '2160p']], ms: 10000 });
  assert.deepEqual(targets({ resolution: '1080p' }, 'normal'), { counts: [[20, '1080p']], ms: 6000 });
});

test('service-bound presets are only emitted when an enabled service can back them', () => {
  // Each case was refused by a real AIOStreams 2.35.7 before the fix
  // ("requires at least one usable service" / "No credentials found").
  const enabled = (input) => generateTemplate(input, {}).config.presets.filter(p => p.enabled !== false);
  const types = (input) => enabled(input).map(p => p.type);
  for (const service of ['easynews', 'usenet', 'seedr', 'debridio', 'p2p']) {
    assert.ok(!types({ service, content: 'all' }).includes('seadex'), `${service}: SeaDex needs a torrent debrid service`);
  }
  assert.ok(types({ service: 'torbox-pro', content: 'all' }).includes('seadex'), 'debrid builds keep SeaDex');
  const search = enabled({ service: 'usenet' }).find(p => p.type === 'easynews-search');
  assert.deepEqual(search.options.services, ['easynews'], 'EasyNews Search must not see Stremio NNTP / AIOStreams services');
  assert.ok(!types({ service: 'debridio', credentials: { debridio: 'k' } }).includes('debridio'), 'Debridio scraper needs a debrid service');
  assert.ok(!types({ service: 'torbox-pro', optionalScrapers: ['easynews'] }).includes('easynews'), 'EasyNews toggle needs the EasyNews service');
  assert.ok(types({ service: 'easynews', optionalScrapers: ['easynews'] }).includes('easynews'));
  for (const id of ['neko-bt', 'jackettio']) {
    assert.ok(!types({ service: 'p2p', optionalScrapers: [id] }).includes(id), `${id} needs a torrent debrid service`);
  }
  assert.ok(!types({ service: 'p2p', optionalScrapers: ['nzbfinder'], credentials: { nzbfinder: 'k' } }).includes('newznab'), 'Newznab needs a usenet-capable service');
});
