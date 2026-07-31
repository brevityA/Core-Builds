import test from 'node:test';
import assert from 'node:assert/strict';
import { getIqr4kPolicy, getIqr1080pPolicy } from '../src/core/sel-iqr-policy.js';
import { getSelPolicy } from '../src/core/sel-policy.js';
import { SEL_POLICY_DATA } from '../src/core/sel-policy-data.js';

test('4K IQR policy PSEs match getSelPolicy IQR 4k output', () => {
  const policyPses = getIqr4kPolicy({ dv: false, audio: 'limited' }).preferredStreamExpressions;
  const selPses = getSelPolicy({ architecture: 'iqr', resolution: '4k', dv: false, audio: 'limited' }).preferredStreamExpressions;
  assert.equal(policyPses.length, selPses.length, 'PSE count must match');
  for (let i = 0; i < policyPses.length; i++) {
    assert.equal(policyPses[i].expression, selPses[i].expression, `PSE ${i} expression mismatch`);
    assert.equal(policyPses[i].enabled, selPses[i].enabled, `PSE ${i} enabled flag mismatch`);
  }
});

test('4K IQR policy PSEs with DV match getSelPolicy IQR 4k DV output', () => {
  const policyPses = getIqr4kPolicy({ dv: true, audio: 'full' }).preferredStreamExpressions;
  const selPses = getSelPolicy({ architecture: 'iqr', resolution: '4k', dv: true, audio: 'full' }).preferredStreamExpressions;
  assert.equal(policyPses.length, selPses.length, 'PSE count must match with DV');
  for (let i = 0; i < policyPses.length; i++) {
    assert.equal(policyPses[i].expression, selPses[i].expression, `PSE ${i} expression mismatch`);
  }
});

test('1080p IQR policy PSEs match getSelPolicy IQR 1080p output', () => {
  const policyPses = getIqr1080pPolicy({ audio: 'limited' }).preferredStreamExpressions;
  const selPses = getSelPolicy({ architecture: 'iqr', resolution: '1080p', audio: 'limited' }).preferredStreamExpressions;
  assert.equal(policyPses.length, selPses.length, 'PSE count must match');
  for (let i = 0; i < policyPses.length; i++) {
    assert.equal(policyPses[i].expression, selPses[i].expression, `PSE ${i} expression mismatch`);
    assert.equal(policyPses[i].enabled, selPses[i].enabled, `PSE ${i} enabled flag mismatch`);
  }
});

test('4K IQR policy PSEs match golden policy data ordering', () => {
  const golden = SEL_POLICY_DATA['iqr'];
  assert.ok(golden, 'Missing IQR golden policy data');
  const policy = getIqr4kPolicy({ dv: false, audio: 'limited' });
  const goldenPses = golden.preferredStreamExpressions.filter(
    e => !e.expression.includes('Language Preference') && !e.expression.includes('Sub-First Anime')
  );
  const policyPses = policy.preferredStreamExpressions;
  assert.equal(policyPses.length, goldenPses.length, `PSE count: policy ${policyPses.length} vs golden ${goldenPses.length}`);
  for (let i = 0; i < policyPses.length; i++) {
    assert.equal(policyPses[i].expression, goldenPses[i].expression, `PSE ${i} does not match golden`);
  }
});

test('4K IQR result limits match golden policy data', () => {
  const golden = SEL_POLICY_DATA['iqr'];
  assert.ok(golden?.resultLimits, 'Missing IQR golden resultLimits');
  const policy = getIqr4kPolicy();
  assert.deepEqual(policy.resultLimits, golden.resultLimits);
});

test('4K IQR dynamic addon fetching matches golden policy data', () => {
  const golden = SEL_POLICY_DATA['iqr'];
  assert.ok(golden?.dynamicAddonFetching, 'Missing IQR golden dynamicAddonFetching');
  const policy = getIqr4kPolicy();
  assert.deepEqual(policy.dynamicAddonFetching, golden.dynamicAddonFetching);
});

test('expression ordering is preserved across 4K IQR tiers', () => {
  const policy = getIqr4kPolicy({ dv: true, audio: 'full', supportsAv1: true });
  const labels = policy.preferredStreamExpressions
    .map(e => {
      const m = e.expression.match(/\/\*\s*(.+?)\s*\*\//);
      return m ? m[1] : null;
    })
    .filter(Boolean);
  const elitePinIdx = labels.findIndex(l => l.includes('Elite 4K'));
  const lqPinIdx = labels.findIndex(l => l.includes('LQ Pin'));
  const sTierIdx = labels.findIndex(l => l.includes('S-Tier 4K REMUX'));
  const codecIdx = labels.findIndex(l => l.includes('Codec'));
  assert.ok(elitePinIdx < sTierIdx, 'Elite pin must come before S-Tier');
  assert.ok(lqPinIdx < sTierIdx, 'LQ pin must come before S-Tier');
  assert.ok(sTierIdx < codecIdx, 'S-Tier must come before Codec');
});

test('expression ordering is preserved across 1080p IQR tiers', () => {
  const policy = getIqr1080pPolicy({ audio: 'full', supportsAv1: true });
  const labels = policy.preferredStreamExpressions
    .map(e => {
      const m = e.expression.match(/\/\*\s*(.+?)\s*\*\//);
      return m ? m[1] : null;
    })
    .filter(Boolean);
  const elitePinIdx = labels.findIndex(l => l.includes('Elite 1080p'));
  const sTierIdx = labels.findIndex(l => l.includes('S-Tier 1080p'));
  const codecIdx = labels.findIndex(l => l.includes('Codec'));
  assert.ok(elitePinIdx < sTierIdx, 'Elite pin must come before S-Tier');
  assert.ok(sTierIdx < codecIdx, 'S-Tier must come before Codec');
});

test('all enabled flags preserved in 4K IQR policy', () => {
  const policy = getIqr4kPolicy({ dv: true, audio: 'full' });
  for (const entry of policy.preferredStreamExpressions) {
    assert.equal(entry.enabled, true, `PSE "${entry.expression.slice(0, 40)}..." must be enabled`);
  }
  for (const entry of policy.excludedStreamExpressions) {
    assert.equal(entry.enabled, true, `ESE "${entry.expression.slice(0, 40)}..." must be enabled`);
  }
});
