import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_PROFILES } from '../src/data/devices.js';
import { ICO } from '../src/data/icons.js';

test('capability-based device profiles have safe complete shapes', () => {
  for (const profile of Object.values(DEVICE_PROFILES)) {
    assert.ok(profile.id && profile.label && profile.family);
    assert.ok(profile.video.maxResolution);
    assert.ok(Array.isArray(profile.video.codecs));
    assert.ok(profile.audio.maxChannels);
    assert.ok(profile.playback.maxBitrate);
    assert.ok(Array.isArray(profile.warnings) && profile.warnings.length > 0);
  }
});

test('Android mobile profile is conservative', () => {
  const profile = DEVICE_PROFILES['android-mobile'];
  assert.equal(profile.video.codecs.includes('AV1'), false);
  assert.equal(profile.audio.lossless, false);
  assert.equal(profile.audio.maxChannels, '2.0');
});

test('Fire Stick HD is 1080p SDR with no DV', () => {
  const profile = DEVICE_PROFILES['firestick-hd'];
  assert.equal(profile.video.maxResolution, '1080p');
  assert.equal(profile.video.dolbyVision, false);
  assert.equal(profile.video.hdr.includes('SDR'), true);
  assert.equal(profile.playback.maxBitrate, 'capped');
});

test('Fire Stick 4K Max is bitrate-capped, not Apex', () => {
  const profile = DEVICE_PROFILES['firestick-4kmax'];
  assert.equal(profile.video.maxResolution, '2160p');
  assert.equal(profile.playback.maxBitrate, 'capped');
  assert.equal(profile.playback.preferSmallFiles, true);
  assert.match(profile.warnings[0], /not Apex/);
});

test('TCL and Hisense are explicit no-DV profiles', () => {
  for (const id of ['tcl-google-tv', 'hisense']) {
    assert.equal(DEVICE_PROFILES[id].video.dolbyVision, false);
    assert.equal(DEVICE_PROFILES[id].audio.lossless, false);
  }
});

const ICON_HELPERS = [
  ['androidMobile', 'android-mobile'],
  ['androidTv', 'android-tv'],
  ['samsungTv', 'samsung-tizen'],
  ['lgTv', 'lg-webos'],
  ['sonyGoogleTv', 'sony-google-tv'],
  ['generic4kTv', 'generic-4k-hdr-tv'],
];

test('every new profile has an SVG icon helper', () => {
  for (const [helperName] of ICON_HELPERS) {
    assert.equal(typeof ICO[helperName], 'function', `ICO.${helperName} must be a function`);
    const svg = ICO[helperName]();
    assert.ok(svg.startsWith('<svg'), `ICO.${helperName}() must return SVG markup`);
    assert.ok(svg.includes('viewBox="0 0 44 44"'), `ICO.${helperName}() must use 44×44 viewBox`);
    assert.ok(svg.includes('fill="none"'), `ICO.${helperName}() must default to fill="none"`);
  }
});

test('no new profile uses emoji as its icon', () => {
  for (const [helperName] of ICON_HELPERS) {
    const svg = ICO[helperName]();
    assert.ok(!(/[\u{1F000}-\u{1FFFF}]/u.test(svg)), `ICO.${helperName}() must not contain emoji`);
  }
});
