/**
 * The 1080p profile hard-excludes 2160p/1440p. That is intended — the card
 * promises a "Hard lock" and bandwidth-limited users rely on it — but it is
 * easy to walk into, and a user who lands there via Quick Start never sees the
 * card at all. Reported 2026-08-31 as "the show isn't giving any 4k results"
 * after re-running the wizard.
 *
 * These tests pin BOTH halves: the lock stays, and the escape hatch stays
 * discoverable. Deleting the exclusion should fail here loudly, because
 * removing it would silently blow every bandwidth-capped user's cap.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { resolutionPolicy } from '../src/core/device-policies.js';
import { applyOutputProfile } from '../src/core/output-profile-policy.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = readFileSync(join(ROOT, 'src/js/app.js'), 'utf8');

function emitted(resolution, profile) {
  const base = resolutionPolicy({ resolution, device: 'generic' });
  const out = applyOutputProfile({ config: { ...base } }, profile,
    { resolution, device: 'generic', service: 'torbox-pro' });
  return out.config || out;
}

test('1080p hard-locks 2160p and 1440p out on Stable and Balanced', () => {
  for (const profile of ['stable', 'balanced']) {
    const c = emitted('1080p', profile);
    assert.ok(c.excludedResolutions.includes('2160p'), `${profile}: 2160p must stay excluded`);
    assert.ok(c.excludedResolutions.includes('1440p'), `${profile}: 1440p must stay excluded`);
    assert.deepEqual(c.preferredResolutions, ['1080p', '720p', 'Unknown'], profile);
  }
});

test('the lock is profile-scoped: Advanced and Labs keep 4K available', () => {
  // applyNativeFilters() runs only from applyStableProfile/applyBalancedProfile,
  // so the exclusion never reaches Advanced or Labs. This is why the reporter
  // switching Stable -> Balanced changed nothing: both lock. It also means the
  // disclosure must not claim the lock is unconditional.
  for (const profile of ['advanced', 'labs']) {
    const c = emitted('1080p', profile);
    assert.ok(!c.excludedResolutions.includes('2160p'), `${profile} must not exclude 2160p`);
    assert.ok(!c.excludedResolutions.includes('1440p'), `${profile} must not exclude 1440p`);
  }
});

test('the 4K and Mixed profiles never exclude a higher tier', () => {
  for (const resolution of ['4k', 'mixed', 'ultrawide']) {
    for (const profile of ['stable', 'balanced']) {
      const c = emitted(resolution, profile);
      for (const tier of ['2160p', '1440p']) {
        assert.ok(!c.excludedResolutions.includes(tier),
          `${resolution}/${profile} must not exclude ${tier}`);
      }
    }
  }
});

test('Mixed is a genuine escape hatch: 4K allowed, 1080p still ranked above it', () => {
  const c = emitted('mixed', 'balanced');
  assert.ok(!c.excludedResolutions.includes('2160p'));
  assert.ok(c.preferredResolutions.includes('2160p'), 'Mixed must rank 2160p, not drop it');
});

test('requiredResolutions is cleared, so the exclusion is the single active lock', () => {
  // device-policies.js sets requiredResolutions:['1080p','720p'] for 1080p, but
  // applyOutputProfile resets it to [] before adding the exclusion. There is
  // exactly one mechanism to reason about, not two.
  assert.deepEqual(resolutionPolicy({ resolution: '1080p', device: 'generic' }).requiredResolutions,
    ['1080p', '720p'], 'device policy still sets it');
  assert.deepEqual(emitted('1080p', 'stable').requiredResolutions, [],
    'but the emitted config clears it');
});

test('the hard lock is disclosed in the UI and points at the alternative', () => {
  assert.match(APP, /function resolutionLockNote\(\)/, 'the disclosure helper must exist');
  const note = APP.slice(APP.indexOf('function resolutionLockNote()'));
  assert.match(note.slice(0, 1400), /Mixed · Adaptive/, 'it must name the escape hatch');
  assert.match(note.slice(0, 1400), /Stable and Balanced/, 'it must scope the lock to the profiles that apply it');
  assert.match(note.slice(0, 1400), /2160p and 1440p are excluded/);
  // The resolution step is layout:'svc-list' + noHero, NOT the default .opts
  // grid — it has two return paths (simpleMode, and the full one with the audio
  // details) and both must carry the note. simpleMode is the Quick Start lane.
  const svcListReturns = APP.match(/return `<div class="svc-list">\$\{rows\}<\/div>\$\{resolutionLockNote\(\)\}/g) || [];
  assert.equal(svcListReturns.length, 2,
    'both resolution-step render paths must emit the note (simpleMode + full)');
  // Also on the final review step, next to the host-compatibility panel.
  assert.ok(APP.includes('${resolutionLockNote()}\n        ${hostCompatHtml()}'),
    'the review step must render it too');
  // The radio handler does not re-render, so the note is patched in place.
  assert.ok(APP.includes("if (k === 'resolution') refreshResolutionLockNote();"),
    'selecting 1080p must update the note without a navigation');
  assert.match(APP, /function refreshResolutionLockNote\(\)/);
});

test('the 1080p card copy still states the lock', () => {
  assert.match(APP, /Hard lock · 2160p excluded/, 'the card must keep saying so');
});
