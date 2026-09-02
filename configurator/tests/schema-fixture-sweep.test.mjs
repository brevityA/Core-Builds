/**
 * Fixture sweep: device × service × resolution × host.
 *
 * Every combination is run through the pure policy layer and validated against
 * the generated upstream contract at the pinned ref, then through the host
 * gate. Anything the sweep emits that AIOStreams would not accept — an unknown
 * enum value, an unknown sort criterion, an addon the host disables — fails
 * here rather than in the user's browser.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { resolutionPolicy, encodePolicy, audioPolicy } from '../src/core/device-policies.js';
import { sortPolicy } from '../src/core/sort-policy.js';
import { sizePolicy, bitratePolicy } from '../src/core/filter-policy.js';
import { DEVICE_PROFILES, DEVICE_AV1_SAFE, DEVICE_FORCE_LIMITED_AUDIO } from '../src/data/devices.js';
import { FORMATTERS } from '../src/data/formatters.js';
import { resolveHostCapabilities, gateConfigForHost, knownHostKeys } from '../src/core/host-capability-policy.js';
import {
  AIO_RESOLUTIONS, AIO_QUALITIES, AIO_VISUAL_TAGS, AIO_AUDIO_TAGS,
  AIO_AUDIO_CHANNELS, AIO_ENCODES, AIO_STREAM_TYPES, AIO_SERVICES, AIO_FORMATTERS,
} from '../src/data/generated/aiostreams-enums.js';
import { invalidSortCriteria } from '../src/config/generated/aiostreams-sort-schema.js';
import { AIO_CONFIG_KEY_SET } from '../src/config/generated/aiostreams-config-schema.js';

const DEVICES = Object.keys(DEVICE_PROFILES);
const SERVICES = ['torbox-pro', 'torbox-ess', 'realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'offcloud', 'easynews', 'debridio', 'easydebrid', 'pikpak', 'seedr', 'multi', 'hybrid', 'usenet', 'p2p', 'http'];
const RESOLUTIONS = ['4k', '1080p', 'mixed', 'ultrawide'];
const HOSTS = knownHostKeys();

test('the sweep axes are non-trivial', () => {
  assert.ok(DEVICES.length >= 5, `only ${DEVICES.length} devices`);
  assert.equal(SERVICES.length, 17);
  assert.equal(RESOLUTIONS.length, 4);
  assert.ok(HOSTS.length >= 8, `only ${HOSTS.length} hosts`);
});

const subsetOf = (values, allowed, label) => {
  for (const value of values || []) {
    assert.ok(allowed.includes(value), `${label}: "${value}" is not a value AIOStreams accepts at the pinned ref`);
  }
};

test('device × resolution: every emitted resolution value exists upstream', () => {
  let combos = 0;
  for (const device of DEVICES) {
    for (const resolution of RESOLUTIONS) {
      for (const streamPool of ['normal', 'large', 'max']) {
        combos += 1;
        const state = { device, resolution, streamPool };
        const res = resolutionPolicy(state);
        subsetOf(res.excludedResolutions, AIO_RESOLUTIONS, `${device}/${resolution} excluded`);
        subsetOf(res.includedResolutions, AIO_RESOLUTIONS, `${device}/${resolution} included`);
        subsetOf(res.requiredResolutions, AIO_RESOLUTIONS, `${device}/${resolution} required`);
        subsetOf(res.preferredResolutions, AIO_RESOLUTIONS, `${device}/${resolution} preferred`);
        // A resolution that is neither excluded nor preferred scores -Infinity
        // and sorts below everything — that was the 1440p bug. The 4K profile
        // must account for every resolution AIOStreams knows about. (The 1080p
        // profile deliberately leaves 2160p unranked: that IS 1080p-first.)
        if (resolution === '4k') {
          for (const value of AIO_RESOLUTIONS) {
            const known = res.preferredResolutions.includes(value) || res.excludedResolutions.includes(value);
            assert.ok(known, `${device}/4k: "${value}" is neither preferred nor excluded — it would sort last`);
          }
        }
      }
    }
  }
  assert.equal(combos, DEVICES.length * 12);
});

test('device: every emitted encode and audio value exists upstream', () => {
  for (const device of DEVICES) {
    for (const audio of ['lossless', 'standard', 'limited', 'dolby']) {
      const enc = encodePolicy({ device }, DEVICE_AV1_SAFE);
      subsetOf(enc.excludedEncodes, AIO_ENCODES, `${device} excludedEncodes`);
      subsetOf(enc.preferredEncodes, AIO_ENCODES, `${device} preferredEncodes`);
      const aud = audioPolicy({ device, audio }, DEVICE_FORCE_LIMITED_AUDIO);
      subsetOf(aud.excludedAudioTags, AIO_AUDIO_TAGS, `${device}/${audio} excludedAudioTags`);
      subsetOf(aud.preferredAudioTags, AIO_AUDIO_TAGS, `${device}/${audio} preferredAudioTags`);
      subsetOf(aud.preferredAudioChannels, AIO_AUDIO_CHANNELS, `${device}/${audio} preferredAudioChannels`);
    }
  }
});

test('service × resolution: every emitted sort criteria list is valid upstream', () => {
  let combos = 0;
  for (const service of SERVICES) {
    for (const resolution of RESOLUTIONS) {
      for (const flags of [{}, { qualityFirst: true }, { resolutionFirst: true }]) {
        combos += 1;
        const state = { service, resolution, ...flags };
        const problems = invalidSortCriteria(sortPolicy(state));
        assert.deepEqual(problems, [], `${service}/${resolution}${JSON.stringify(flags)}: ${problems.join(' | ')}`);
      }
    }
  }
  assert.equal(combos, SERVICES.length * RESOLUTIONS.length * 3);
});

test('the 4K tier guarantee holds across every device and service in the sweep', () => {
  for (const device of DEVICES) {
    for (const service of SERVICES) {
      const criteria = sortPolicy({ device, service, resolution: '4k' });
      for (const [scope, list] of Object.entries(criteria)) {
        assert.equal(list[0].key, 'resolution', `${device}/${service} scope ${scope} lost the 4K tier`);
      }
    }
  }
});

test('size and bitrate policies stay within upstream range shapes', () => {
  for (const resolution of RESOLUTIONS) {
    for (const device of DEVICES) {
      const state = { resolution, device };
      for (const [name, value] of [['size', sizePolicy(state)], ['bitrate', bitratePolicy(state)]]) {
        if (value == null) continue;
        assert.equal(typeof value, 'object', `${name} for ${resolution}/${device}`);
        // size/bitrate are nested { global|resolution: { <res>: { movies|series: [min, max] } } }
        const walk = (node, path) => {
          if (node === null) return;
          if (Array.isArray(node)) {
            assert.equal(node.length, 2, `${name} ${path}: a range must be [min, max]`);
            const [min, max] = node;
            for (const bound of node) {
              assert.ok(bound === null || (typeof bound === 'number' && Number.isFinite(bound) && bound >= 0),
                `${name} ${path}: bound must be a non-negative finite number or null, got ${JSON.stringify(bound)}`);
            }
            if (typeof min === 'number' && typeof max === 'number') {
              assert.ok(min <= max, `${name} ${path}: min ${min} exceeds max ${max}`);
            }
            return;
          }
          if (typeof node === 'object') {
            for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
            return;
          }
          if (typeof node === 'boolean') return; // flags such as bitrate.useMetadataRuntime
          assert.fail(`${name} ${path}: unexpected leaf ${typeof node}`);
        };
        walk(value, `${resolution}/${device}`);
      }
    }
  }
});

/* ── formatter output ──────────────────────────────────────────────────────── */

test('every Core Builds formatter maps onto an upstream formatter id', () => {
  assert.ok(AIO_FORMATTERS.includes('custom'), 'guard: upstream still supports custom formatters');
  for (const formatter of FORMATTERS) {
    assert.ok(formatter.id, 'formatter without an id');
    assert.ok(formatter.label, `${formatter.id} has no label`);
    // Core Builds ships its own named presets, which upstream receives as
    // `{ id: 'custom', definition: { name, description } }`.
    assert.ok(AIO_FORMATTERS.includes(formatter.id) || typeof formatter.name === 'string',
      `${formatter.id} is neither an upstream id nor a custom definition`);
  }
});

test('formatter templates only reference balanced placeholders', () => {
  for (const formatter of FORMATTERS) {
    for (const field of ['name', 'description']) {
      const template = formatter[field];
      if (typeof template !== 'string') continue;
      let depth = 0;
      for (const ch of template) {
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        assert.ok(depth >= 0, `${formatter.id}.${field} closes a placeholder that was never opened`);
      }
      assert.equal(depth, 0, `${formatter.id}.${field} leaves ${depth} placeholder(s) unclosed`);
    }
  }
});

test('formatter previews never embed a credential-shaped string', () => {
  const shapes = [/\bghp_[A-Za-z0-9]{20,}/, /\bsk-[A-Za-z0-9]{20,}/, /\b[0-9a-f]{32,}\b/i];
  const body = JSON.stringify(FORMATTERS);
  for (const shape of shapes) assert.equal(shape.test(body), false, `formatter data matches ${shape}`);
});

/* ── host axis ─────────────────────────────────────────────────────────────── */

test('device × service × resolution × host: gated output is always schema-clean', () => {
  let combos = 0;
  for (const host of HOSTS) {
    const caps = resolveHostCapabilities(host, null, { assumedVersion: '2.33.2' });
    for (const device of DEVICES) {
      for (const service of SERVICES) {
        for (const resolution of RESOLUTIONS) {
          combos += 1;
          const state = { device, service, resolution };
          const res = resolutionPolicy(state);
          const enc = encodePolicy(state, DEVICE_AV1_SAFE);
          const aud = audioPolicy(state, DEVICE_FORCE_LIMITED_AUDIO);
          const draft = {
            ...res, ...enc, ...aud,
            sortCriteria: sortPolicy(state),
            preferredStreamTypes: service === 'p2p' ? ['p2p'] : service === 'http' ? ['http'] : ['debrid'],
            presets: [{ type: 'torrentio', instanceId: 'a' }, { type: 'comet', instanceId: 'b' }],
          };
          const { config } = gateConfigForHost(draft, caps);
          for (const key of Object.keys(config)) {
            assert.ok(AIO_CONFIG_KEY_SET.has(key), `${host}/${device}/${service}/${resolution}: unknown key "${key}"`);
          }
          subsetOf(config.excludedStreamTypes, AIO_STREAM_TYPES, `${host} excludedStreamTypes`);
          subsetOf(config.preferredStreamTypes, AIO_STREAM_TYPES, `${host} preferredStreamTypes`);
          for (const preset of config.presets || []) {
            assert.ok(!caps.disabledPresetIds.includes(preset.type),
              `${host}/${device}/${service}/${resolution}: "${preset.type}" leaked past the gate`);
          }
        }
      }
    }
  }
  assert.equal(combos, HOSTS.length * DEVICES.length * SERVICES.length * RESOLUTIONS.length);
  assert.ok(combos > 3000, `sweep only covered ${combos} combinations`);
});

test('the service ids Core Builds offers map onto upstream service ids', () => {
  // p2p / http / multi / hybrid / usenet are Core Builds lanes, not upstream
  // services; everything else must be a real upstream service id.
  // Core Builds lanes that are not upstream *services*:
  //  p2p/http/multi/hybrid/usenet — configurator-only composition modes
  //  torbox-pro/torbox-ess        — both map to the upstream service "torbox"
  //  debridio                     — an upstream ADDON PRESET, not a service
  const LANES = new Set(['p2p', 'http', 'multi', 'hybrid', 'usenet', 'torbox-pro', 'torbox-ess', 'debridio']);
  for (const service of SERVICES) {
    if (LANES.has(service)) continue;
    assert.ok(AIO_SERVICES.includes(service), `"${service}" is not an upstream service id`);
  }
  assert.ok(AIO_SERVICES.includes('torbox'), 'guard: torbox-pro/ess both map to upstream "torbox"');
});

test('quality and visual tag vocabularies used by the sweep exist upstream', () => {
  subsetOf(['BluRay REMUX', 'BluRay', 'WEB-DL', 'WEBRip', 'HDTV'], AIO_QUALITIES, 'test quality vocabulary');
  subsetOf(['HDR', 'HDR10+', 'DV'], AIO_VISUAL_TAGS, 'test visual tag vocabulary');
});

/* ── the second, later-applied copy of the resolution preference list ──────── */

test('applyOutputProfile does not reintroduce an unranked resolution', async () => {
  // output-profile-policy.js keeps its own copy of the preference list and is
  // applied AFTER device-policies.js, so it silently wins. This caught 1440p
  // being restored in one place and still missing in the other.
  const { applyOutputProfile } = await import('../src/core/output-profile-policy.js');
  const ctx = resolution => ({
    outputProfile: 'stable', simpleMode: true, service: 'torbox-pro',
    multiServices: ['torbox-pro'], optionalScrapers: [], resolution,
    content: 'all', langs: ['English'], qualityFirst: false, resolutionFirst: false,
    aiostreamsVersion: '2.32.0',
  });
  // Seed the config the way build() does, so the profile runs over a realistic
  // input rather than an empty one.
  const template = (resolution) => ({
    metadata: {},
    config: {
      presets: [], services: [], sortCriteria: {}, resultLimits: {},
      ...resolutionPolicy({ resolution, device: 'generic' }),
    },
  });

  const fourK = applyOutputProfile(template('4k'), 'stable', ctx('4k')).config;
  for (const value of AIO_RESOLUTIONS) {
    const known = (fourK.preferredResolutions || []).includes(value)
      || (fourK.excludedResolutions || []).includes(value);
    assert.ok(known, `stable/4k: "${value}" is neither preferred nor excluded — it would sort last`);
  }
  assert.equal(fourK.preferredResolutions[0], '2160p');
  assert.ok(fourK.preferredResolutions.indexOf('1440p') < fourK.preferredResolutions.indexOf('1080p'));

  // and the two copies must agree for the profiles they both define
  for (const resolution of ['1080p', '4k']) {
    const fromDevice = resolutionPolicy({ resolution, device: 'generic' }).preferredResolutions;
    const fromProfile = applyOutputProfile(template(resolution), 'stable', ctx(resolution)).config.preferredResolutions;
    assert.deepEqual(fromProfile, fromDevice,
      `device-policies and output-profile-policy disagree on preferredResolutions for "${resolution}"`);
  }
});
