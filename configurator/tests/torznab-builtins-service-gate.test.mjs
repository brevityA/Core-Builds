/**
 * EZTV, Torrent Galaxy, Knaben and Zilean extend upstream TorznabPreset, whose
 * generateAddons throws "requires at least one usable service" when no
 * StremThru-supported service is enabled. Config create/update validates with
 * skipErrorsFromAddonsOrProxies:false, so ONE such enabled preset rejects the
 * whole save. P2P and EasyNews-only builds have no such service, so the four
 * must not be enabled there (the generator then drops them) and must stay
 * enabled wherever a torrent debrid exists.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateTemplate } from '../../packages/core/src/generate-template.js';
import { TORRENT_DEBRID_SERVICE_IDS, hasTorrentDebridService } from '../src/core/install-policy.js';
import * as corePolicy from '../../packages/core/src/library-policy.js';

const BUILTINS = ['eztv', 'torrent-galaxy', 'knaben', 'zilean'];
const enabledBuiltins = input => generateTemplate(input).config.presets
  .filter(p => BUILTINS.includes(p.type) && p.enabled !== false).map(p => p.type);

test('no Torznab built-in is enabled on a route without a torrent debrid service', () => {
  for (const service of ['p2p', 'easynews']) {
    assert.deepEqual(enabledBuiltins({ service }), [], `${service}: an enabled built-in rejects the whole save`);
  }
});

test('the built-ins stay enabled wherever a torrent debrid service exists', () => {
  for (const service of ['torbox-pro', 'realdebrid', 'alldebrid']) {
    assert.deepEqual(enabledBuiltins({ service }).sort(), [...BUILTINS].sort(), `${service}: built-ins should be on`);
  }
});

test('torrent-debrid list matches between the configurator and packages/core, and excludes Usenet-only ids', () => {
  assert.deepEqual(TORRENT_DEBRID_SERVICE_IDS, corePolicy.TORRENT_DEBRID_SERVICE_IDS);
  for (const usenetOnly of ['nzbdav', 'altmount', 'stremthru_newz', 'aiostreams', 'easynews']) {
    assert.equal(hasTorrentDebridService([{ id: usenetOnly, enabled: true }]), false, `${usenetOnly} cannot back a Torznab built-in`);
  }
  assert.equal(hasTorrentDebridService([{ id: 'torbox', enabled: false }]), false, 'a disabled service does not count');
});

test('the configurator builder gates the same four presets', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  for (const [type, id] of [['zilean', 'nx-fix-04'], ['eztv', 'nx-ez-01'], ['torrent-galaxy', 'nx-tg-01'], ['knaben', 'tam-knaben']]) {
    assert.ok(app.includes(`{ type:'${type}', instanceId:'${id}', enabled:torrentCapable,`), `app.js ${type} must be gated on torrentCapable`);
  }
});
