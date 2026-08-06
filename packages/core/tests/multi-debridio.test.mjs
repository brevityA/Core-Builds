import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/generate-template.js';

const INPUT = {
  service: 'multi',
  multiServices: ['torbox-pro', 'premiumize', 'debridio'],
  optionalScrapers: ['usenetcrawler'],
  credentials: {
    torbox: 'test-torbox-key',
    premiumize: 'test-premiumize-key',
    debridio: 'test-debridio-key',
    usenetcrawler: 'test-usenet-crawler-key',
  },
  device: 'generic',
  resolution: '4k',
  architecture: 'standard',
  content: 'all',
};

test('multi-service generation keeps Debridio and an optional Usenet Crawler preset', () => {
  const template = generateTemplate(INPUT);
  const debridio = template.config.presets.find(preset => preset.type === 'debridio');
  const crawler = template.config.presets.find(preset => preset.instanceId === 'usenetcrawler-1');

  assert.ok(debridio, 'Debridio must be emitted when it is selected as a multi-service extra');
  assert.equal(debridio.options.apiKey, 'test-debridio-key');

  assert.ok(crawler, 'Usenet Crawler must be emitted from optionalScrapers');
  assert.equal(crawler.type, 'newznab');
  assert.equal(crawler.options.name, 'Usenet Crawler');
  assert.equal(crawler.options.api.apiKey, 'test-usenet-crawler-key');
});

test('Debridio/Debrider are omitted when their API key is missing (no config reject)', () => {
  const template = generateTemplate({
    service: 'multi',
    multiServices: ['torbox-pro', 'debridio', 'debrider'],
    credentials: { torbox: 'test-torbox-key' },   // note: no debridio/debrider keys
    device: 'generic',
    resolution: '1080p',
    architecture: 'standard',
    content: 'all',
  });
  const types = template.config.presets.map(p => p.type);
  assert.ok(!types.includes('debridio'), 'keyless Debridio must be omitted (AIOStreams would reject it)');
  assert.ok(!types.includes('debrider'), 'keyless Debrider must be omitted');
  assert.ok(types.includes('stremthruTorz'), 'TorBox store preset still present');
});

test('Debridio IS emitted enabled+keyed when its API key is present', () => {
  const template = generateTemplate({
    service: 'multi',
    multiServices: ['torbox-pro', 'debridio'],
    credentials: { torbox: 'test-torbox-key', debridio: 'test-debridio-key' },
    device: 'generic',
    resolution: '1080p',
    architecture: 'standard',
    content: 'all',
  });
  const debridio = template.config.presets.find(p => p.type === 'debridio');
  assert.ok(debridio, 'Debridio preset must be present when key is entered');
  assert.equal(debridio.enabled, true);
  assert.equal(debridio.options.apiKey, 'test-debridio-key');
});

test('Usenet-only service emits no torrent scrapers, no debrid, and turns on the built-in NNTP engine', () => {
  const template = generateTemplate({
    service: 'usenet',
    multiServices: ['usenet'],
    device: 'firestick-4kmax',
    resolution: '4k',
    architecture: 'iqr',
    content: 'all',
    credentials: { easynews: 'user', easynewsPass: 'pass', nzbgeek: 'geekkey' },
    optionalScrapers: ['nzbnoob', 'drunkenslug'],
  });
  const svc = template.config.services;
  const pres = template.config.presets;
  const torrent = ['zilean','meteor','comet','mediafusion','eztv','torrent-galaxy','knaben','torrents-db','animetosho','sootio','peerflix','torrentio','debridio','debrider'];
  assert.ok(svc.find(s => s.id === 'easynews').enabled, 'easynews service on');
  assert.ok(svc.find(s => s.id === 'stremio_nntp').enabled, 'built-in NNTP service on');
  assert.ok(svc.find(s => s.id === 'aiostreams').enabled, 'built-in usenet engine on');
  assert.ok(pres.some(p => p.type === 'easynewsPlusPlus'), 'EasyNews++ preset present');
  assert.ok(pres.some(p => p.type === 'easynews-search'), 'EasyNews search preset present');
  assert.ok(pres.filter(p => p.type === 'newznab').length >= 2, 'indexers present');
  assert.ok(!pres.some(p => torrent.includes(p.type)), 'no torrent scrapers in a usenet-only build');
  assert.ok(!svc.some(s => s.enabled && ['torbox','realdebrid','alldebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr','debridio','debrider'].includes(s.id)), 'no debrid services enabled');
});

test('Usenet-only path emits a NZBHydra2 preset when selected with url+key', () => {
  const template = generateTemplate({
    service: 'usenet', multiServices: ['usenet'], device: 'firestick-4kmax', resolution: '4k',
    architecture: 'iqr', content: 'all',
    credentials: { easynews: 'u', easynewsPass: 'p', nzbhydra: 'https://nzb.myhost', nzbhydraApiKey: 'k' },
    optionalScrapers: ['nzbhydra'],
  });
  const hydra = template.config.presets.find(p => p.type === 'nzbhydra');
  assert.ok(hydra, 'NZBHydra2 preset present');
  assert.equal(hydra.options.api.url, 'https://nzb.myhost');
  assert.equal(hydra.options.api.apiKey, 'k');
  assert.ok(!template.config.presets.some(p => ['zilean','meteor','comet','mediafusion','torrent-galaxy'].includes(p.type)), 'no torrent scrapers');
});
