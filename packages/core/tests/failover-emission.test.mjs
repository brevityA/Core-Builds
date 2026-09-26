import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/generate-template.js';

// Upstream renamed nzbFailover -> failover and migrates the legacy spelling
// BEFORE schema validation, passing `position` through blindly. Core Builds
// emitted two positions that are not in the new enum ('first' for the
// before-torrents option, 'after' in Base-Config) — both rejected the whole
// save at the host. The generator now emits the live spelling directly, and
// the Fine-Tune count finally lands in maxAttempts (it used to be emitted as
// `maxFailoverNzbs`, which upstream never read).

const base = {
  device: 'generic', resolution: '1080p', architecture: 'standard',
  outputProfile: 'advanced', langs: ['English'], service: 'torbox-pro',
};

test('the generator emits failover, never the legacy nzbFailover spelling', () => {
  const cfg = generateTemplate({ ...base }).config;
  assert.deepEqual(cfg.failover, { enabled: false });
  assert.ok(!('nzbFailover' in cfg), 'legacy key must not be emitted');
});

test('an enabled failover covers Usenet and debrid with the chosen attempt count', () => {
  const cfg = generateTemplate({ ...base, nzbFailover: true }).config;
  assert.equal(cfg.failover.enabled, true);
  assert.deepEqual(cfg.failover.contentTypes, ['usenet', 'debrid']);
  assert.equal(cfg.failover.maxAttempts, 3, 'default count lands in maxAttempts');
  assert.ok(!('maxFailoverNzbs' in (cfg.failover || {})), 'dead count spelling must not be emitted');
  const explicit = generateTemplate({ ...base, nzbFailover: true, maxFailoverNzbs: 5 }).config;
  assert.equal(explicit.failover.maxAttempts, 5);
});

test('after-torrents omits position (upstream default is last)', () => {
  const cfg = generateTemplate({ ...base, nzbFailover: true, nzbFailoverPosition: 'after-torrents' }).config;
  assert.ok(!('position' in cfg.failover));
});

test('before-torrents maps to beforeLimiting — never the invalid first', () => {
  const cfg = generateTemplate({ ...base, nzbFailover: true, nzbFailoverPosition: 'before-torrents' }).config;
  assert.equal(cfg.failover.position, 'beforeLimiting');
  assert.ok(!['first', 'after'].includes(cfg.failover.position), 'positions outside the upstream enum reject the save');
});
