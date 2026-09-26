import test from 'node:test';
import assert from 'node:assert/strict';
import { adviseBuild } from '../src/core/build-advisor-policy.js';

test('advisor is deterministic and does not select services, hosts, or credentials', () => {
  const intent = { goal:'balanced', content:'all', reliability:'cached-first', network:'fast', device:'generic' };
  const a = adviseBuild(intent);
  const b = adviseBuild(intent);
  assert.deepEqual(a, b);
  for (const forbidden of ['service', 'multiServices', 'instanceHost', 'creds', 'stremioPassword']) {
    assert.equal(Object.hasOwn(a.patch, forbidden), false);
  }
});

test('speed recommendation favours cached 1080p with a bounded timeout', () => {
  const result = adviseBuild({ goal:'speed', content:'movies', reliability:'cached-only', network:'fast' });
  assert.equal(result.patch.resolution, '1080p');
  assert.equal(result.patch.cacheMode, 'cached');
  assert.equal(result.patch.streamPool, 'small');
  assert.equal(result.patch.addonTimeout, 4000);
  assert.equal(result.patch.outputProfile, 'stable');
  assert.ok(result.reasons.some(r => r.id === 'speed-goal'));
});

test('quality recommendation respects medium bandwidth and device caps', () => {
  const medium = adviseBuild({ goal:'quality', content:'all', reliability:'cached-first', network:'medium' });
  assert.equal(medium.patch.resolution, 'mixed');
  assert.ok(medium.reasons.some(r => r.id === 'medium-network'));

  const capped = adviseBuild({ goal:'quality', content:'all', reliability:'cached-first', network:'fast', device:'firestick-hd', deviceMaxResolution:'1080p' });
  assert.equal(capped.patch.resolution, '1080p');
  assert.ok(capped.reasons.some(r => r.id === 'device-cap'));
});

test('coverage and niche intent reduce starvation risk', () => {
  const result = adviseBuild({ goal:'coverage', content:'niche', reliability:'broad', network:'fast' });
  assert.equal(result.patch.resolution, 'mixed');
  assert.equal(result.patch.matchMode, 'lenient');
  assert.equal(result.patch.streamPool, 'wide');
  assert.equal(result.patch.pseArch, 'apex-mixed');
  assert.ok(result.reasons.some(r => r.id === 'niche-matching'));
});

test('unknown input is normalized and lowers confidence only when evidence is missing', () => {
  const unknown = adviseBuild({ goal:'made-up', content:'bad', reliability:'nope', network:'unknown' });
  assert.equal(unknown.intent.goal, 'balanced');
  assert.equal(unknown.intent.content, 'all');
  assert.equal(unknown.confidence, 'medium');
  assert.equal(unknown.assumptions.length, 1);

  const known = adviseBuild({ goal:'balanced', content:'all', reliability:'cached-first', network:'fast' });
  assert.equal(known.confidence, 'high');
});
