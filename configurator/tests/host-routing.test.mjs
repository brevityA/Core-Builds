/**
 * Host routing + host-picker truthfulness (2026-09-06 audit, defect 4).
 *
 * The picker treated every host as interchangeable. These tests pin:
 *   - the registry's per-host AIOStreams versions (2.36.0 except Omni's 2.35.9, 2026-10-22)
 *   - the capability + version label each picker shows before Deploy
 *   - the routing matrix: P2P can never target ElfHosted; a config needing a
 *     newer AIOStreams than a host runs is not routed there
 *   - every non-legacy host runs the pinned contract, so default output fits it;
 *     a legacy host is labelled and kept off builds it would refuse
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { HOST_LABEL_MAP, HOST_META } from '../src/data/hosts.js';
import { AIOSTREAMS_COMPATIBILITY_TARGETS, DEFAULT_AIOSTREAMS_VERSION } from '../src/core/output-profile-policy.js';
import { resolveHostCapabilities, isVersionAtLeast } from '../src/core/host-capability-policy.js';
import {
  hostCapabilityLabel,
  hostPickerLabel,
  configRequiredAIOStreamsVersion,
  hostRoutingDecision,
  autoRoutableHostKeys,
} from '../src/core/host-routing.js';
import { FEATURE_MIN_VERSIONS, PRESET_MIN_VERSIONS } from '../src/data/host-capabilities.js';

/* ── the registry snapshot ─────────────────────────────────────────────────── */

test('every public host carries a known AIOStreams version', () => {
  for (const [key, meta] of Object.entries(HOST_META)) {
    assert.match(meta.aiostreamsVersion, /^\d+\.\d+\.\d+$/, `${key} has no registry version`);
  }
});

test('registry versions match the 2026-10-22 audit of the live fleet', () => {
  // Re-audited 2026-10-22 against each host's own /api/v1/status.
  const expected = {
    elfhosted: '2.36.0', fortheweak: '2.36.0', midnight: '2.36.0', kuu: '2.36.0', viren: '2.36.0',
    atbp: '2.36.0', wizaardd: '2.36.0', omni: '2.35.9',
  };
  for (const [key, version] of Object.entries(expected)) assert.equal(HOST_META[key].aiostreamsVersion, version, key);
});

test('every non-legacy host runs the pinned contract; a legacy host says so and is gated', async () => {
  // The output targets the schema pin; a host may run newer. A public host on a
  // release whose contract differs from the pin's must carry "(legacy)" in its
  // label, and every preset that release refuses must be in PRESET_MIN_VERSIONS
  // so routing keeps those builds off it. UPSTREAM.pin records the oldest
  // release with an identical contract.
  const { readFile } = await import('node:fs/promises');
  const pin = JSON.parse(await readFile(new URL('../UPSTREAM.pin', import.meta.url), 'utf8'));
  assert.ok(isVersionAtLeast(DEFAULT_AIOSTREAMS_VERSION, pin.sameContractSince), 'sameContractSince must not be newer than the pin');
  const behind = Object.keys(HOST_META).filter(key => !isVersionAtLeast(HOST_META[key].aiostreamsVersion, pin.sameContractSince));
  const labelledLegacy = Object.keys(HOST_META).filter(key => /\(legacy\)/.test(HOST_LABEL_MAP[key]));
  assert.deepEqual(labelledLegacy.sort(), behind.sort(), 'exactly the hosts behind the pinned contract are labelled (legacy)');
  for (const key of behind) {
    for (const [type, minimum] of Object.entries(PRESET_MIN_VERSIONS)) {
      assert.ok(!isVersionAtLeast(HOST_META[key].aiostreamsVersion, minimum), `${key} is legacy, so ${type} must be gated above it`);
    }
  }
  assert.ok(AIOSTREAMS_COMPATIBILITY_TARGETS.includes(DEFAULT_AIOSTREAMS_VERSION));
});

test('the default target is the pinned release and is itself a target', async () => {
  const { readFile } = await import('node:fs/promises');
  const pin = JSON.parse(await readFile(new URL('../UPSTREAM.pin', import.meta.url), 'utf8'));
  assert.equal(pin.version, DEFAULT_AIOSTREAMS_VERSION, 'the default target must be the pinned AIOStreams release');
  assert.ok(AIOSTREAMS_COMPATIBILITY_TARGETS.includes(DEFAULT_AIOSTREAMS_VERSION));
});

test('saved sessions on the old 2.35.7 default target move to the pin, once', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  const src = app.match(/const STATE_SCHEMA = \d+;\nfunction migrateState\(input\) \{[\s\S]*?\n\}/)[0];
  const migrate = new Function('DEVICE_FORCE_LIMITED_AUDIO', 'DEVICE_AUDIO_DEFAULTS', 'OUTPUT_PROFILES', 'AIOSTREAMS_COMPATIBILITY_TARGETS', 'DEFAULT_AIOSTREAMS_VERSION',
    `${src}\nreturn migrateState;`)(new Set(), {}, [], AIOSTREAMS_COMPATIBILITY_TARGETS, DEFAULT_AIOSTREAMS_VERSION);
  assert.equal(migrate({ _schema: 5, aiostreamsVersion: '2.35.7' }).aiostreamsVersion, DEFAULT_AIOSTREAMS_VERSION);
  assert.equal(migrate({ _schema: 5, aiostreamsVersion: '2.32.0' }).aiostreamsVersion, '2.32.0', 'any other target was picked on purpose');
  assert.equal(migrate({ _schema: 6, aiostreamsVersion: '2.35.7' }).aiostreamsVersion, '2.35.7', 'a 2.35.7 picked after the move is kept');
});

test('resolveHostCapabilities falls back to the registry version when the probe is blocked', () => {
  assert.equal(resolveHostCapabilities('elfhosted', null).version, '2.36.0');
  assert.equal(resolveHostCapabilities('midnight', null).version, '2.36.0');
  // keep hosts on different versions here, or this stops proving the
  // fallback reads the registry rather than a constant
  assert.equal(resolveHostCapabilities('omni', null).version, '2.35.9');
  assert.equal(resolveHostCapabilities('wizaardd', null).version, '2.36.0');
  // a live probe still wins
  const probed = resolveHostCapabilities('elfhosted', { reachable: true, version: '9.9.9', regexAccess: 'trusted', disabledPresetIds: [], blockedStreamTypes: [] });
  assert.equal(probed.version, '9.9.9');
  // unknown/self-hosted hosts have no registry entry — caller's assumption applies
  assert.equal(resolveHostCapabilities('custom', null, { assumedVersion: '2.31.1' }).version, '2.31.1');
  assert.equal(resolveHostCapabilities('custom', null).version, null);
});

/* ── picker labels ─────────────────────────────────────────────────────────── */

test('ElfHosted\'s label states its restriction exactly: Debrid only — no P2P/HTTP', () => {
  assert.equal(hostCapabilityLabel(HOST_META.elfhosted), 'Debrid only — no P2P/HTTP');
});

test('full-service hosts state Debrid + P2P + HTTP', () => {
  assert.equal(hostCapabilityLabel(HOST_META.fortheweak), 'Debrid + P2P + HTTP');
  assert.equal(hostCapabilityLabel(HOST_META.midnight), 'Debrid + P2P + HTTP');
});

test('every picker label carries the host\'s AIOStreams version', () => {
  assert.match(hostPickerLabel('elfhosted'), /ElfHosted .*Debrid only — no P2P\/HTTP.*v2\.36\.0/);
  assert.match(hostPickerLabel('fortheweak'), /v2\.36\.0/);
  assert.match(hostPickerLabel('midnight'), /v2\.36\.0/);
  assert.match(hostPickerLabel('wizaardd'), /v2\.36\.0/);
  assert.match(hostPickerLabel('omni'), /\(legacy\).*v2\.35\.9/);
  assert.match(hostPickerLabel('viren'), /nightly/);
});

/* ── required-version derivation ───────────────────────────────────────────── */

test('a config using version-gated keys requires the newest key\'s floor', () => {
  assert.equal(configRequiredAIOStreamsVersion({ variants: [] }), FEATURE_MIN_VERSIONS.variants);
  assert.equal(
    configRequiredAIOStreamsVersion({ variants: [], variantSelectorLocation: 'path' }),
    FEATURE_MIN_VERSIONS.variantSelectorLocation,
  );
  assert.equal(configRequiredAIOStreamsVersion({ sortCriteria: {} }), null, 'no gated keys → no requirement');
  assert.equal(configRequiredAIOStreamsVersion(null), null);
});

test('a hypothetical 2.34-only key raises the requirement (table injected, rule real)', () => {
  const min = { ...FEATURE_MIN_VERSIONS, someFutureKey: '2.34.0' };
  assert.equal(configRequiredAIOStreamsVersion({ someFutureKey: 1 }, min), '2.34.0');
});

test('an enabled anime-tosho-new preset requires 2.36.0; a disabled one does not', () => {
  // 2.35.9 and older require an API key for it, and the generators send none.
  const preset = { type: 'anime-tosho-new', instanceId: 'nx-at-01', enabled: true, options: {} };
  assert.equal(configRequiredAIOStreamsVersion({ presets: [preset] }), '2.36.0');
  assert.equal(configRequiredAIOStreamsVersion({ presets: [{ ...preset, enabled: false }] }), null);
  assert.equal(configRequiredAIOStreamsVersion({ presets: [{ ...preset, type: 'animetosho' }] }), null, 'the archived preset saves on 2.35.x');
  assert.equal(configRequiredAIOStreamsVersion({ variantSelectorLocation: 'path', presets: [preset] }), '2.36.0', 'the higher floor wins');
});

/* ── the routing matrix ────────────────────────────────────────────────────── */

const capsFor = (key, probeVersion) => {
  const probe = probeVersion
    ? { reachable: true, version: probeVersion, regexAccess: 'trusted', disabledPresetIds: [], blockedStreamTypes: [] }
    : null;
  return resolveHostCapabilities(key, probe);
};

test('a P2P config can never be routed to ElfHosted', () => {
  const decision = hostRoutingDecision({ service: 'p2p', config: {} }, capsFor('elfhosted'));
  assert.equal(decision.status, 'blocked');
  assert.match(decision.reasons[0], /ElfHosted/);
  assert.match(decision.reasons[0], /P2P/);
});

test('a P2P config routes fine to ForTheWeak', () => {
  assert.equal(hostRoutingDecision({ service: 'p2p', config: {} }, capsFor('fortheweak')).status, 'ok');
});

test('an HTTP config is blocked on ElfHosted too', () => {
  assert.equal(hostRoutingDecision({ service: 'http', config: {} }, capsFor('elfhosted')).status, 'blocked');
});

test('a config needing 2.33.2+ is blocked on an older host', () => {
  const config = { variantSelectorLocation: 'path' };
  assert.equal(hostRoutingDecision({ service: 'torbox-pro', config }, capsFor('custom', '2.33.0')).status, 'blocked');
  assert.equal(hostRoutingDecision({ service: 'torbox-pro', config }, capsFor('omni')).status, 'ok', 'a 2.35.9 host satisfies the 2.33.2 floor');
});

test('an Anime build carrying anime-tosho-new is blocked on Omni\'s and routes to the 2.36.0 hosts', () => {
  // The real preset floor over the REAL registry hosts — no injected table.
  const request = { service: 'torbox-pro', config: { presets: [{ type: 'anime-tosho-new', instanceId: 'nx-at-01', enabled: true, options: {} }] } };
  const decision = hostRoutingDecision(request, capsFor('omni'));
  assert.equal(decision.status, 'blocked');
  assert.match(decision.reasons[0], /needs 2\.36\.0\+/);
  for (const key of ['elfhosted', 'fortheweak', 'viren', 'kuu', 'midnight', 'atbp', 'wizaardd']) {
    assert.equal(hostRoutingDecision(request, capsFor(key)).status, 'ok', key);
  }
});

test('a host behind the selected target warns instead of silently receiving 2.34-defaults', () => {
  // No public host is behind 2.34.1 any more; a probed self-hosted 2.33.2 is.
  const decision = hostRoutingDecision({ service: 'torbox-pro', config: {} }, capsFor('custom', '2.33.2'), { targetVersion: '2.34.1' });
  assert.equal(decision.status, 'warn');
  assert.match(decision.reasons[0], /2\.33\.2/);
  assert.equal(hostRoutingDecision({ service: 'torbox-pro', config: {} }, capsFor('elfhosted'), { targetVersion: '2.34.1' }).status, 'ok');
  assert.equal(hostRoutingDecision({ service: 'torbox-pro', config: {} }, capsFor('custom', '2.33.2'), { targetVersion: 'unknown' }).status, 'ok', 'unknown target must not nag');
});

/* ── auto-routing ──────────────────────────────────────────────────────────── */

test('auto routing excludes ElfHosted for P2P and keeps the capable hosts', () => {
  const keys = autoRoutableHostKeys({ service: 'p2p', config: {} });
  assert.ok(!keys.includes('elfhosted'));
  for (const key of ['fortheweak', 'midnight', 'kuu', 'atbp', 'wizaardd']) {
    assert.ok(keys.includes(key), `${key} should be auto-routable for P2P`);
  }
});

test('auto routing excludes every older host for a config above its version', () => {
  // A hypothetical 2.36.1 floor (injected) drops the whole fleet; the real
  // anime-tosho-new floor drops only Omni's.
  const min = { ...FEATURE_MIN_VERSIONS, futureOption: '2.36.1' };
  assert.deepEqual(autoRoutableHostKeys({ service: 'torbox-pro', config: { futureOption: true } }, { minVersions: min }), []);
  const anime = autoRoutableHostKeys({ service: 'torbox-pro', config: { presets: [{ type: 'anime-tosho-new', instanceId: 'nx-at-01', options: {} }] } });
  assert.ok(!anime.includes('omni'), 'omni (2.35.9) must not receive anime-tosho-new');
  for (const key of ['elfhosted', 'fortheweak', 'viren', 'kuu', 'midnight', 'atbp', 'wizaardd']) assert.ok(anime.includes(key), `${key} should stay routable`);
});

test('auto routing keeps every host for a config with no gated keys', () => {
  const keys = autoRoutableHostKeys({ service: 'torbox-pro', config: {} });
  assert.equal(keys.length, Object.keys(HOST_META).length);
});
