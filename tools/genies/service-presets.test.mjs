import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KEY_URLS,
  PRESETS,
  RAW,
  STORE_LABELS,
  applyStoreService,
  listStorePresets,
  recommendForService,
  resolveServiceId,
} from './service-presets.mjs';

const EMOJI = /[\u{1F000}-\u{1FFFF}]/u;

function storeFixture() {
  return {
    metadata: {
      id: 'brevity.core-nexus-alldebrid',
      name: 'Core Nexus AllDebrid',
      category: 'AllDebrid',
    },
    config: {
      services: [
        { id: 'torbox', enabled: true, credentials: {} },
        { id: 'alldebrid', enabled: false, credentials: {} },
        { id: 'premiumize', enabled: false, credentials: {} },
        { id: 'easydebrid', enabled: false, credentials: {} },
      ],
      presets: [
        { type: 'zilean', instanceId: 'z1', enabled: true, options: { name: 'Zilean' } },
        {
          type: 'stremthruStore',
          instanceId: '68a',
          enabled: true,
          options: { name: 'StremThru AllDebrid', timeout: 5000 },
        },
      ],
      addonName: 'Core Nexus AllDebrid',
      addonDescription: 'Core Nexus AllDebrid',
    },
  };
}

test('six named presets exist and AllDebrid is not an overlay', () => {
  assert.equal(listStorePresets().length, 6);
  assert.equal(PRESETS.alldebrid.overlay, false);
  assert.equal(PRESETS.premiumize.overlay, true);
  assert.equal(PRESETS.easydebrid.overlay, true);
  assert.match(PRESETS.alldebrid.url, /Templates\/Torbox\/AllDebrid\/core-nexus-alldebrid\.json$/);
  assert.match(PRESETS['alldebrid-4k'].url, /core-nexus-4k-alldebrid\.json$/);
  assert.equal(PRESETS['alldebrid-4k'].url.includes('apex'), false);
});

test('Premiumize and EasyDebrid overlay AllDebrid, not Stream', () => {
  assert.equal(PRESETS.premiumize.baseUrl, PRESETS.alldebrid.url);
  assert.equal(PRESETS['premiumize-4k'].baseUrl, PRESETS['alldebrid-4k'].url);
  assert.equal(PRESETS.easydebrid.baseUrl, PRESETS.alldebrid.url);
  assert.equal(PRESETS.premiumize.url.includes('Stream'), false);
  assert.equal(PRESETS.premiumize.storeLabel, 'StremThru Premiumize');
  assert.equal(PRESETS.easydebrid.storeLabel, 'StremThru EasyDebrid');
});

test('every preset URL is Core-Builds https raw', () => {
  for (const p of listStorePresets()) {
    assert.ok(p.url.startsWith(`${RAW}/Templates/Torbox/`));
    assert.ok(p.baseUrl.startsWith(`${RAW}/Templates/Torbox/`));
    assert.ok(p.keyUrl.startsWith('https://'));
    assert.equal(EMOJI.test(p.name + p.note), false);
  }
});

test('AllDebrid 1080p is the default; 4K is not Apex', () => {
  const rec = recommendForService('alldebrid');
  assert.equal(rec.id, 'alldebrid');
  assert.equal(rec.res, '1080p');
  const four = recommendForService('ad', { want4k: true, deviceId: 'shield' });
  assert.equal(four.id, 'alldebrid-4k');
  assert.equal(four.url.includes('apex'), false);
});

test('Fire Stick HD and 4K Max stay on 1080p store templates', () => {
  for (const id of ['firestick-hd', 'firestick-4kmax']) {
    const rec = recommendForService('premiumize', { want4k: true, deviceId: id });
    assert.equal(rec.res, '1080p', id);
    assert.equal(rec.id, 'premiumize', id);
  }
});

test('Samsung / TCL / Hisense do not get 4K store templates', () => {
  for (const id of ['samsung-tizen', 'tcl-google-tv', 'hisense', 'onn']) {
    const rec = recommendForService('easydebrid', { want4k: true, deviceId: id });
    assert.equal(rec.res, '1080p', id);
  }
});

test('first install is 1080p even on Shield', () => {
  const rec = recommendForService('alldebrid', { want4k: true, firstInstall: true, deviceId: 'shield' });
  assert.equal(rec.res, '1080p');
});

test('Real-Debrid has no named template', () => {
  assert.throws(() => resolveServiceId('realdebrid'), /No named Real-Debrid template/);
  assert.throws(() => recommendForService('rd'), /May 2026/);
});

test('TorBox is not a store overlay', () => {
  assert.throws(() => recommendForService('torbox'), /stremthruTorz/);
  assert.throws(() => resolveServiceId('torbox-pro'), /household/);
});

test('unknown service throws a named error', () => {
  assert.throws(() => resolveServiceId('klingon'), /Unknown store service: klingon/);
  assert.throws(() => resolveServiceId(''), /needs a store service id/);
});

test('apply retargets AllDebrid → Premiumize and is pure', () => {
  const src = storeFixture();
  const out = applyStoreService(src, 'premiumize');
  assert.equal(src.config.services.find((s) => s.id === 'torbox').enabled, true);
  assert.equal(src.config.presets[1].options.name, 'StremThru AllDebrid');
  assert.equal(out.metadata.name, 'Core Nexus Premiumize');
  assert.equal(out.metadata.coreBuildsStoreService, 'premiumize');
  assert.equal(out.config.services.find((s) => s.id === 'premiumize').enabled, true);
  assert.equal(out.config.services.find((s) => s.id === 'torbox').enabled, false);
  assert.equal(out.config.services.find((s) => s.id === 'alldebrid').enabled, false);
  const store = out.config.presets.find((p) => p.type === 'stremthruStore');
  assert.equal(store.options.name, STORE_LABELS.premiumize);
  assert.equal(out.config.presets.some((p) => p.type === 'stremthruTorz'), false);
});

test('apply EasyDebrid enables only easydebrid', () => {
  const out = applyStoreService(storeFixture(), 'easydebrid');
  const on = out.config.services.filter((s) => s.enabled).map((s) => s.id);
  assert.deepEqual(on, ['easydebrid']);
  assert.equal(out.config.presets.find((p) => p.type === 'stremthruStore').options.name, 'StremThru EasyDebrid');
});

test('apply refuses Stream / Torz, Apex, Hybrid, and missing templates', () => {
  assert.throws(() => applyStoreService(null, 'alldebrid'), /needs a template object/);
  assert.throws(
    () => applyStoreService({
      metadata: { name: 'Core Nexus Stream' },
      config: { presets: [{ type: 'stremthruTorz', options: { name: 'StremThru Torz' } }] },
    }, 'premiumize'),
    /Use AllDebrid, not Stream/,
  );
  assert.throws(
    () => applyStoreService({ metadata: { name: 'Core Nexus 4K Apex' }, config: { presets: [{ type: 'stremthruStore' }] } }, 'alldebrid'),
    /refuses Apex/,
  );
  assert.throws(
    () => applyStoreService({
      metadata: { name: 'Hybrid' },
      config: { presets: [{ type: 'stremthruTorz' }, { type: 'stremthruStore' }] },
    }, 'premiumize'),
    /refuses Hybrid/,
  );
});

test('zilean stays; no invented hosts', () => {
  const out = applyStoreService(storeFixture(), 'pm');
  assert.equal(out.config.presets[0].type, 'zilean');
  const blob = JSON.stringify(out) + JSON.stringify(listStorePresets());
  assert.equal(blob.includes('tugaflix'), false);
  assert.equal(blob.includes('stremio://'), false);
  assert.equal(KEY_URLS.premiumize, 'https://www.premiumize.me/account');
  assert.equal(KEY_URLS.alldebrid, 'https://alldebrid.com/apikeys');
});

test('AllDebrid overlay on AllDebrid flips torbox off', () => {
  const out = applyStoreService(storeFixture(), 'alldebrid');
  assert.equal(out.config.services.find((s) => s.id === 'alldebrid').enabled, true);
  assert.equal(out.config.services.find((s) => s.id === 'torbox').enabled, false);
  assert.equal(out.config.presets.find((p) => p.type === 'stremthruStore').options.name, 'StremThru AllDebrid');
});

test('4K AllDebrid overlay names Core Nexus 4K Premiumize', () => {
  const src = storeFixture();
  src.metadata.name = 'Core Nexus 4K AllDebrid';
  src.metadata.id = 'brevity.core-nexus-4k-alldebrid';
  const out = applyStoreService(src, 'premiumize');
  assert.equal(out.metadata.name, 'Core Nexus 4K Premiumize');
  assert.equal(out.metadata.id, 'brevity.core-nexus-4k-premiumize');
  assert.match(out.metadata.sourceUrl, /core-nexus-4k-premiumize\.json$/);
});

test('Shield 4K EasyDebrid is the 4K store preset, still not Apex', () => {
  const rec = recommendForService('ed', { want4k: true, deviceId: 'shield' });
  assert.equal(rec.id, 'easydebrid-4k');
  assert.equal(rec.res, '4k');
  assert.equal(rec.url.includes('apex'), false);
  assert.equal(rec.overlay, true);
});
