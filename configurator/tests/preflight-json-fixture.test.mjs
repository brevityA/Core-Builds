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

/**
 * Why this file no longer hashes anything.
 *
 * The first version compared a sha256 of each generated template against a
 * checked-in digest. CodeQL flagged it as `js/insufficient-password-hash`
 * (high): `tmdbApiKey` flowed into a fast digest. Stripping the credential
 * fields inside the hash helper did not clear it, and that is the tracker being
 * right rather than stubborn — the tainted object still reaches the crypto sink,
 * and a static analyser cannot know a runtime filter removed the sensitive
 * fields.
 *
 * The real problem was using a cryptographic hash for something that is not a
 * security operation. This is change detection, so the honest tool is a
 * committed snapshot of the JSON. That removes the crypto sink entirely instead
 * of arguing with the analyser, and it is strictly better as a regression test:
 * when output does change, the diff shows *what* changed rather than announcing
 * that two opaque hex strings differ.
 *
 * Credential-shaped fields are still asserted separately and by name, so a
 * leaked secret fails loudly with the offending field.
 */
const CREDENTIAL_FIELD = /^(.*(apikey|token|password|secret|passwd|credential).*)$/i;

function stripCredentials(value) {
  if (Array.isArray(value)) return value.map(stripCredentials);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !CREDENTIAL_FIELD.test(key))
        .map(([key, inner]) => [key, stripCredentials(inner)]),
    );
  }
  return value;
}

/** Collect every credential-shaped field so they can be asserted explicitly. */
function collectCredentialFields(value, path = '', out = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectCredentialFields(item, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key;
      if (CREDENTIAL_FIELD.test(key)) out[next] = inner;
      else collectCredentialFields(inner, next, out);
    }
  }
  return out;
}

/** Canonical, diffable form of a generated template. No crypto involved. */
function snapshot(value) {
  return JSON.stringify(stripCredentials(value), null, 2);
}

test('generated template output is unchanged by the pre-flight refinement', async () => {
  for (const fixture of FIXTURES) {
    const expected = await readFile(resolve(here, `fixtures/${fixture.name}.json`), 'utf8');
    const produced = snapshot(generateTemplate(fixture.input, options));
    assert.equal(
      produced.trim(), expected.trim(),
      `generated JSON changed for "${fixture.name}". The pre-flight refinement must be read-only. ` +
      `If this change is intentional, update fixtures/${fixture.name}.json and say why in reports/.`,
    );
  }
});

test('no fixture emits a non-empty credential — snapshots cover structure only', () => {
  // The counterpart to stripCredentials(): credential fields are excluded from
  // the committed snapshots, so they are checked directly and by name. If
  // generation ever starts emitting a real secret, this names the exact field
  // instead of leaking it into a fixture file.
  for (const fixture of FIXTURES) {
    const creds = collectCredentialFields(generateTemplate(fixture.input, options));
    assert.ok(Object.keys(creds).length > 0, `${fixture.name}: expected credential fields to exist`);
    for (const [field, value] of Object.entries(creds)) {
      assert.equal(
        value, '',
        `${fixture.name}: ${field} carries a value — fixtures must never contain credential material`,
      );
    }
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
