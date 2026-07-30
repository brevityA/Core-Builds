import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSelPolicy, assertSelPolicy } from '../src/core/sel-policy.js';

test('SEL policy normalizes expression entries and preserves architecture', () => {
  const policy = normalizeSelPolicy({ architecture:'apex', preferredStreamExpressions:[{ expression:'  count(streams)>0  ' }, null] });
  assert.equal(policy.architecture, 'apex');
  assert.deepEqual(policy.preferredStreamExpressions, [{ enabled:true, expression:'count(streams)>0' }]);
  assertSelPolicy(policy);
});

test('SEL policy preserves enabled:false entries', () => {
  const policy = normalizeSelPolicy({
    architecture:'iqr',
    excludedStreamExpressions:[{ expression:'resolution(streams,"2160p")', enabled:false }],
  });
  assert.deepEqual(policy.excludedStreamExpressions, [{ enabled:false, expression:'resolution(streams,"2160p")' }]);
  assertSelPolicy(policy);
});

test('SEL policy normalizes all four expression lists', () => {
  const raw = {
    architecture:'standard',
    preferredStreamExpressions:[{ expression:'a' }],
    includedStreamExpressions:[{ expression:'b' }],
    excludedStreamExpressions:[{ expression:'c' }],
    rankedStreamExpressions:[{ expression:'d' }],
  };
  const policy = normalizeSelPolicy(raw);
  assert.equal(policy.preferredStreamExpressions[0].expression, 'a');
  assert.equal(policy.includedStreamExpressions[0].expression, 'b');
  assert.equal(policy.excludedStreamExpressions[0].expression, 'c');
  assert.equal(policy.rankedStreamExpressions[0].expression, 'd');
  assertSelPolicy(policy);
});

test('SEL policy defaults unknown architecture to standard', () => {
  const policy = normalizeSelPolicy({ architecture:'unknown' });
  assert.equal(policy.architecture, 'standard');
});

test('SEL policy handles null/undefined root gracefully', () => {
  const policy = normalizeSelPolicy(undefined);
  assert.equal(policy.architecture, 'standard');
  assert.deepEqual(policy.preferredStreamExpressions, []);
  assertSelPolicy(policy);
});

test('SEL policy rejects unknown architectures and malformed entries', () => {
  assert.throws(() => assertSelPolicy({ architecture:'unknown', preferredStreamExpressions:[], includedStreamExpressions:[], excludedStreamExpressions:[], rankedStreamExpressions:[] }));
  assert.throws(() => assertSelPolicy({ architecture:'standard', preferredStreamExpressions:[{ expression:'' }], includedStreamExpressions:[], excludedStreamExpressions:[], rankedStreamExpressions:[] }));
});

test('SEL policy rejects non-boolean enabled values', () => {
  assert.throws(() => assertSelPolicy({
    architecture:'standard',
    preferredStreamExpressions:[{ expression:'count(streams)>0', enabled:'false' }],
    includedStreamExpressions:[], excludedStreamExpressions:[], rankedStreamExpressions:[],
  }));
});

test('SEL policy rejects non-object entries', () => {
  assert.throws(() => assertSelPolicy({
    architecture:'standard',
    preferredStreamExpressions:['not-an-object'],
    includedStreamExpressions:[], excludedStreamExpressions:[], rankedStreamExpressions:[],
  }));
});
