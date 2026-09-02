import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATES,
  recommendForDevice,
  recommendHousehold,
  isNoDv,
  isStick,
} from './household.mjs';

test('every template has an https Core-Builds URL', () => {
  for (const t of Object.values(TEMPLATES)) {
    assert.ok(t.id && t.name && t.res);
    assert.match(t.url, /^https:\/\/raw\.githubusercontent\.com\/brevityA\/Core-Builds\//);
    assert.ok(t.note);
  }
});

test('Fire Stick HD never gets 4K or DV', () => {
  const hd = recommendForDevice('firestick-hd', { want4k: true });
  assert.equal(hd.id, 'stream-firestick');
  assert.equal(hd.res, '1080p');
  assert.equal(hd.dolbyVision, false);
});

test('Fire Stick 4K Max starts on 1080p Stream, not Apex', () => {
  const first = recommendForDevice('firestick-4kmax', { want4k: false });
  assert.equal(first.id, 'stream');
  const stepped = recommendForDevice('firestick-4kmax', { want4k: true });
  assert.equal(stepped.id, 'essential-4k');
  assert.notEqual(stepped.id, 'apex');
});

test('Samsung / TCL / Hisense / ONN are no-DV', () => {
  for (const id of ['samsung', 'samsung-tizen', 'tcl', 'tcl-google-tv', 'hisense', 'onn']) {
    assert.equal(isNoDv(id), true, id);
    const rec = recommendForDevice(id, { want4k: true });
    assert.equal(rec.dolbyVision, false, id);
    assert.ok(rec.id.startsWith('samsung-tv'), id);
  }
});

test('Shield can take Apex when 4K is requested', () => {
  assert.equal(recommendForDevice('shield', { want4k: true }).id, 'apex');
});

test('first install uses Stable, not Apex', () => {
  assert.equal(recommendForDevice('shield', { want4k: true, firstInstall: true }).id, 'stable4k');
  assert.equal(recommendForDevice('firestick-hd', { firstInstall: true }).id, 'stable1080');
});

test('mixed household emits two seats and two accounts', () => {
  const house = recommendHousehold({
    tv: 'samsung-tizen',
    stick: 'firestick-hd',
    want4k: true,
  });
  assert.equal(house.mixed, true);
  assert.equal(house.needsTwoAccounts, true);
  assert.equal(house.house4k.template.id, 'samsung-tv-4k');
  assert.equal(house.house1080.template.id, 'stream-firestick');
  assert.match(house.note, /Two Stremio or Nuvio accounts/);
});

test('same device twice does not demand two accounts', () => {
  const house = recommendHousehold({ tv: 'shield', stick: 'shield', want4k: true });
  assert.equal(house.needsTwoAccounts, false);
});

test('missing both devices throws a named error', () => {
  assert.throws(() => recommendHousehold({}), /tv or stick/);
});

test('stick helper', () => {
  assert.equal(isStick('firestick-4kmax'), true);
  assert.equal(isStick('shield'), false);
});
