/**
 * Host routing + host-picker truthfulness (2026-09-06 audit, defect 4).
 *
 * The picker treated every host as interchangeable. These tests pin:
 *   - the registry's per-host AIOStreams versions (whole fleet on 2.35.x, 2026-10-02)
 *   - the capability + version label each picker shows before Deploy
 *   - the routing matrix: P2P can never target ElfHosted; a config needing a
 *     newer AIOStreams than a host runs is not routed there
 *   - every host runs at least the default target, so default output fits the whole fleet
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { HOST_META } from '../src/data/hosts.js';
import { AIOSTREAMS_COMPATIBILITY_TARGETS, DEFAULT_AIOSTREAMS_VERSION } from '../src/core/output-profile-policy.js';
import { resolveHostCapabilities, isVersionAtLeast } from '../src/core/host-capability-policy.js';
import {
  hostCapabilityLabel,
  hostPickerLabel,
  configRequiredAIOStreamsVersion,
  hostRoutingDecision,
  autoRoutableHostKeys,
} from '../src/core/host-routing.js';
import { FEATURE_MIN_VERSIONS } from '../src/data/host-capabilities.js';

/* ── the registry snapshot ─────────────────────────────────────────────────── */

test('every public host carries a known AIOStreams version', () => {
  for (const [key, meta] of Object.entries(HOST_META)) {
    assert.match(meta.aiostreamsVersion, /^\d+\.\d+\.\d+$/, `${key} has no registry version`);
  }
});

test('registry versions match the 2026-10-02 audit of the live fleet', () => {
  // Re-audited 2026-10-02 against each host's own /api/v1/status.
  const expected = {
    elfhosted: '2.35.7', fortheweak: '2.35.7', midnight: '2.35.7', kuu: '2.35.7', viren: '2.35.7',
    atbp: '2.35.5', omni: '2.35.5', wizaardd: '2.35.4',
  };
  for (const [key, version] of Object.entries(expected)) assert.equal(HOST_META[key].aiostreamsVersion, version, key);
});

test('every registry host runs at least the default target, so default output fits the fleet', () => {
  // The output targets the schema pin; a host may run newer. What must never
  // happen is the default target being newer than a public host.
  for (const [key, meta] of Object.entries(HOST_META)) {
    assert.ok(isVersionAtLeast(meta.aiostreamsVersion, DEFAULT_AIOSTREAMS_VERSION), `${key} (${meta.aiostreamsVersion}) is behind the default target`);
  }
  assert.ok(AIOSTREAMS_COMPATIBILITY_TARGETS.includes(DEFAULT_AIOSTREAMS_VERSION));
});

test('the default target is the pinned release and is itself a target', async () => {
  const { readFile } = await import('node:fs/promises');
  const pin = JSON.parse(await readFile(new URL('../UPSTREAM.pin', import.meta.url), 'utf8'));
  assert.equal(pin.version, DEFAULT_AIOSTREAMS_VERSION, 'the default target must be the pinned AIOStreams release');
  assert.ok(AIOSTREAMS_COMPATIBILITY_TARGETS.includes(DEFAULT_AIOSTREAMS_VERSION));
});

test('resolveHostCapabilities falls back to the registry version when the probe is blocked', () => {
  assert.equal(resolveHostCapabilities('elfhosted', null).version, '2.35.7');
  assert.equal(resolveHostCapabilities('midnight', null).version, '2.35.7');
  // keep hosts on different versions here, or this stops proving the
  // fallback reads the registry rather than a constant
  assert.equal(resolveHostCapabilities('omni', null).version, '2.35.5');
  assert.equal(resolveHostCapabilities('wizaardd', null).version, '2.35.4');
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
  assert.match(hostPickerLabel('elfhosted'), /ElfHosted .*Debrid only — no P2P\/HTTP.*v2\.35\.7/);
  assert.match(hostPickerLabel('fortheweak'), /v2\.35\.7/);
  assert.match(hostPickerLabel('midnight'), /v2\.35\.7/);
  assert.match(hostPickerLabel('wizaardd'), /v2\.35\.4/);
  assert.match(hostPickerLabel('omni'), /v2\.35\.5/);
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
  assert.equal(hostRoutingDecision({ service: 'torbox-pro', config }, capsFor('omni')).status, 'ok', '2.33.2 host satisfies the 2.33.2 floor');
});

test('a 2.35.6-only config is blocked on the older hosts and routes to the 2.35.7 ones', () => {
  // No real config key needs 2.35.6 (FEATURE_MIN_VERSIONS tops out at
  // 2.33.2), so this row injects a hypothetical floor through the documented
  // test hook and runs the REAL decision path over the REAL registry hosts.
  const min = { ...FEATURE_MIN_VERSIONS, futureOption: '2.35.6' };
  const request = { service: 'torbox-pro', config: { futureOption: true } };
  for (const key of ['atbp', 'omni', 'wizaardd']) {
    const decision = hostRoutingDecision(request, capsFor(key), { minVersions: min });
    assert.equal(decision.status, 'blocked', key);
    assert.match(decision.reasons[0], /needs 2\.35\.6\+/, key);
  }
  for (const key of ['elfhosted', 'fortheweak', 'viren', 'kuu', 'midnight']) {
    assert.equal(hostRoutingDecision(request, capsFor(key), { minVersions: min }).status, 'ok', key);
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

test('auto routing excludes every older host for a 2.35.6-only config', () => {
  const min = { ...FEATURE_MIN_VERSIONS, futureOption: '2.35.6' };
  const keys = autoRoutableHostKeys({ service: 'torbox-pro', config: { futureOption: true } }, { minVersions: min });
  for (const key of ['atbp', 'omni', 'wizaardd']) assert.ok(!keys.includes(key), `${key} must not receive a 2.35.6-only config`);
  for (const key of ['elfhosted', 'fortheweak', 'viren', 'kuu', 'midnight']) assert.ok(keys.includes(key), `${key} should stay routable`);
});

test('auto routing keeps every host for a config with no gated keys', () => {
  const keys = autoRoutableHostKeys({ service: 'torbox-pro', config: {} });
  assert.equal(keys.length, Object.keys(HOST_META).length);
});
