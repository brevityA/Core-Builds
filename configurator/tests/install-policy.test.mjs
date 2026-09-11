/**
 * Install policy — the Library-preset usability rule (audit defect 2) and the
 * Direct Install credential gate (audit defect 3). The rules live in
 * src/core/install-policy.js; the tests here prove both the pure rule and that
 * app.js actually routes its emission/posting paths through it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  LIBRARY_CAPABLE_SERVICE_IDS,
  SERVICE_CREDENTIAL_REQUIREMENTS,
  hasLibraryCapableService,
  missingDirectInstallCredentials,
} from '../src/core/install-policy.js';
import { AIO_SERVICES } from '../src/data/generated/aiostreams-enums.js';
import { AIO_PRESET_ID_SET } from '../src/data/generated/aiostreams-presets.js';

const svc = (id, enabled = true) => ({ id, enabled, credentials: {} });

/* ── the library-capable service set ───────────────────────────────────────── */

test('the library-capable set is exactly the upstream Library supported services at the pin', () => {
  // Read from AIOStreams v2.34.0 @ e694b6a: LibraryPreset.supportedServices =
  // StremThruPreset list (alldebrid, debrider, debridlink, easydebrid,
  // offcloud, premiumize, pikpak, realdebrid, torbox, torrin) + nzbdav +
  // altmount + stremthru_newz + aiostreams. EasyNews is NOT among them.
  assert.deepEqual([...LIBRARY_CAPABLE_SERVICE_IDS].sort(), [
    'aiostreams', 'alldebrid', 'altmount', 'debrider', 'debridlink', 'easydebrid',
    'nzbdav', 'offcloud', 'pikpak', 'premiumize', 'realdebrid', 'stremthru_newz',
    'torbox', 'torrin',
  ]);
  for (const id of LIBRARY_CAPABLE_SERVICE_IDS) {
    assert.ok(AIO_SERVICES.includes(id), `${id} is not a service AIOStreams knows`);
  }
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('easynews'), 'EasyNews must not be library-capable — the audited 400');
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('seedr'), 'Seedr is not a StremThru/Library service upstream');
  assert.ok(!LIBRARY_CAPABLE_SERVICE_IDS.includes('putio'), 'putio is not library-capable upstream');
});

test('hasLibraryCapableService: EasyNews-only is false, EasyNews + debrid is true', () => {
  assert.equal(hasLibraryCapableService([svc('easynews')]), false, 'the audited failing config');
  assert.equal(hasLibraryCapableService([svc('easynews'), svc('alldebrid')]), true);
  assert.equal(hasLibraryCapableService([svc('torbox')]), true);
  assert.equal(hasLibraryCapableService([svc('easynews'), svc('debridlink')]), true);
  assert.equal(hasLibraryCapableService([]), false);
  assert.equal(hasLibraryCapableService(undefined), false);
});

test('hasLibraryCapableService: the usenet route keeps the library via the aiostreams service', () => {
  const usenetRouteServices = [svc('easynews'), svc('stremio_nntp'), svc('aiostreams')];
  assert.equal(hasLibraryCapableService(usenetRouteServices), true);
});

test('hasLibraryCapableService ignores disabled entries', () => {
  assert.equal(hasLibraryCapableService([svc('torbox', false), svc('easynews')]), false);
});

/* ── the Direct Install credential gate ────────────────────────────────────── */

test('TorBox with an empty key is named and blocked; with a key it passes', () => {
  const missing = missingDirectInstallCredentials([svc('torbox')], { torbox: '' });
  assert.equal(missing.length, 1);
  assert.equal(missing[0].service, 'torbox');
  assert.equal(missing[0].field, 'torbox');
  assert.match(missing[0].label, /TorBox API Key/i);
  assert.deepEqual(missingDirectInstallCredentials([svc('torbox')], { torbox: 'k' }), []);
  // whitespace-only is still missing
  assert.equal(missingDirectInstallCredentials([svc('torbox')], { torbox: '   ' }).length, 1);
});

test('EasyNews needs username AND password — each missing one is named', () => {
  const noPass = missingDirectInstallCredentials([svc('easynews')], { easynews: 'user', easynewsPass: '' });
  assert.deepEqual(noPass.map(m => m.field), ['easynewsPass']);
  assert.match(noPass[0].label, /EasyNews Password/i);
  const none = missingDirectInstallCredentials([svc('easynews')], {});
  assert.deepEqual(none.map(m => m.field).sort(), ['easynews', 'easynewsPass']);
  assert.deepEqual(
    missingDirectInstallCredentials([svc('easynews')], { easynews: 'user', easynewsPass: 'pass' }),
    [],
  );
});

test('Real-Debrid, AllDebrid and every other apiKey service gate the same way', () => {
  for (const id of ['realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'offcloud', 'easydebrid', 'pikpak', 'seedr']) {
    assert.equal(missingDirectInstallCredentials([svc(id)], {}).length, 1, id);
    assert.deepEqual(missingDirectInstallCredentials([svc(id)], { [id]: 'x' }), [], id);
  }
});

test('P2P/HTTP need no credentials; Debridio is not gated (its preset is simply omitted keyless)', () => {
  assert.deepEqual(missingDirectInstallCredentials([], {}), []);
  // p2p/http emit no services at all — but even a stray entry for them is not in the table
  assert.equal(SERVICE_CREDENTIAL_REQUIREMENTS.p2p, undefined);
  assert.equal(SERVICE_CREDENTIAL_REQUIREMENTS.http, undefined);
  assert.equal(SERVICE_CREDENTIAL_REQUIREMENTS.debridio, undefined);
});

/* ── app.js wiring — the rules must be on the real paths ───────────────────── */

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('presets() gates every library emission on hasLibraryCapableService(services())', () => {
  const body = app.match(/function presets\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(body, 'presets() not found');
  assert.match(body, /const libCapable = hasLibraryCapableService\(services\(\)\);/, 'the capability flag must come from the emitted services array');
  const gated = body.match(/\.\.\.\(libCapable \? \[\{ type:'library'/g) || [];
  const total = body.split(/type:'library'/).length - 1;
  assert.equal(total, 2, 'exactly two library emission sites exist (usenet route + general list)');
  assert.equal(gated.length, 2, 'both library emission sites must be conditional on libCapable');
});

test('simpleInstall blocks the POST on missing credentials, before anything is sent', () => {
  const body = app.match(/async function simpleInstall\(target\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(body, 'simpleInstall not found');
  const gate = body.indexOf('missingDirectInstallCredentials(services(), S.creds)');
  assert.ok(gate > -1, 'the key gate must consult the emitted services array');
  const post = body.indexOf("writeHostFetch(fastest, '/api/v1/user'");
  assert.ok(post > -1, 'expected the POST call');
  assert.ok(gate < post, 'the gate must run before the config is posted');
  assert.match(body, /missingCredHtml\(missingCreds\)/, 'the block renders the inline message');
});

test('the Express lane runs the same precise gate (the old any-key check is gone)', () => {
  assert.doesNotMatch(app, /Object\.values\(p\.creds\)\.some\(v => v\)/, 'the "any one key" check must not survive');
  const body = app.match(/async function runExpressInstall\(p\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(body);
  assert.match(body, /missingDirectInstallCredentials\(services\(\), S\.creds\)/);
});

test('the library preset id is one AIOStreams can resolve (guard for the fixture tests)', () => {
  assert.ok(AIO_PRESET_ID_SET.has('library'));
});
