import test from 'node:test';
import assert from 'node:assert/strict';
import { iqrExpression } from '../src/core/iqr-expression.js';
import { SEL_POLICY_DATA } from '../src/core/sel-policy-data.js';

test('iqrExpression generates valid IQR Tukey fence with floor', () => {
  const result = iqrExpression(
    'S-Tier 4K REMUX — IQR Tukey fence',
    "resolution(quality(streams,'BluRay REMUX'),'2160p')",
    '15GB', false
  );
  assert.equal(result.enabled, true);
  assert.ok(result.expression.includes('/*S-Tier 4K REMUX — IQR Tukey fence*/'));
  assert.ok(result.expression.includes('q1(values('));
  assert.ok(result.expression.includes('q3(values('));
  assert.ok(result.expression.includes(",'15GB')"));
  assert.ok(result.expression.endsWith('[]'));
});

test('iqrExpression generates decay branch when decay=true', () => {
  const result = iqrExpression(
    'A-Tier 4K WEB-DL HDR — IQR + linear decay',
    "resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p')",
    null, true, '5Mbps'
  );
  assert.equal(result.enabled, true);
  assert.ok(result.expression.includes('daysSinceRelease'));
  assert.ok(result.expression.includes('median(values('));
  assert.ok(result.expression.includes("'5Mbps'"));
  assert.ok(!result.expression.endsWith('[]'));
});

test('iqrExpression without floor omits size() wrapper', () => {
  const result = iqrExpression(
    'D-Tier 4K WEBRip SDR — IQR',
    "resolution(quality(streams,'WEBRip'),'2160p')",
    null, false
  );
  assert.ok(!result.expression.includes("size("));
  assert.ok(result.expression.endsWith('[]'));
});

test('iqrExpression default decayFloor is 5Mbps when not specified', () => {
  const r1 = iqrExpression('test', 'streams', null, true);
  const r2 = iqrExpression('test', 'streams', null, true, '5Mbps');
  assert.equal(r1.expression, r2.expression);
});

test('iqrExpression output matches golden IQR 4K fixture PSEs', () => {
  const iqrPses = SEL_POLICY_DATA.iqr.preferredStreamExpressions;
  const iqrLabels = iqrPses.map(p => p.expression).filter(e => e.includes('IQR'));

  const generated4kRemux = iqrExpression(
    'S-Tier 4K REMUX — IQR Tukey fence',
    "resolution(quality(streams,'BluRay REMUX'),'2160p')",
    '15GB', false
  );
  const matchingFixture = iqrLabels.find(e => e.includes('S-Tier 4K REMUX'));
  assert.ok(matchingFixture, 'Golden fixture should have S-Tier 4K REMUX IQR');
  assert.equal(generated4kRemux.expression, matchingFixture,
    'Generated IQR expression must match golden fixture byte-for-byte');
});

test('iqrExpression has balanced parentheses', () => {
  const expressions = [
    iqrExpression('t1', 'streams', '15GB', false),
    iqrExpression('t2', 'streams', null, true, '5Mbps'),
    iqrExpression('t3', 'streams', '8GB', false),
    iqrExpression('t4', 'streams', null, true, '1Mbps'),
    iqrExpression('t5', 'streams', null, false),
  ];
  for (const { expression } of expressions) {
    const opens = (expression.match(/\(/g) || []).length;
    const closes = (expression.match(/\)/g) || []).length;
    assert.equal(opens, closes, `Unbalanced parentheses in: ${expression.slice(0, 80)}...`);
  }
});

test('iqrExpression produces no browser globals', () => {
  const { expression } = iqrExpression('test', 'streams', null, true, '5Mbps');
  for (const global of ['document', 'window', 'localStorage', 'fetch(', 'navigator']) {
    assert.ok(!expression.includes(global), `Expression contains browser global: ${global}`);
  }
});
