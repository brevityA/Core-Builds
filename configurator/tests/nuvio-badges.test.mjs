import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nuvioBadgePack, deviceLacksDolbyVision, NUVIO_BADGE_PACKS, BADGE_BUILDER_PATH } from '../src/core/nuvio-badges.js';
import { DEVICE_PROFILES, DEVICE_DV_SAFE } from '../src/data/devices.js';

const root = new URL('../../', import.meta.url);

test('every offered pack is a published Core pack', () => {
  for (const pack of Object.values(NUVIO_BADGE_PACKS)) {
    const file = pack.url.replace('https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/', '');
    const json = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
    assert.ok(Array.isArray(json.filters) && json.filters.length > 0, file);
  }
});

test('No DV goes to devices known to lack Dolby Vision, Universal to everything else', () => {
  for (const id of ['samsung', 'samsung-tizen', 'tcl-google-tv', 'hisense', 'firestick-hd']) {
    assert.equal(nuvioBadgePack(id).id, 'noDv', id);
  }
  for (const id of ['generic', 'shield', 'googletv', 'appletv-new', 'lgtv', 'windows', 'android-mobile', undefined]) {
    assert.equal(nuvioBadgePack(id).id, 'universal', String(id));
  }
});

test('no Dolby Vision device is sent the No DV pack', () => {
  for (const id of DEVICE_DV_SAFE) assert.equal(deviceLacksDolbyVision(id), false, id);
  for (const p of Object.values(DEVICE_PROFILES)) if (p.video?.dolbyVision !== false) assert.equal(deviceLacksDolbyVision(p.id), false, p.id);
});

test('the Badge Builder link is relative to /configurator/', () => {
  assert.equal(BADGE_BUILDER_PATH, '../tools/badges/');
});
