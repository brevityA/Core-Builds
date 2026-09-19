import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sizePolicy } from '../src/core/filter-policy.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

// This guards the v2.86 regression where the Max File Size control set the
// selected limit as the MINIMUM, so picking "20GB" hid everything under 20GB.
//
// It used to assert on the `size(streams,'1B','${S.sizeLimit}GB')` string in
// app.js. That expression is gone: the native size policy reads the same
// S.sizeLimit and caps on every route, so emitting the SEL too capped twice
// with different pack/folder semantics (C07_DUPLICATE_SIZE_CAP — "size
// filtering is applied twice"). The invariant is unchanged, so it is asserted
// against the policy that now owns the cap rather than against source text.

test('max file size uses the selected value as the upper bound, not the lower', () => {
  const limited = sizePolicy({ sizeLimit: 20 });
  assert.deepEqual(limited.global.movies, [0, 20_000_000_000]);
  assert.deepEqual(limited.global.series, [0, 20_000_000_000]);

  for (const [res, band] of Object.entries(limited.resolution)) {
    assert.equal(band.movies[0], 0, `${res} movies must not floor at the selected size`);
    assert.ok(band.movies[1] <= 20_000_000_000, `${res} movies must cap at or below the selection`);
    assert.ok(band.series[1] <= 20_000_000_000, `${res} series must cap at or below the selection`);
  }
});

test('an unlimited selection keeps the sane default bands', () => {
  const open = sizePolicy({ sizeLimit: 'unlimited' });
  assert.ok(open.global.movies[0] > 0, 'unlimited keeps a junk-file floor');
  assert.ok(open.global.movies[1] > 20_000_000_000);
});

test('the inverted min/max form never comes back', () => {
  assert.doesNotMatch(app, /size\(streams,'\$\{mb\}MB','999999GB'\)/);
});

test('the duplicate Size Limit expression is not re-emitted', () => {
  // Reintroducing it would recreate the double cap users saw reported as
  // "size filtering is applied twice".
  assert.doesNotMatch(app, /\/\* Size Limit — max \$\{S\.sizeLimit\}GB \*\//);
});
