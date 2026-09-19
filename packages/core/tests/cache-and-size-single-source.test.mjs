import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/generate-template.js';

// Cache filtering and the size cap each have exactly one owner: the native
// excludeCached / excludeUncached flags and the native size policy. Emitting
// the equivalent SEL as well produced the two duplicate-rule reports
// (C05/C06 "cached only is applied twice", C07_DUPLICATE_SIZE_CAP).
//
// These assert on the generated config directly. The golden snapshots cannot
// stand in for them: a snapshot only proves the output has not changed, so a
// fixture that already lacks an expression keeps passing when the expression
// is wrongly absent.

const expressions = (cfg) => (cfg.excludedStreamExpressions || []).map(e => e.expression || '');

const base = {
  device: 'generic', resolution: '1080p', architecture: 'standard',
  outputProfile: 'advanced', langs: ['English'],
};

test('a cached-only debrid route filters natively and emits no Cached Only SEL', () => {
  const cfg = generateTemplate({ ...base, service: 'torbox-pro', cacheMode: 'cached' }).config;
  assert.equal(cfg.excludeUncached, true, 'the native flag is the one mechanism');
  assert.equal(cfg.excludeCached, false);
  assert.ok(!expressions(cfg).some(e => /Cached Only/.test(e)), 'no duplicate SEL alongside the flag');
});

test('an uncached-only debrid route filters natively and emits no Uncached Only SEL', () => {
  const cfg = generateTemplate({ ...base, service: 'torbox-pro', cacheMode: 'uncached' }).config;
  assert.equal(cfg.excludeCached, true);
  assert.equal(cfg.excludeUncached, false);
  assert.ok(!expressions(cfg).some(e => /Uncached Only/.test(e)));
});

for (const service of ['p2p', 'http']) {
  test(`${service} carries no cache filtering in either mechanism`, () => {
    for (const cacheMode of ['cached', 'uncached', 'mixed']) {
      const cfg = generateTemplate({ ...base, service, cacheMode }).config;
      // There is no debrid cache state on a free route: the native flags stay
      // off, the deduplicator disables its cached/uncached passes, and the
      // `cached` sort key is dropped. A Cached Only SEL here would not restore
      // filtering, it would apply a debrid predicate to streams that have none
      // — so its absence is the correct output, not an omission.
      assert.equal(cfg.excludeCached, false, `${service}/${cacheMode} excludeCached`);
      assert.equal(cfg.excludeUncached, false, `${service}/${cacheMode} excludeUncached`);
      assert.ok(!expressions(cfg).some(e => /Cached Only|Uncached Only/.test(e)),
        `${service}/${cacheMode} must not emit a cache SEL`);
      assert.ok(!(cfg.sortCriteria.global || []).some(k => k.key === 'cached'),
        `${service}/${cacheMode} must not sort on cache state`);
    }
  });
}

test('the size cap is applied once, by the native policy, on every route', () => {
  for (const service of ['torbox-pro', 'p2p', 'http']) {
    const cfg = generateTemplate({ ...base, service, cacheMode: 'mixed', sizeLimit: 20 }).config;
    assert.ok(!expressions(cfg).some(e => /Size Limit/.test(e)), `${service} must not re-emit the cap as SEL`);
    assert.equal(cfg.size.global.movies[1], 20_000_000_000, `${service} caps natively at the selection`);
    assert.equal(cfg.size.global.movies[0], 0, `${service} must not floor at the selection`);
  }
});
