import test from 'node:test';
import assert from 'node:assert/strict';
import { HOST_BASE_URLS, HOST_META, MIN_AIOSTREAMS_VERSION, hostCapabilitySummary } from '../src/data/hosts.js';
import { AIOSTREAMS_COMPATIBILITY_TARGETS } from '../src/core/output-profile-policy.js';

test('every host has metadata', () => {
  for (const key of Object.keys(HOST_BASE_URLS)) assert.ok(HOST_META[key], `missing metadata for ${key}`);
});

test('automatic compatibility policy remains explicit', () => {
  assert.equal(MIN_AIOSTREAMS_VERSION, '2.32.0');
  assert.equal(HOST_META.elfhosted.blocksFree, true);
  assert.equal(HOST_META.viren.channel, 'nightly');
  assert.ok(HOST_META.omni.priority > HOST_META.fortheweak.priority);
});

// The pickers show a registry AIOStreams version per host (a live probe wins,
// but the registry must exist and be representable in the UI).
test('every public host carries a last-verified aiostreamsVersion', () => {
  for (const key of Object.keys(HOST_BASE_URLS)) {
    const v = HOST_META[key].aiostreamsVersion;
    assert.ok(/^\d+\.\d+\.\d+$/.test(v || ''), `${key} missing aiostreamsVersion`);
    assert.ok(
      AIOSTREAMS_COMPATIBILITY_TARGETS.includes(v),
      `${key} runs ${v}, which is not a selectable compatibility target`
    );
  }
});

test('hostCapabilitySummary is honest about ElfHosted being debrid-only', () => {
  assert.equal(hostCapabilitySummary('elfhosted'), 'Debrid only — no P2P/HTTP');
  assert.equal(hostCapabilitySummary('fortheweak'), 'P2P/HTTP/Debrid');
  assert.equal(hostCapabilitySummary('viren'), 'P2P/HTTP/Debrid');
  assert.equal(hostCapabilitySummary('custom'), '');
  assert.equal(hostCapabilitySummary(undefined), '');
});
