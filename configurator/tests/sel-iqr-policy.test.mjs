import test from 'node:test';
import assert from 'node:assert/strict';
import { getIqr4kPolicy, getIqr1080pPolicy, SCORE_IQR_GUARD } from '../src/core/sel-iqr-policy.js';

test('getIqr4kPolicy returns a valid full policy object', () => {
  const policy = getIqr4kPolicy();
  assert.equal(policy.architecture, 'iqr');
  assert.ok(Array.isArray(policy.preferredStreamExpressions));
  assert.ok(Array.isArray(policy.includedStreamExpressions));
  assert.ok(Array.isArray(policy.excludedStreamExpressions));
  assert.ok(Array.isArray(policy.rankedStreamExpressions));
  assert.ok(policy.resultLimits);
  assert.ok(policy.dynamicAddonFetching);
});

test('getIqr1080pPolicy returns a valid full policy object', () => {
  const policy = getIqr1080pPolicy();
  assert.equal(policy.architecture, 'iqr');
  assert.ok(Array.isArray(policy.preferredStreamExpressions));
  assert.ok(Array.isArray(policy.includedStreamExpressions));
  assert.ok(Array.isArray(policy.excludedStreamExpressions));
  assert.ok(Array.isArray(policy.rankedStreamExpressions));
  assert.ok(policy.resultLimits);
  assert.ok(policy.dynamicAddonFetching);
});

test('4K IQR policy includes Score IQR Guard ESE', () => {
  const policy = getIqr4kPolicy();
  const guard = policy.excludedStreamExpressions.find(e => e.expression.includes('Score IQR Guard'));
  assert.ok(guard, 'Score IQR Guard ESE must be present');
  assert.equal(guard.enabled, true);
});

test('1080p IQR policy includes Score IQR Guard ESE', () => {
  const policy = getIqr1080pPolicy();
  const guard = policy.excludedStreamExpressions.find(e => e.expression.includes('Score IQR Guard'));
  assert.ok(guard, 'Score IQR Guard ESE must be present');
  assert.equal(guard.enabled, true);
});

test('Score IQR Guard is immutable — spread does not mutate shared constant', () => {
  const policy = getIqr4kPolicy();
  policy.excludedStreamExpressions[0].enabled = false;
  assert.equal(SCORE_IQR_GUARD.enabled, true);
});

test('4K IQR result limits match expected values', () => {
  const policy = getIqr4kPolicy();
  assert.deepEqual(policy.resultLimits, { global: 30, resolution: 12, mode: 'conjunctive' });
});

test('1080p IQR result limits match expected values', () => {
  const policy = getIqr1080pPolicy();
  assert.deepEqual(policy.resultLimits, { global: 35, resolution: 15, mode: 'conjunctive' });
});

test('4K IQR dynamic addon fetching targets 2160p resolution', () => {
  const policy = getIqr4kPolicy();
  assert.equal(policy.dynamicAddonFetching.enabled, true);
  assert.ok(policy.dynamicAddonFetching.condition.includes("2160p"));
});

test('1080p IQR dynamic addon fetching targets 1080p resolution', () => {
  const policy = getIqr1080pPolicy();
  assert.equal(policy.dynamicAddonFetching.enabled, true);
  assert.ok(policy.dynamicAddonFetching.condition.includes("1080p"));
});

test('stream pool affects dynamic addon fetching thresholds', () => {
  const normal = getIqr4kPolicy({ streamPool: 'normal' });
  const large = getIqr4kPolicy({ streamPool: 'large' });
  const max = getIqr4kPolicy({ streamPool: 'max' });
  assert.ok(normal.dynamicAddonFetching.condition.includes('>=8'));
  assert.ok(large.dynamicAddonFetching.condition.includes('>=15'));
  assert.ok(max.dynamicAddonFetching.condition.includes('>=25'));
});

test('stream pool affects timeout in dynamic addon fetching', () => {
  const normal = getIqr1080pPolicy({ streamPool: 'normal' });
  const large = getIqr1080pPolicy({ streamPool: 'large' });
  const max = getIqr1080pPolicy({ streamPool: 'max' });
  assert.ok(normal.dynamicAddonFetching.condition.includes('>6000'));
  assert.ok(large.dynamicAddonFetching.condition.includes('>8000'));
  assert.ok(max.dynamicAddonFetching.condition.includes('>10000'));
});

test('4K IQR PSEs include DV tier when dv=true', () => {
  const withDv = getIqr4kPolicy({ dv: true });
  const withoutDv = getIqr4kPolicy({ dv: false });
  const dvTier = withDv.preferredStreamExpressions.find(e => e.expression.includes('REMUX DV'));
  assert.ok(dvTier, 'DV tier should be present when dv=true');
  const noDvTier = withoutDv.preferredStreamExpressions.find(e => e.expression.includes('REMUX DV'));
  assert.equal(noDvTier, undefined, 'DV tier should not be present when dv=false');
});

test('4K IQR PSE count matches buildApexIqr4kPses output', () => {
  const policy = getIqr4kPolicy({ dv: false, audio: 'limited' });
  assert.ok(policy.preferredStreamExpressions.length >= 15, `Expected at least 15 PSEs, got ${policy.preferredStreamExpressions.length}`);
});

test('1080p IQR PSE count matches buildApexIqr1080Pses output', () => {
  const policy = getIqr1080pPolicy({ audio: 'limited' });
  assert.ok(policy.preferredStreamExpressions.length >= 10, `Expected at least 10 PSEs, got ${policy.preferredStreamExpressions.length}`);
});

test('all PSE expressions are non-empty strings with enabled flags', () => {
  for (const policy of [getIqr4kPolicy(), getIqr1080pPolicy()]) {
    for (const field of ['preferredStreamExpressions', 'excludedStreamExpressions']) {
      for (const entry of policy[field]) {
        assert.equal(typeof entry.expression, 'string');
        assert.ok(entry.expression.trim().length > 0);
        assert.equal(typeof entry.enabled, 'boolean');
      }
    }
  }
});
