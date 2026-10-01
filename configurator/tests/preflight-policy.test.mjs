/**
 * Pre-flight policy contract.
 *
 * Guards the CFG-P0-01 regression: two checkers producing differently-worded
 * findings for the same condition, de-duplicated with an exact-string compare
 * that could never match. Every assertion here maps to a numbered finding in
 * `configurator/reports/04-refinements-research.md`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  preflightFindings,
  hasBlockers,
  summarise,
  findingsAsMessages,
  payloadBytes,
  PAYLOAD_LIMIT_BYTES,
  PAYLOAD_WARN_BYTES,
  PREFLIGHT_SEVERITIES,
} from '../src/core/preflight-policy.js';

const okConfig = { presets: [{ name: 'TorBox Search' }, { name: 'Zilean' }] };

/** The exact state from the research repro: 9 bullets for 4 real problems. */
const repro = {
  service: 'torbox',
  multiServices: ['easynews'],
  device: 'firestick-hd',
  resolution: '4k',
  audio: 'lossless',
  outputProfile: 'balanced',
  credentialsPresent: {},
  requiredCredentialIds: ['torbox'],
  devicesForcingLimitedAudio: ['firestick-hd'],
  deviceMaxResolution: { 'firestick-hd': '1080p' },
  config: okConfig,
};

test('CFG-P0-01 · the nine-bullet repro collapses to one finding per real problem', () => {
  const findings = preflightFindings(repro);
  const ids = findings.map(f => f.id).sort();

  assert.deepEqual(ids, [
    'device-cannot-play-4k',
    'easynews-credentials',
    'lossless-audio-unsupported',
    'no-debrid-credentials',
  ]);
  // The old confirm() showed nine bullets for exactly these four problems.
  assert.equal(findings.length, 4, 'four distinct problems must produce four findings');
});

test('CFG-P0-01 · ids are unique, so repeated conditions cannot double-report', () => {
  const findings = preflightFindings(repro);
  assert.equal(new Set(findings.map(f => f.id)).size, findings.length);
});

test('every finding carries a known severity, a title, and is frozen', () => {
  for (const f of preflightFindings(repro)) {
    assert.ok(PREFLIGHT_SEVERITIES.includes(f.severity), `${f.id} has severity ${f.severity}`);
    assert.ok(f.title.length > 0, `${f.id} has no title`);
    assert.ok(Object.isFrozen(f));
  }
});

test('findings are ordered blockers first, then warnings, then advisories', () => {
  const findings = preflightFindings({
    ...repro,
    resolution: '1080p',
    outputProfile: 'stable',
    requiredCredentialIds: ['torbox'],
  });
  const rank = { blocker: 0, warning: 1, advisory: 2 };
  const seq = findings.map(f => rank[f.severity]);
  assert.deepEqual(seq, seq.slice().sort((a, b) => a - b));
});

test('a clean configuration produces no findings at all', () => {
  const findings = preflightFindings({
    service: 'torbox',
    multiServices: [],
    device: 'shield',
    resolution: '4k',
    audio: 'lossless',
    outputProfile: 'advanced',
    credentialsPresent: { torbox: true },
    requiredCredentialIds: ['torbox'],
    devicesForcingLimitedAudio: ['firestick-hd'],
    deviceMaxResolution: { shield: '4k' },
    config: okConfig,
  });
  assert.deepEqual(findings, []);
  assert.equal(hasBlockers(findings), false);
});

test('free services never demand an API key', () => {
  for (const service of ['p2p', 'http']) {
    const findings = preflightFindings({
      service, multiServices: [], credentialsPresent: {},
      requiredCredentialIds: ['torbox'], config: okConfig,
    });
    assert.equal(findings.some(f => f.id === 'no-debrid-credentials'), false, `${service} must not require a key`);
  }
});

test('a partially-filled credential set does not fire the no-key blocker', () => {
  const findings = preflightFindings({
    service: 'torbox', multiServices: [],
    credentialsPresent: { torbox: true },
    requiredCredentialIds: ['torbox', 'realdebrid'],
    config: okConfig,
  });
  assert.equal(findings.some(f => f.id === 'no-debrid-credentials'), false);
});

test('EasyNews reports one finding naming both missing fields, not two findings', () => {
  const findings = preflightFindings({
    service: 'torbox', multiServices: ['easynews'],
    credentialsPresent: { torbox: true },
    requiredCredentialIds: ['torbox'], config: okConfig,
  });
  const easynews = findings.filter(f => f.id === 'easynews-credentials');
  assert.equal(easynews.length, 1);
  assert.match(easynews[0].detail, /username and password/);
});

test('EasyNews names only the field that is actually missing', () => {
  const findings = preflightFindings({
    service: 'torbox', multiServices: ['easynews'],
    credentialsPresent: { torbox: true, easynews: true },
    requiredCredentialIds: ['torbox'], config: okConfig,
  });
  const easynews = findings.find(f => f.id === 'easynews-credentials');
  assert.match(easynews.detail, /password is empty/);
  assert.equal(/username/.test(easynews.detail), false);
});

test('CFG-P1-03 · the 1080p resolution consequence is reported on Stable and Balanced only', () => {
  const base = {
    service: 'torbox', multiServices: [], resolution: '1080p',
    credentialsPresent: { torbox: true }, requiredCredentialIds: ['torbox'], config: okConfig,
  };
  for (const profile of ['stable', 'balanced']) {
    const f = preflightFindings({ ...base, outputProfile: profile });
    const note = f.find(x => x.id === 'resolution-4k-excluded');
    assert.ok(note, `${profile} must surface the exclusion`);
    assert.equal(note.severity, 'advisory');
    assert.match(note.fix, /Mixed · Adaptive/);
  }
  for (const profile of ['advanced', 'labs']) {
    const f = preflightFindings({ ...base, outputProfile: profile });
    assert.equal(f.some(x => x.id === 'resolution-4k-excluded'), false, `${profile} must not`);
  }
});

test('CFG-P1-03 · 4K never triggers the exclusion advisory', () => {
  const findings = preflightFindings({
    service: 'torbox', multiServices: [], resolution: '4k', outputProfile: 'stable',
    credentialsPresent: { torbox: true }, requiredCredentialIds: ['torbox'], config: okConfig,
  });
  assert.equal(findings.some(f => f.id === 'resolution-4k-excluded'), false);
});

test('device ceiling is data-driven, not hard-coded to firestick-hd', () => {
  const findings = preflightFindings({
    service: 'torbox', multiServices: [], device: 'some-new-1080p-box', resolution: '4k',
    credentialsPresent: { torbox: true }, requiredCredentialIds: ['torbox'],
    deviceMaxResolution: { 'some-new-1080p-box': '1080p' }, config: okConfig,
  });
  const f = findings.find(x => x.id === 'device-cannot-play-4k');
  assert.ok(f, 'any device with a 1080p ceiling must be covered');
  assert.match(f.detail, /tops out at 1080p/);
});

test('CFG-P1-04 · payload size blocks over the limit and advises near it', () => {
  const pad = (bytes) => ({ presets: [{ name: 'x' }], _pad: 'a'.repeat(bytes) });

  const over = preflightFindings({ service: 'torbox', credentialsPresent: { torbox: true }, requiredCredentialIds: ['torbox'], config: pad(PAYLOAD_LIMIT_BYTES + 5000) });
  const blocker = over.find(f => f.id === 'payload-too-large');
  assert.ok(blocker);
  assert.equal(blocker.severity, 'blocker');
  assert.equal(hasBlockers(over), true);

  const near = preflightFindings({ service: 'torbox', credentialsPresent: { torbox: true }, requiredCredentialIds: ['torbox'], config: pad(PAYLOAD_WARN_BYTES + 500) });
  const advisory = near.find(f => f.id === 'payload-near-limit');
  assert.ok(advisory);
  assert.equal(advisory.severity, 'advisory');
  assert.equal(hasBlockers(near), false);

  const small = preflightFindings({ service: 'torbox', credentialsPresent: { torbox: true }, requiredCredentialIds: ['torbox'], config: okConfig });
  assert.equal(small.some(f => f.id.startsWith('payload-')), false);
});

test('payloadBytes matches the byte length AIOStreams measures', () => {
  // A multi-byte character must count as its UTF-8 length, not its JS length.
  const config = { name: 'é' };
  assert.equal(payloadBytes(config), new TextEncoder().encode(JSON.stringify(config)).length);
  assert.ok(payloadBytes(config) > JSON.stringify(config).length - 2);
});

test('CFG-P2-05 · a thrown build is a blocker and suppresses downstream noise', () => {
  const findings = preflightFindings({ ...repro, buildError: new Error('boom') });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, 'template-build-failed');
  assert.equal(findings[0].severity, 'blocker');
  assert.match(findings[0].detail, /boom/);
  // The four unrelated warnings from `repro` must not be shown alongside it.
  assert.equal(findings.some(f => f.id === 'no-debrid-credentials'), false);
});

test('a missing preset list is a blocker', () => {
  const findings = preflightFindings({
    service: 'torbox', credentialsPresent: { torbox: true }, requiredCredentialIds: ['torbox'],
    config: { presets: 'not-an-array' },
  });
  const f = findings.find(x => x.id === 'missing-presets');
  assert.ok(f);
  assert.equal(f.severity, 'blocker');
});

test('duplicate preset names are reported once, listing at most three', () => {
  const findings = preflightFindings({
    service: 'torbox', credentialsPresent: { torbox: true }, requiredCredentialIds: ['torbox'],
    config: { presets: ['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd'].map(name => ({ name })) },
  });
  const dup = findings.filter(f => f.id === 'duplicate-preset-names');
  assert.equal(dup.length, 1);
  assert.match(dup[0].detail, /a, b, c/);
  assert.equal(/, d/.test(dup[0].detail), false, 'listing is capped at three');
});

test('external warnings are folded in idempotently', () => {
  const input = {
    service: 'torbox', credentialsPresent: { torbox: true }, requiredCredentialIds: ['torbox'],
    config: okConfig, extraWarnings: ['Host check blocked', 'Host check blocked', '', '  '],
  };
  const findings = preflightFindings(input);
  assert.equal(findings.filter(f => f.title === 'Host check blocked').length, 1);
  // Calling twice with the same input must give the same ids.
  assert.deepEqual(preflightFindings(input).map(f => f.id), findings.map(f => f.id));
});

test('summarise counts each severity', () => {
  const counts = summarise(preflightFindings(repro));
  assert.equal(counts.total, 4);
  assert.equal(counts.blocker, 1);
  assert.equal(counts.warning, 3);
  assert.equal(counts.advisory, 0);
});

test('findingsAsMessages keeps the legacy flat-string call sites working', () => {
  const messages = findingsAsMessages(preflightFindings(repro));
  assert.equal(messages.length, 4);
  assert.ok(messages.every(m => typeof m === 'string' && m.length));
  assert.ok(messages.some(m => m.startsWith('No API key entered — ')));
});

test('the policy never receives or echoes a credential value', () => {
  // The app passes booleans; prove that even a leaked value cannot reach output.
  const findings = preflightFindings({
    service: 'torbox', multiServices: ['easynews'],
    credentialsPresent: { torbox: 'sk-super-secret-value' },
    requiredCredentialIds: ['torbox'], config: okConfig,
  });
  const blob = JSON.stringify(findings);
  assert.equal(blob.includes('sk-super-secret-value'), false);
});

test('no findings means the caller can skip the modal entirely', () => {
  assert.deepEqual(preflightFindings({}), [
    Object.freeze({
      id: 'no-service', severity: 'blocker',
      title: 'No service selected',
      detail: 'A debrid or free-streaming service determines which scrapers and presets the template uses.',
      fix: 'Go back to step 1 and pick a service.',
    }),
  ]);
});
