import test from 'node:test';
import assert from 'node:assert/strict';

import { buildClientSlate, isNativeShell } from '../lib/client-slate.mjs';

test('isNativeShell is false in Node tests', () => {
  assert.equal(isNativeShell(), false);
});

test('buildClientSlate falls back to a demo slate when remotes fail', async () => {
  const slate = await buildClientSlate({ leagues: ['nhl'], feeds: [] });
  assert.equal(slate.ok, true);
  assert.equal(slate.demo, true);
  assert.ok(slate.events.some((event) => event.league === 'NHL'));
  const hockey = slate.events.find((event) => event.league === 'NHL');
  assert.deepEqual(hockey.channels, ['TSN4', 'SN 3', 'RDS']);
});
