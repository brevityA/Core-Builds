import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSelPolicy, assertSelPolicy } from '../src/core/sel-policy.js';

test('SEL policy normalizes expression entries and preserves architecture', () => {
  const policy = normalizeSelPolicy({ architecture:'apex', preferredStreamExpressions:[{ expression:'  count(streams)>0  ' }, null] });
  assert.equal(policy.architecture, 'apex');
  assert.deepEqual(policy.preferredStreamExpressions, [{ enabled:true, expression:'count(streams)>0' }]);
  assertSelPolicy(policy);
});

test('SEL policy rejects unknown architectures and malformed entries', () => {
  assert.throws(() => assertSelPolicy({ architecture:'unknown', preferredStreamExpressions:[], includedStreamExpressions:[], excludedStreamExpressions:[], rankedStreamExpressions:[] }));
  assert.throws(() => assertSelPolicy({ architecture:'standard', preferredStreamExpressions:[{ expression:'' }], includedStreamExpressions:[], excludedStreamExpressions:[], rankedStreamExpressions:[] }));
});
