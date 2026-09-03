/**
 * Fixture proof: adding pre-flight validation did not change generated JSON.
 *
 * The task brief requires that "if a refinement touches generated JSON, add a
 * fixture proving the output is unchanged or intentionally improved". The
 * pre-flight refinement is designed to be read-only over the template, so the
 * correct proof is that the output is BYTE-IDENTICAL.
 *
 * Two independent guarantees are asserted here:
 *
 *   1. Structural — `preflight-policy.js` contains no mutation of its inputs,
 *      and running the policy over a config leaves that config deep-equal and
 *      byte-identical to a snapshot taken before the call.
 *
 *   2. Generation — `generateTemplate` output for a fixed set of inputs matches
 *      a checked-in golden hash. If a future change to the pre-flight path ever
 *      reaches into generation, this fails.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateTemplate } from '../src/core/generate-template.js';
import { preflightFindings, payloadBytes } from '../src/core/preflight-policy.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Fixed inputs covering the states the pre-flight policy reacts to. */
const FIXTURES = [
  {
    name: 'torbox-4k-shield-clean',
    input: { service: 'torbox', device: 'shield', resolution: '4k', qualityFirst: true },
  },
  {
    name: 'torbox-1080p-firestick-hd-blocked-device',
    input: { service: 'torbox', device: 'firestick-hd', resolution: '1080p' },
  },
  {
    name: 'torbox-4k-firestick-hd-conflict',
    input: { service: 'torbox', device: 'firestick-hd', resolution: '4k' },
  },
  {
    name: 'p2p-1080p-free',
    input: { service: 'p2p', device: 'generic', resolution: '1080p' },
  },
];

const options = {
  deviceAv1Safe: new Set(['shield']),
  deviceForceLimitedAudio: new Set(['firestick-hd']),
  presets: [{ type: 'torbox', instanceId: 'torbox-1', options: {} }],
};

function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

test('generated template output is unchanged by the pre-flight refinement', async () => {
  const golden = JSON.parse(await readFile(resolve(here, 'fixtures/preflight-generation-golden.json'), 'utf8'));

  for (const fixture of FIXTURES) {
    const produced = generateTemplate(fixture.input, options);
    const hash = stableHash(produced);
    assert.equal(
      hash, golden[fixture.name],
      `generated JSON changed for "${fixture.name}". The pre-flight refinement must be read-only. ` +
      `If this change is intentional, update fixtures/preflight-generation-golden.json and say why in reports/.`,
    );
  }
});

test('running the pre-flight policy does not mutate the config it inspects', () => {
  for (const fixture of FIXTURES) {
    const produced = generateTemplate(fixture.input, options);
    const before = JSON.stringify(produced);
    const beforeBytes = payloadBytes(produced);

    preflightFindings({
      service: fixture.input.service,
      device: fixture.input.device,
      resolution: fixture.input.resolution,
      multiServices: ['easynews', 'nzbgeek', 'debridio'],
      audio: 'lossless',
      outputProfile: 'stable',
      subtitleAddons: ['subdl'],
      credentialsPresent: {},
      requiredCredentialIds: ['torbox'],
      devicesForcingLimitedAudio: ['firestick-hd'],
      deviceMaxResolution: { 'firestick-hd': '1080p' },
      config: produced,
      extraWarnings: ['something external'],
    });

    assert.equal(JSON.stringify(produced), before, `${fixture.name}: config was mutated by the policy`);
    assert.equal(payloadBytes(produced), beforeBytes, `${fixture.name}: byte length changed`);
  }
});

test('the pre-flight module contains no assignment into the inspected config', async () => {
  const source = await readFile(resolve(here, '../src/core/preflight-policy.js'), 'utf8');
  // Any write through the `config` parameter would be a contract violation.
  assert.equal(/\bconfig\s*(\.\w+|\[[^\]]+\])\s*(=[^=]|\+\+|--)/.test(source), false,
    'preflight-policy.js must never assign into the config it inspects');
  assert.equal(/\bdelete\s+config\b/.test(source), false,
    'preflight-policy.js must never delete from the config it inspects');
});
