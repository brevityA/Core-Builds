import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSelPolicy, assertSelPolicy, SEL_ARCHITECTURES } from '../src/core/sel-policy.js';
import { SEL_POLICY_DATA, APEX_MIXED_PSES } from '../src/core/sel-policy-data.js';

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

// ── SEL_POLICY_DATA tests ──

test('SEL_POLICY_DATA covers all six baseline targets', () => {
  const required = ['standard', 'standard-4k', 'iqr', 'apex-mixed', 'mixed-standard', 'mixed-apex-mixed'];
  for (const target of required) {
    assert.ok(SEL_POLICY_DATA[target], `Missing target: ${target}`);
  }
});

test('SEL_POLICY_DATA entries have all required fields', () => {
  const fields = ['preferredStreamExpressions', 'includedStreamExpressions', 'excludedStreamExpressions', 'rankedStreamExpressions', 'resultLimits', 'dynamicAddonFetching'];
  for (const [name, data] of Object.entries(SEL_POLICY_DATA)) {
    for (const field of fields) {
      assert.ok(field in data, `${name} missing field: ${field}`);
    }
    assert.ok(Array.isArray(data.preferredStreamExpressions), `${name} PSEs not array`);
    assert.ok(data.preferredStreamExpressions.length > 0, `${name} has no PSEs`);
    assert.ok(Array.isArray(data.includedStreamExpressions), `${name} ISEs not array`);
    assert.ok(Array.isArray(data.excludedStreamExpressions), `${name} ESEs not array`);
    assert.ok(Array.isArray(data.rankedStreamExpressions), `${name} RSEs not array`);
  }
});

test('SEL_POLICY_DATA expression entries have valid shape', () => {
  for (const [name, data] of Object.entries(SEL_POLICY_DATA)) {
    for (const key of ['preferredStreamExpressions', 'includedStreamExpressions', 'excludedStreamExpressions']) {
      for (const entry of data[key]) {
        assert.equal(typeof entry.expression, 'string', `${name}.${key} has non-string expression`);
        assert.ok(entry.expression.trim().length > 0, `${name}.${key} has empty expression`);
        assert.equal(typeof entry.enabled, 'boolean', `${name}.${key} has non-boolean enabled`);
      }
    }
  }
});

test('SEL_POLICY_DATA is not mutated by import', () => {
  const original = SEL_POLICY_DATA.standard.preferredStreamExpressions.length;
  SEL_POLICY_DATA.standard.preferredStreamExpressions.push({ expression: 'test', enabled: true });
  assert.equal(SEL_POLICY_DATA.standard.preferredStreamExpressions.length, original + 1);
  SEL_POLICY_DATA.standard.preferredStreamExpressions.pop();
  assert.equal(SEL_POLICY_DATA.standard.preferredStreamExpressions.length, original);
});

test('SEL_POLICY_DATA architecture PSE counts match baseline expectations', () => {
  assert.equal(SEL_POLICY_DATA.standard.preferredStreamExpressions.length, 16);
  assert.equal(SEL_POLICY_DATA['standard-4k'].preferredStreamExpressions.length, 20);
  assert.equal(SEL_POLICY_DATA.iqr.preferredStreamExpressions.length, 23);
  assert.equal(SEL_POLICY_DATA['apex-mixed'].preferredStreamExpressions.length, 37);
  assert.equal(SEL_POLICY_DATA['mixed-standard'].preferredStreamExpressions.length, 21);
  assert.equal(SEL_POLICY_DATA['mixed-apex-mixed'].preferredStreamExpressions.length, 37);
});

test('APEX_MIXED_PSES is sourced from the nightly template (35 entries)', () => {
  assert.equal(APEX_MIXED_PSES.length, 35);
  assert.notEqual(APEX_MIXED_PSES.length, SEL_POLICY_DATA['apex-mixed'].preferredStreamExpressions.length,
    'APEX_MIXED_PSES should differ from golden fixture apex-mixed PSEs');
});
