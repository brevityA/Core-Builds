import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  compareVersions, isVersionAtLeast, knownHostKeys, parseHostStatus,
  resolveHostCapabilities, hostOptionGate, gateConfigForHost, gateTemplateForHost,
  describeRemovals,
} from '../src/core/host-capability-policy.js';
import { KNOWN_DEAD_CONFIG_KEYS, LEGACY_MIGRATED_CONFIG_KEYS } from '../src/data/host-capabilities.js';
import { AIO_CONFIG_KEY_SET } from '../src/config/generated/aiostreams-config-schema.js';
import { AIO_PRESET_ID_SET } from '../src/data/generated/aiostreams-presets.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(HERE, '..', 'e2e', 'golden');
const goldens = readdirSync(GOLDEN_DIR).filter(f => f.endsWith('.json'))
  .map(f => ({ name: f, template: JSON.parse(readFileSync(join(GOLDEN_DIR, f), 'utf8')) }));

/* ── version helpers ───────────────────────────────────────────────────────── */

test('compareVersions orders numerically, not lexically', () => {
  assert.equal(compareVersions('2.9.0', '2.10.0'), -1);
  assert.equal(compareVersions('2.33.2', '2.33.2'), 0);
  assert.equal(compareVersions('2.33.10', '2.33.2'), 1);
  assert.equal(compareVersions('2.33', '2.33.0'), 0);
  assert.equal(compareVersions('2026.08.29.2114-nightly', '2.33.0'), 1);
});

test('isVersionAtLeast is inclusive at the floor', () => {
  assert.ok(isVersionAtLeast('2.33.0', '2.33.0'));
  assert.ok(!isVersionAtLeast('2.32.9', '2.33.0'));
});

/* ── probe parsing ─────────────────────────────────────────────────────────── */

const ELF_STATUS = {
  success: true,
  data: {
    version: '2.33.2', tag: 'v2.33.2', commit: 'f36d0f93', channel: 'stable',
    settings: {
      baseUrl: 'https://aiostreams.elfhosted.com',
      regexAccess: { level: 'none', patterns: ['/\\b(IMAX)\\b/i'] },
      customHtml: "Torrentio, AnimeKitsu, and Torrent Catalogs are disabled here, respecting the Torrentio developer's request that hosts not scrape their instance. P2P and HTTP streams are also disabled to reduce liability.",
    },
  },
};

test('parseHostStatus reads version, regex access and prose-declared restrictions', () => {
  const probe = parseHostStatus(ELF_STATUS);
  assert.equal(probe.version, '2.33.2');
  assert.equal(probe.channel, 'stable');
  assert.equal(probe.regexAccess, 'none');
  assert.deepEqual(probe.allowedRegexPatterns, ['/\\b(IMAX)\\b/i']);
  assert.deepEqual(probe.disabledPresetIds.sort(), ['anime-kitsu', 'torrent-catalogs', 'torrentio']);
  assert.deepEqual(probe.blockedStreamTypes.sort(), ['http', 'p2p']);
});

test('parseHostStatus rejects anything that is not an AIOStreams status', () => {
  assert.equal(parseHostStatus(null), null);
  assert.equal(parseHostStatus({}), null);
  assert.equal(parseHostStatus({ name: 'Core Builds', short_name: 'CB' }), null); // PWA manifest
});

test('parseHostStatus never surfaces credential-shaped fields', () => {
  const probe = parseHostStatus({ data: { ...ELF_STATUS.data, settings: { ...ELF_STATUS.data.settings, secret: 'nope' } } });
  assert.ok(!('secret' in probe));
  assert.ok(!JSON.stringify(probe).includes('nope'));
});

/* ── registry merge ────────────────────────────────────────────────────────── */

test('every registry host resolves to a usable capability record', () => {
  for (const key of knownHostKeys()) {
    const caps = resolveHostCapabilities(key);
    assert.equal(caps.key, key);
    assert.ok(caps.label, `${key} has a label`);
    assert.ok(['none', 'trusted', 'all'].includes(caps.regexAccess), `${key} regexAccess`);
    assert.ok(Array.isArray(caps.disabledPresetIds));
    assert.ok(Array.isArray(caps.blockedStreamTypes));
  }
});

test('an unknown host key falls back to the self-hosted profile', () => {
  const caps = resolveHostCapabilities('someones-random-box');
  assert.equal(caps.kind, 'self-hosted');
  assert.equal(caps.confirmed, false, 'unprobed self-hosted must be user-confirmed');
});

test('the stricter of registry and probe wins for regex access', () => {
  const loose = resolveHostCapabilities('fortheweak', { reachable: true, version: '2.33.2', regexAccess: 'all', disabledPresetIds: [], blockedStreamTypes: [] });
  assert.equal(loose.regexAccess, 'trusted', 'a permissive probe cannot loosen the registry');
  const strict = resolveHostCapabilities('fortheweak', { reachable: true, version: '2.33.2', regexAccess: 'none', disabledPresetIds: [], blockedStreamTypes: [] });
  assert.equal(strict.regexAccess, 'none', 'a stricter probe must tighten the registry');
});

test('a probe adds restrictions the registry did not know about', () => {
  const caps = resolveHostCapabilities('custom', parseHostStatus(ELF_STATUS));
  assert.ok(caps.disabledPresetIds.includes('torrentio'));
  assert.ok(caps.blockedStreamTypes.includes('p2p'));
  assert.equal(caps.confirmed, true, 'a reachable probe confirms the host');
});

/* ── UI gate: host × option matrix ─────────────────────────────────────────── */

const GATE_MATRIX = [
  { host: 'elfhosted', option: 'preset:torrentio', blocked: true },
  { host: 'elfhosted', option: 'preset:anime-kitsu', blocked: true },
  { host: 'elfhosted', option: 'service:p2p', blocked: true },
  { host: 'elfhosted', option: 'service:http', blocked: true },
  { host: 'elfhosted', option: 'customRegex', blocked: true },
  { host: 'fortheweak', option: 'preset:torrentio', blocked: false },
  { host: 'fortheweak', option: 'service:p2p', blocked: false },
  { host: 'fortheweak', option: 'customRegex', blocked: false },
  { host: 'viren', option: 'preset:torrentio', blocked: false },
  { host: 'viren', option: 'service:p2p', blocked: false },
  { host: 'custom', option: 'preset:torrentio', blocked: false },
  { host: 'custom', option: 'service:p2p', blocked: false },
  { host: 'torbox', option: 'preset:torrentio', blocked: false },
];

for (const row of GATE_MATRIX) {
  test(`gate matrix: ${row.host} ${row.blocked ? 'blocks' : 'allows'} ${row.option}`, () => {
    const gate = hostOptionGate(resolveHostCapabilities(row.host, null, { assumedVersion: '2.33.2' }));
    const hit = gate.find(entry => entry.option === row.option && entry.action !== 'confirm');
    assert.equal(Boolean(hit), row.blocked);
    if (hit) assert.ok(hit.reason.length > 10, 'a blocked option carries a readable reason');
  });
}

test('every gate entry has exactly one single-line reason', () => {
  for (const key of knownHostKeys()) {
    for (const entry of hostOptionGate(resolveHostCapabilities(key, null, { assumedVersion: '2.33.2' }))) {
      assert.ok(entry.reason, `${key}/${entry.option} reason`);
      assert.ok(!entry.reason.includes('\n'), `${key}/${entry.option} reason is one line`);
      assert.ok(['disable', 'hide', 'confirm'].includes(entry.action));
    }
  }
});

test('hosts that need a probe ask the user to confirm when offline', () => {
  const gate = hostOptionGate(resolveHostCapabilities('custom'));
  const confirm = gate.find(entry => entry.action === 'confirm');
  assert.ok(confirm, 'offline self-hosted must fall back to a user-confirmed selection');
  assert.match(confirm.reason, /confirm the host/i);
});

test('an old host has its too-new config keys gated out', () => {
  const gate = hostOptionGate(resolveHostCapabilities('custom', { reachable: true, version: '2.32.0', regexAccess: 'trusted', disabledPresetIds: [], blockedStreamTypes: [] }));
  assert.ok(gate.some(entry => entry.option === 'config:variants'));
  assert.ok(gate.every(entry => entry.option !== 'config:variants' || /2\.33\.0\+/.test(entry.reason)));
});

/* ── export gate ───────────────────────────────────────────────────────────── */

const elf = () => resolveHostCapabilities('elfhosted', parseHostStatus(ELF_STATUS));

test('gateConfigForHost never mutates its input', () => {
  const input = { maxResults: 9, presets: [{ type: 'torrentio', instanceId: 'a' }] };
  const snapshot = JSON.stringify(input);
  gateConfigForHost(input, elf());
  assert.equal(JSON.stringify(input), snapshot);
});

test('keys absent from the pinned schema are dropped, with a reason', () => {
  const { config, removals } = gateConfigForHost({ maxResults: 9, sortCriteria: {} }, elf());
  assert.ok(!('maxResults' in config));
  assert.ok(removals.some(r => r.target === 'maxResults' && /schema/i.test(r.reason)));
  assert.ok('sortCriteria' in config);
});

test('legacy keys AIOStreams still migrates survive the gate', () => {
  for (const key of LEGACY_MIGRATED_CONFIG_KEYS) {
    const { config } = gateConfigForHost({ [key]: { enabled: false } }, elf());
    assert.ok(key in config, `${key} must not be stripped — upstream migrates it`);
  }
});

test('every KNOWN_DEAD_CONFIG_KEYS entry really is absent from the pinned schema', () => {
  for (const key of KNOWN_DEAD_CONFIG_KEYS) {
    assert.ok(!AIO_CONFIG_KEY_SET.has(key), `${key} is documented dead but IS in the schema`);
  }
});

test('a preset the host disables is removed and unreferenced from groups', () => {
  const { config, removals } = gateConfigForHost({
    presets: [{ type: 'torrentio', instanceId: 'tor' }, { type: 'comet', instanceId: 'com' }],
    groups: { enabled: true, groupings: [{ condition: 'true', addons: ['tor', 'com'] }, { condition: 'true', addons: ['tor'] }] },
  }, elf());
  assert.deepEqual(config.presets.map(p => p.type), ['comet']);
  assert.deepEqual(config.groups.groupings.map(g => g.addons), [['com']]);
  assert.ok(removals.some(r => r.kind === 'preset' && r.target === 'torrentio'));
});

test('a preset id upstream cannot resolve is removed even on an unrestricted host', () => {
  const { config, removals } = gateConfigForHost(
    { presets: [{ type: 'debrider', instanceId: 'x' }, { type: 'comet', instanceId: 'y' }] },
    resolveHostCapabilities('custom', { reachable: true, version: '2.33.2', regexAccess: 'all', disabledPresetIds: [], blockedStreamTypes: [] }),
  );
  assert.ok(!AIO_PRESET_ID_SET.has('debrider'), 'guard: debrider is genuinely not an upstream preset id');
  assert.deepEqual(config.presets.map(p => p.type), ['comet']);
  assert.ok(removals.some(r => r.kind === 'preset' && r.target === 'debrider'));
});

test('stream types the host does not serve are excluded, not merely unpreferred', () => {
  const { config } = gateConfigForHost({ preferredStreamTypes: ['p2p', 'debrid'] }, elf());
  assert.ok(config.excludedStreamTypes.includes('p2p'));
  assert.ok(config.excludedStreamTypes.includes('http'));
  assert.deepEqual(config.preferredStreamTypes, ['debrid']);
});

test('non-whitelisted regex is removed on a regexAccess:none host', () => {
  const { config, removals } = gateConfigForHost({
    excludedRegexPatterns: ['/(?<=\\bS\\d+\\b).*\\b(Extras)\\b/i'],
    rankedRegexPatterns: [{ name: 'IMAX ok', pattern: '/\\b(IMAX)\\b/i' }],
  }, elf());
  assert.deepEqual(config.excludedRegexPatterns, [], 'lookbehind pattern must go');
  assert.equal(config.rankedRegexPatterns.length, 1, "the host's own whitelisted pattern must stay");
  assert.ok(removals.some(r => r.kind === 'regex'));
});

test('a trusted user on a trusted host keeps their regex', () => {
  const caps = resolveHostCapabilities('fortheweak', null, { trustedUser: true });
  const patterns = [{ name: 'custom', pattern: '/\\b(WHATEVER)\\b/i' }];
  const { config, removals } = gateConfigForHost({ rankedRegexPatterns: patterns }, caps);
  assert.equal(config.rankedRegexPatterns.length, 1);
  assert.equal(removals.filter(r => r.kind === 'regex').length, 0);
});

test('synced regex URLs are dropped on a regexAccess:none host', () => {
  const { config, removals } = gateConfigForHost(
    { syncedRankedRegexUrls: ['https://raw.githubusercontent.com/Vidhin05/x/main/r.json'] }, elf());
  assert.deepEqual(config.syncedRankedRegexUrls, []);
  assert.ok(removals.some(r => r.kind === 'syncedRegex'));
});

test('describeRemovals renders one line per removal', () => {
  const lines = describeRemovals([{ kind: 'preset', target: 'torrentio', reason: 'disabled' }]);
  assert.deepEqual(lines, ['preset: torrentio — disabled']);
});

/* ── the hard guarantee, over the real golden configs ──────────────────────── */

test('golden fixtures exist to gate', () => {
  assert.ok(goldens.length >= 10, `expected the golden matrix, found ${goldens.length}`);
});

for (const host of ['elfhosted', 'fortheweak', 'viren', 'custom', 'torbox']) {
  test(`no golden config exported for ${host} contains a key or addon that host rejects`, () => {
    const caps = resolveHostCapabilities(host, host === 'elfhosted' ? parseHostStatus(ELF_STATUS) : null, { assumedVersion: '2.33.2' });
    for (const { name, template } of goldens) {
      const out = gateTemplateForHost(template, caps).template.config;
      for (const key of Object.keys(out)) {
        assert.ok(
          AIO_CONFIG_KEY_SET.has(key) || LEGACY_MIGRATED_CONFIG_KEYS.includes(key),
          `${name} @ ${host}: key "${key}" is not in the pinned schema`,
        );
      }
      for (const preset of out.presets || []) {
        assert.ok(!caps.disabledPresetIds.includes(preset.type), `${name} @ ${host}: disabled addon "${preset.type}" leaked into the export`);
        assert.ok(AIO_PRESET_ID_SET.has(preset.type), `${name} @ ${host}: unknown preset "${preset.type}"`);
      }
    }
  });
}

test('ElfHosted community exports can never contain Torrentio', () => {
  const caps = elf();
  for (const { name, template } of goldens) {
    const out = gateTemplateForHost(template, caps).template.config;
    const json = JSON.stringify(out.presets || []);
    assert.ok(!/"type"\s*:\s*"torrentio"/.test(json), `${name}: torrentio survived the ElfHosted gate`);
  }
});

test('gating is idempotent — a gated config gates to itself', () => {
  const caps = elf();
  for (const { name, template } of goldens) {
    const once = gateTemplateForHost(template, caps).template;
    const twice = gateTemplateForHost(once, caps);
    assert.equal(JSON.stringify(twice.template), JSON.stringify(once), `${name} is not gate-stable`);
    assert.deepEqual(twice.removals, [], `${name} still had removals on the second pass`);
  }
});

/* ── synced regex URLs are their own allowlist ─────────────────────────────────
 *
 * Regression cover for a gate bug: `regexAccess: 'none'` was read as "no regex
 * at all" and every synced-regex URL field was cleared. Upstream checks synced
 * URLs separately (validateSyncedRegexUrls -> RegexAccess.getAllowedUrls) and a
 * restricted host still publishes URLs it permits — ElfHosted allows the
 * Vidhin05 feed this configurator emits. The blanket clear deleted a working,
 * host-sanctioned feature from three golden profiles.
 */

const VIDHIN = 'https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json';
const RANDOM_FEED = 'https://example.invalid/someone-elses-regexes.json';

test('a host-allowed synced regex URL survives a regexAccess:none host', () => {
  const caps = resolveHostCapabilities('elfhosted', null);
  assert.equal(caps.regexAccess, 'none');
  const { config, removals, warnings } = gateConfigForHost({ syncedRankedRegexUrls: [VIDHIN] }, caps);
  assert.deepEqual(config.syncedRankedRegexUrls, [VIDHIN], 'ElfHosted publishes this URL as allowed');
  assert.equal(removals.filter(r => r.kind === 'syncedRegex').length, 0);
  assert.equal(warnings.length, 0, 'a verified-allowed URL should not warn either');
});

test('an unverifiable synced regex URL is kept with a warning, never silently dropped', () => {
  const caps = resolveHostCapabilities('elfhosted', null);
  assert.equal(caps.urlAllowlistIsComplete, false, 'no probe means no complete allowlist');
  const { config, removals, warnings } = gateConfigForHost({ syncedRankedRegexUrls: [RANDOM_FEED] }, caps);
  assert.deepEqual(config.syncedRankedRegexUrls, [RANDOM_FEED], 'absence of data is not evidence of prohibition');
  assert.equal(removals.filter(r => r.kind === 'syncedRegex').length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].reason, /could not be probed/);
});

test('a live probe completes the allowlist and only then removes a forbidden URL', () => {
  const probe = parseHostStatus({
    data: {
      version: '2.33.2',
      settings: { regexAccess: { level: 'none', patterns: [], urls: [VIDHIN] } },
    },
  });
  assert.deepEqual(probe.allowedRegexUrls, [VIDHIN], 'the probe must read regexAccess.urls');

  const caps = resolveHostCapabilities('elfhosted', probe);
  assert.equal(caps.urlAllowlistIsComplete, true);
  const { config, removals, warnings } = gateConfigForHost(
    { syncedRankedRegexUrls: [VIDHIN, RANDOM_FEED] }, caps);
  assert.deepEqual(config.syncedRankedRegexUrls, [VIDHIN]);
  assert.equal(warnings.length, 0);
  assert.equal(removals.filter(r => r.kind === 'syncedRegex').length, 1);
  assert.match(removals.find(r => r.kind === 'syncedRegex').reason, /does not list this URL/);
});

test('an unrestricted host keeps every synced regex URL untouched', () => {
  for (const key of ['fortheweak', 'viren']) {
    const caps = resolveHostCapabilities(key, null, { trustedUser: true });
    const { config, removals, warnings } = gateConfigForHost(
      { syncedRankedRegexUrls: [VIDHIN, RANDOM_FEED] }, caps);
    assert.deepEqual(config.syncedRankedRegexUrls, [VIDHIN, RANDOM_FEED], key);
    assert.equal(removals.filter(r => r.kind === 'syncedRegex').length, 0, key);
    assert.equal(warnings.length, 0, key);
  }
});

test('gating stays idempotent now that synced URLs are filtered rather than cleared', () => {
  const caps = resolveHostCapabilities('elfhosted', null);
  const first = gateConfigForHost({ syncedRankedRegexUrls: [VIDHIN, RANDOM_FEED] }, caps);
  const second = gateConfigForHost(first.config, caps);
  assert.deepEqual(second.config, first.config, 'gating an already-gated config must be a no-op');
  // The removals *log* is not idempotent by design — a second pass has nothing
  // left to strip, so it reports nothing. What must not happen is a synced URL
  // surviving pass one and being dropped by pass two.
  assert.equal(second.removals.filter(r => r.kind === 'syncedRegex').length, 0);
  assert.deepEqual(second.config.syncedRankedRegexUrls, first.config.syncedRankedRegexUrls);
});
