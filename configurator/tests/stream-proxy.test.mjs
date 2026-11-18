/**
 * Stream proxy: the emitted block is one AIOStreams actually honours.
 *
 * evaluateProxyStream (packages/core/src/streams/proxifier.ts at the pin) skips
 * every stream unless `proxy.enabled && proxy.url`; empty proxiedAddons /
 * proxiedServices mean "all". Until v3.18 the toggle emitted neither field, so it
 * could not proxy anything, and an update replaced a working proxy with that stub.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  STREAM_PROXY_IDS,
  isAioEncrypted,
  normaliseStreamProxyState,
  proxyUrlProblem,
  streamProxyConfig,
  streamProxyFromConfig,
  streamProxyProblem,
  streamProxySaveError,
} from '../src/core/stream-proxy-policy.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

// The proxifier's own gate, minus the per-stream URL checks.
const wouldProxy = (proxy, { addon = 'nx-mf-01', service = 'torbox' } = {}) => Boolean(
  proxy?.enabled && proxy.url
  && (!proxy.proxiedAddons?.length || proxy.proxiedAddons.includes(addon))
  && (!proxy.proxiedServices?.length || proxy.proxiedServices.includes(service))
);

test('off, the block is exactly the stub every build carried before', () => {
  const stub = { id: 'mediaflow', proxiedAddons: [], proxiedServices: [] };
  assert.deepEqual(streamProxyConfig(undefined), stub);
  assert.deepEqual(streamProxyConfig({ enabled: false, url: 'https://mfp.example.com' }, 'pw'), stub, 'a saved address alone does not switch it on');
  assert.equal(wouldProxy(streamProxyConfig(undefined)), false);
});

test('on with an address, AIOStreams proxies every stream', () => {
  const proxy = streamProxyConfig({ enabled: true, id: 'mediaflow', url: ' https://mfp.example.com/ ' }, ' secret ');
  assert.deepEqual(proxy, {
    enabled: true, id: 'mediaflow', url: 'https://mfp.example.com', credentials: 'secret', proxiedAddons: [], proxiedServices: [],
  });
  assert.equal(wouldProxy(proxy), true);
  assert.equal(wouldProxy(proxy, { service: 'none' }), true, 'P2P and direct links too');
});

test('picked services narrow it; "none" covers streams without a service', () => {
  const proxy = streamProxyConfig({ enabled: true, url: 'https://mfp.example.com', proxiedServices: ['torbox', 'none', 'torbox', ''] }, 'pw');
  assert.deepEqual(proxy.proxiedServices, ['torbox', 'none']);
  assert.equal(wouldProxy(proxy, { service: 'torbox' }), true);
  assert.equal(wouldProxy(proxy, { service: 'none' }), true);
  assert.equal(wouldProxy(proxy, { service: 'realdebrid' }), false);
});

test('an unusable address leaves the proxy off instead of shipping a broken one', () => {
  for (const url of ['', 'mfp.example.com', 'ftp://mfp.example.com', 'https://user:pw@mfp.example.com']) {
    assert.ok(proxyUrlProblem(url), `${url || '(empty)'} must be refused`);
    assert.equal(wouldProxy(streamProxyConfig({ enabled: true, url }, 'pw')), false, url);
  }
  assert.equal(proxyUrlProblem('http://192.168.1.10:8888'), null, 'a LAN proxy is a valid address');
});

test('an unknown provider falls back to MediaFlow; every upstream provider is offered', () => {
  assert.deepEqual([...STREAM_PROXY_IDS], ['mediaflow', 'stremthru', 'builtin'], 'constants.PROXY_SERVICES at the pin');
  assert.equal(normaliseStreamProxyState({ id: 'mystery' }).id, 'mediaflow');
  assert.equal(streamProxyConfig({ enabled: true, id: 'stremthru', url: 'https://st.example.com' }, 'u:p').id, 'stremthru');
});

test('no password, no proxy: AIOStreams refuses an enabled proxy without credentials', () => {
  const state = { enabled: true, id: 'mediaflow', url: 'https://mfp.example.com' };
  assert.match(streamProxyProblem(state, ''), /API password/);
  assert.equal(wouldProxy(streamProxyConfig(state, '   ')), false);
  assert.equal(streamProxyProblem(state, 'pw'), null);
});

test('the built-in proxy needs no address: the instance fills in its own', () => {
  const proxy = streamProxyConfig({ enabled: true, id: 'builtin', url: '' }, 'user:pass');
  assert.equal(proxy.enabled, true);
  assert.equal(proxy.id, 'builtin');
  assert.equal('url' in proxy, false, 'validateProxy sets it to the instance base URL');
  assert.equal(streamProxyFromConfig({ enabled: true, id: 'builtin', credentials: 'user:pass' }).state.enabled, true);
});

test('values AIOStreams encrypted are passed back untouched', () => {
  const sealed = Buffer.from(JSON.stringify({ t: 'a', iv: 'x', d: 'y' })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(isAioEncrypted(sealed), true);
  assert.equal(isAioEncrypted('https://mfp.example.com'), false);
  const { state, credentials } = streamProxyFromConfig({ enabled: true, id: 'mediaflow', url: sealed, credentials: sealed });
  const proxy = streamProxyConfig(state, credentials);
  assert.equal(proxy.url, sealed);
  assert.equal(proxy.credentials, sealed);
});

test('a save refused by the proxy is explained; other refusals are not claimed', () => {
  assert.match(streamProxySaveError('Failed to get the public IP of the proxy service mediaflow: fetch failed'), /could not reach your proxy/);
  assert.match(streamProxySaveError('Proxy credentials are required'), /address and password/);
  assert.match(streamProxySaveError('Proxy URL for mediaflow is encrypted but failed to decrypt: bad'), /another AIOStreams instance/);
  assert.equal(streamProxySaveError('Failed to fetch manifest for Comet: timeout'), null);
});

test('a live config\'s proxy survives import and rebuild unchanged', () => {
  const live = { enabled: true, id: 'stremthru', url: 'https://st.example.com', publicUrl: 'https://st.public.example.com', credentials: 'u:p', proxiedAddons: ['67c'], proxiedServices: ['torbox'] };
  const { state, credentials } = streamProxyFromConfig(live);
  assert.equal(credentials, 'u:p');
  assert.deepEqual(streamProxyConfig(state, credentials), live);
  assert.equal(streamProxyFromConfig({ id: 'mediaflow', proxiedServices: [] }).state.enabled, false, 'the old stub imports as off');
});

test('the app builds, restores and recovers the proxy, and never shares it', () => {
  assert.match(app, /proxy: streamProxyConfig\(S\.streamProxy, S\.streamProxyPassword\)/, 'the build emits the policy block');
  const shareKeys = app.match(/const SHARE_KEYS = \[([^\]]*)\]/)[1];
  assert.doesNotMatch(shareKeys, /streamProxy/, 'share links must not carry a proxy address or password');
  assert.match(app, /if \(parsed\.streamProxy\) S\.streamProxy = normaliseStreamProxyState\(parsed\.streamProxy\)/, 'restored from this device');
  assert.match(app, /c\.proxy\?\.enabled === true && c\.proxy\.url[\s\S]{0,120}streamProxyFromConfig\(c\.proxy\)/, 'recovered from an imported config');
  assert.match(app, /if \(!parsed\.streamProxy\?\.enabled\) \{\s*nextState\.streamProxy = /, 'a template update keeps the user\'s own proxy');
  const card = app.match(/function streamProxyCardHtml\(\) \{[\s\S]*?\n\}/)[0];
  for (const value of ['px.url', 'px.publicUrl', "S.streamProxyPassword || ''"]) {
    assert.ok(card.includes(`escHtml(${value})`), `${value} must be escaped where it is rendered`);
  }
});
