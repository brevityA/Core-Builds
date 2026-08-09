import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('explicit host honoring layer exists (resolveInstallHost + checkHostVersion)', () => {
  assert.match(app, /async function resolveInstallHost\(timeout=4000\)/);
  assert.match(app, /async function checkHostVersion\(baseUrl, timeout, hostKeyOrLabel\)/);
});

test('explicit dropdown selection probes ONLY that host; auto keeps the health probe', () => {
  const m = app.match(/async function resolveInstallHost\(timeout=4000\) \{([\s\S]*?)\n\}/);
  assert.ok(m);
  const body = m[1];
  assert.match(body, /HOST_BASE_URLS\[key\]/, 'explicit selection resolves its own URL');
  assert.match(body, /checkHostVersion\(url, timeout, key\)/, 'explicit selection is version-gated');
  assert.match(body, /HOST_BLOCKS_FREE/, 'explicit selection refuses free-unsupported hosts instead of writing a broken config');
  assert.match(body, /return selectHealthyHost\(timeout\);/, "'auto' keeps existing fastest-healthy behavior");
});

test('no write path silently probes all hosts anymore (the silent-failover bug)', () => {
  const direct = (app.match(/await selectHealthyHost\(4000\)/g) || []).length;
  assert.equal(direct, 1, 'the ONLY direct fastest-probe call in the app is the self-heal fallback inside quick-rebuild');
  const count = (app.match(/await resolveInstallHost\(4000\)/g) || []).length;
  assert.ok(count >= 3, `expected ≥3 honored call sites (direct, express, update wizard), got ${count}`);
});

test('host failures are named and rendered (unreachable / outdated / blocks-free)', () => {
  assert.match(app, /HOST_UNREACHABLE:/);
  assert.match(app, /HOST_OUTDATED:/);
  assert.match(app, /HOST_BLOCKS_FREE:/);
  const h = app.match(/function hostErrorHtml\(raw\) \{([\s\S]*?)\n\}/);
  assert.ok(h);
  ['HOST_UNREACHABLE','HOST_OUTDATED','HOST_BLOCKS_FREE'].forEach(t => assert.ok(h[1].includes(t), `hostErrorHtml handles ${t}`));
});

test('express lane exposes an explicit host dropdown prefilled from Advanced', () => {
  assert.match(app, /id="expressHost"/);
  assert.match(app, /Auto \(fastest healthy\)/);
  assert.match(app, /S\.instanceHost = hostSel\.value/, 'express Go persists the dropdown choice into shared state');
});

test('custom/self-hosted explicit selection requires a URL and is version-gated too', () => {
  const m = app.match(/key === 'custom'[\s\S]{0,300}/);
  assert.ok(m);
  assert.match(m[0], /S\.instanceUrl/);
  assert.match(m[0], /checkHostVersion\(S\.instanceUrl/);
});

test('quick-rebuild self-heals dead/outdated/unsupported hosts with notification (18-B)', () => {
  const m = app.match(/if \(action === 'quick-rebuild'\) \{([\s\S]*?)\n    \}/);
  assert.ok(m);
  assert.match(m[1], /resolveInstallHost\(4000\)/, 'rebuilds probe the chosen host');
  assert.match(m[1], /selectHealthyHost\(4000\)/, 'dead explicit host falls back to the fastest-healthy probe');
  assert.match(m[1], /healedFrom/, 'heal is recorded');
  assert.match(m[1], /was down — rebuilt on/, 'the heal is announced (never silent)');
});

test('express lane shows a live host-health chip (probe on open + on change)', () => {
  assert.match(app, /id="expressHostChip"/);
  assert.match(app, /async function probeHostDetail\(url, timeout=4000\)/);
  assert.match(app, /addEventListener\('change'/); assert.match(app, /probeExpressHost\(\)/, 'host chip probe wired on change + on open');
  const d = app.match(/async function probeHostDetail\(url, timeout=4000\) \{([\s\S]*?)\n\}/);
  assert.match(d[1], /catch\(/, 'UI probes never throw');
  assert.match(d[1], /'outdated'/, 'UI probes flag sub-floor versions');
});
