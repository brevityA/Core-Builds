import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExpression, validateEntry, validateExpressionList, validateSelPolicy, unknownSelFunctions } from '../src/core/sel-expression-parser.js';
import { SEL_POLICY_DATA, APEX_MIXED_PSES } from '../src/core/sel-policy-data.js';
import { buildApexIqr4kPses, buildApexIqr1080Pses } from '../src/core/apex-policy.js';
import { buildStandard4kPses, buildStandard1080Pses, buildMixedPses, buildDefaultPses } from '../src/core/standard-policy.js';

// ── validateExpression ──

test('accepts simple function call', () => {
  assert.deepEqual(validateExpression("resolution(streams, '2160p')"), { valid: true });
});

test('accepts nested function calls', () => {
  assert.deepEqual(validateExpression("size(bitrate(streams,5000000,100000000),'15GB')"), { valid: true });
});

test('accepts ternary expression', () => {
  assert.deepEqual(validateExpression("count(streams)>=4?bitrate(streams,100,200):[]"), { valid: true });
});

test('accepts nested ternary expression', () => {
  assert.deepEqual(validateExpression("count(streams)>=4?bitrate(streams,1,2):count(streams)>0?cached(streams):[]"), { valid: true });
});

test('accepts expression with block comment label', () => {
  assert.deepEqual(validateExpression("/* S-Tier 4K REMUX */ size(bitrate(streams,100,200),'15GB')"), { valid: true });
});

test('accepts empty array literal', () => {
  assert.deepEqual(validateExpression("[]"), { valid: true });
});

test('accepts expression with boolean operators', () => {
  assert.deepEqual(validateExpression("(queryType=='series' or queryType=='anime.series') and ongoingSeason ? seasonPack(streams,'onlySeasons') : []"), { valid: true });
});

test('rejects empty expression', () => {
  const r = validateExpression('');
  assert.equal(r.valid, false);
  assert.match(r.error, /Empty/i);
});

test('rejects whitespace-only expression', () => {
  const r = validateExpression('   ');
  assert.equal(r.valid, false);
});

test('rejects non-string', () => {
  assert.equal(validateExpression(123).valid, false);
  assert.equal(validateExpression(null).valid, false);
  assert.equal(validateExpression(undefined).valid, false);
});

test('rejects unmatched opening parenthesis', () => {
  const r = validateExpression("resolution(streams, '2160p'");
  assert.equal(r.valid, false);
  assert.match(r.error, /unclosed/i);
});

test('rejects unexpected closing parenthesis', () => {
  const r = validateExpression("resolution(streams))");
  assert.equal(r.valid, false);
  assert.match(r.error, /closing/i);
});

test('rejects unterminated string literal', () => {
  const r = validateExpression("resolution(streams, '2160p)");
  assert.equal(r.valid, false);
  assert.match(r.error, /unterminated string/i);
});

test('rejects unterminated block comment', () => {
  const r = validateExpression("/* open comment resolution(streams)");
  assert.equal(r.valid, false);
  assert.match(r.error, /unterminated.*comment/i);
});

test('rejects malformed ternary (missing colon)', () => {
  const r = validateExpression("count(a)>0 ? bitrate(a,1,2)");
  assert.equal(r.valid, false);
  assert.match(r.error, /ternary/i);
});

test('rejects stray top-level colon', () => {
  const r = validateExpression("resolution(streams) : bitrate(streams,1,2)");
  assert.equal(r.valid, false);
  assert.match(r.error, /colon/i);
});

test('colons inside parentheses are allowed (function args)', () => {
  assert.deepEqual(validateExpression("audioTag(streams,'DTS:X')"), { valid: true });
});

// ── validateEntry ──

test('accepts valid entry', () => {
  assert.deepEqual(validateEntry({ expression: "cached(streams)", enabled: true }), { valid: true });
});

test('accepts entry without enabled (defaults to true)', () => {
  assert.deepEqual(validateEntry({ expression: "cached(streams)" }), { valid: true });
});

test('rejects null entry', () => {
  assert.equal(validateEntry(null).valid, false);
});

test('rejects entry without expression', () => {
  assert.equal(validateEntry({ enabled: true }).valid, false);
});

test('rejects entry with non-boolean enabled', () => {
  assert.equal(validateEntry({ expression: "cached(streams)", enabled: 'true' }).valid, false);
});

test('rejects entry with empty expression', () => {
  assert.equal(validateEntry({ expression: '' }).valid, false);
});

// ── validateExpressionList ──

test('returns empty array for valid list', () => {
  const errors = validateExpressionList([
    { expression: "cached(streams)", enabled: true },
    { expression: "resolution(streams,'1080p')", enabled: true },
  ]);
  assert.deepEqual(errors, []);
});

test('returns errors with index for invalid entries', () => {
  const errors = validateExpressionList([
    { expression: "cached(streams)", enabled: true },
    { expression: '', enabled: true },
    { expression: "resolution(streams", enabled: true },
  ]);
  assert.equal(errors.length, 2);
  assert.equal(errors[0].index, 1);
  assert.equal(errors[1].index, 2);
});

test('rejects non-array input', () => {
  const errors = validateExpressionList('not-an-array');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].index, -1);
});

// ── validateSelPolicy ──

test('validates full policy object', () => {
  const errors = validateSelPolicy({
    preferredStreamExpressions: [{ expression: "cached(streams)", enabled: true }],
    includedStreamExpressions: [{ expression: "library(streams)", enabled: true }],
    excludedStreamExpressions: [{ expression: "resolution(streams,'240p')", enabled: true }],
    rankedStreamExpressions: [],
  });
  assert.deepEqual(errors, {});
});

test('returns error object for null/undefined policy', () => {
  const nullResult = validateSelPolicy(null);
  assert.ok('policy' in nullResult);
  assert.equal(nullResult.policy[0].error, 'Policy must be a non-null object');
  const undefinedResult = validateSelPolicy(undefined);
  assert.ok('policy' in undefinedResult);
});

test('rejects arrays as policy input', () => {
  const result = validateSelPolicy([{ expression: "cached(streams)", enabled: true }]);
  assert.ok('policy' in result);
  assert.equal(result.policy[0].error, 'Policy must be a non-null object');
});

test('reports errors per expression list key', () => {
  const errors = validateSelPolicy({
    preferredStreamExpressions: [{ expression: '', enabled: true }],
    excludedStreamExpressions: [{ expression: "cached(streams)", enabled: true }],
  });
  assert.ok('preferredStreamExpressions' in errors);
  assert.ok(!('excludedStreamExpressions' in errors));
});

// ── Validate all policy data expressions ──

test('all SEL_POLICY_DATA expressions are structurally valid', () => {
  for (const [target, data] of Object.entries(SEL_POLICY_DATA)) {
    for (const key of ['preferredStreamExpressions', 'includedStreamExpressions', 'excludedStreamExpressions']) {
      for (let i = 0; i < data[key].length; i++) {
        const r = validateExpression(data[key][i].expression);
        assert.equal(r.valid, true, `${target}.${key}[${i}] invalid: ${r.error} — "${data[key][i].expression.slice(0, 80)}"`);
      }
    }
  }
});

test('all APEX_MIXED_PSES expressions are structurally valid', () => {
  for (let i = 0; i < APEX_MIXED_PSES.length; i++) {
    const r = validateExpression(APEX_MIXED_PSES[i].expression);
    assert.equal(r.valid, true, `APEX_MIXED_PSES[${i}] invalid: ${r.error}`);
  }
});

test('all buildApexIqr4kPses output expressions are valid', () => {
  const pses = buildApexIqr4kPses({ dv: false, audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  for (let i = 0; i < pses.length; i++) {
    const r = validateExpression(pses[i].expression);
    assert.equal(r.valid, true, `buildApexIqr4kPses[${i}] invalid: ${r.error}`);
  }
});

test('all buildApexIqr1080Pses output expressions are valid', () => {
  const pses = buildApexIqr1080Pses({ audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  for (let i = 0; i < pses.length; i++) {
    const r = validateExpression(pses[i].expression);
    assert.equal(r.valid, true, `buildApexIqr1080Pses[${i}] invalid: ${r.error}`);
  }
});

test('all buildStandard4kPses output expressions are valid', () => {
  const pses = buildStandard4kPses({ dv: false, audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  for (let i = 0; i < pses.length; i++) {
    const r = validateExpression(pses[i].expression);
    assert.equal(r.valid, true, `buildStandard4kPses[${i}] invalid: ${r.error}`);
  }
});

test('all buildStandard1080Pses output expressions are valid', () => {
  const pses = buildStandard1080Pses({ audio: 'limited', forceLimitedAudio: false, supportsAv1: false });
  for (let i = 0; i < pses.length; i++) {
    const r = validateExpression(pses[i].expression);
    assert.equal(r.valid, true, `buildStandard1080Pses[${i}] invalid: ${r.error}`);
  }
});

test('all buildMixedPses output expressions are valid', () => {
  const pses = buildMixedPses({ audio: 'limited', forceLimitedAudio: false, supportsAv1: false, dv: false });
  for (let i = 0; i < pses.length; i++) {
    const r = validateExpression(pses[i].expression);
    assert.equal(r.valid, true, `buildMixedPses[${i}] invalid: ${r.error}`);
  }
});

test('all buildDefaultPses output expressions are valid', () => {
  const pses = buildDefaultPses({ audio: 'limited', forceLimitedAudio: false, supportsAv1: false, dv: false });
  for (let i = 0; i < pses.length; i++) {
    const r = validateExpression(pses[i].expression);
    assert.equal(r.valid, true, `buildDefaultPses[${i}] invalid: ${r.error}`);
  }
});

// ── IQR expressions (complex ternaries) ──

test('iqrExpression outputs are structurally valid', async () => {
  const { iqrExpression } = await import('../src/core/iqr-expression.js');
  const pool = "resolution(quality(streams,'Bluray REMUX'),'2160p')";
  const withDecay = iqrExpression('Test IQR', pool, '15GB', true, '5Mbps');
  assert.equal(validateExpression(withDecay.expression).valid, true, 'IQR with decay');
  const withoutDecay = iqrExpression('Test IQR', pool, '15GB', false);
  assert.equal(validateExpression(withoutDecay.expression).valid, true, 'IQR without decay');
  const noFloor = iqrExpression('Test IQR', pool, null, true, '5Mbps');
  assert.equal(validateExpression(noFloor.expression).valid, true, 'IQR no floor');
});

// ── DV variant expressions ──

test('DV-enabled build variants produce valid expressions', () => {
  for (const builder of [
    () => buildApexIqr4kPses({ dv: true, audio: 'full', forceLimitedAudio: false, supportsAv1: true }),
    () => buildStandard4kPses({ dv: true, audio: 'full', forceLimitedAudio: false, supportsAv1: true }),
    () => buildMixedPses({ audio: 'dolby', forceLimitedAudio: false, supportsAv1: true, dv: true }),
  ]) {
    const pses = builder();
    for (let i = 0; i < pses.length; i++) {
      const r = validateExpression(pses[i].expression);
      assert.equal(r.valid, true, `DV variant PSE[${i}] invalid: ${r.error}`);
    }
  }
});

// ── New (audit 2026-08-08): upstream function existence + length headroom ──

test('unknownSelFunctions flags invalid fns and ignores comments/strings', () => {
  assert.deepEqual(unknownSelFunctions("/*label*/ private(uncached(streams))"), ['private']);
  assert.deepEqual(unknownSelFunctions("floor(q2(values(streams,'seeders'))*0.25)"), [], 'floor/q2/values are valid');
  assert.deepEqual(unknownSelFunctions("count(streams)>=4?bitrate(streams,1,2):[]"), []);
  // strings and comments must not produce false positives
  assert.deepEqual(unknownSelFunctions("/* uses the word private() in a comment */ regexMatched(streams,'LQ (Radarr)')"), []);
});

test('validateExpression rejects unknown functions', () => {
  const r = validateExpression("/*LABS*/ private(uncached(streams))");
  assert.equal(r.valid, false);
  assert.match(r.error, /Unknown SEL function/);
});

test('validateExpression rejects expressions over the fail length', () => {
  const long = ('cached(streams) and '.repeat(300)) + 'cached(streams)'; // ~7200 chars, valid SEL
  const r = validateExpression('/*x*/ ' + long);
  assert.equal(r.valid, false);
  assert.match(r.error, /length/i);
});

test('validateExpression warns (still valid) near the host limit', () => {
  const long = ('cached(streams) and '.repeat(125)) + 'cached(streams)'; // ~2400 chars, valid SEL
  const r = validateExpression('/*x*/ ' + long);
  assert.equal(r.valid, true);
  assert.ok(r.warn && /near/i.test(r.warn));
});

test('every real SEL_POLICY_DATA / apex / standard expression passes the new checks', () => {
  for (const [target, data] of Object.entries(SEL_POLICY_DATA)) {
    for (const key of ['preferredStreamExpressions', 'includedStreamExpressions', 'excludedStreamExpressions']) {
      for (let i = 0; i < (data[key] || []).length; i++) {
        const expr = data[key][i].expression;
        if (!expr || !expr.trim()) continue;
        const r = validateExpression(expr);
        assert.equal(r.valid, true, `${target} ${key}[${i}]: ${r.error || r.warn || ''}`);
      }
    }
  }
  const opts = { dv: false, audio: 'limited', forceLimitedAudio: false, supportsAv1: false };
  for (const build of [buildApexIqr4kPses, buildApexIqr1080Pses, buildStandard4kPses, buildStandard1080Pses, buildMixedPses, buildDefaultPses]) {
    for (const pse of build(opts)) {
      const r = validateExpression(pse.expression);
      assert.equal(r.valid, true, `${pse.expression.slice(0, 60)}: ${r.error || r.warn || ''}`);
    }
  }
});
