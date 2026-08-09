import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('last-generation snapshots carry version metadata for the update banner', () => {
  const match = app.match(/function saveLastGen\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, 'saveLastGen() must exist');
  assert.match(match[1], /snap\._ver = CONFIGURATOR_VERSION;[\s\S]*snap\._ts = Date\.now\(\);/);
});

test('legacy snapshots without a version do not trigger a false update banner', () => {
  assert.match(app, /if \(!ver\) return null;/);
  assert.doesNotMatch(app, /No version — template may be old/);
});

test('update banner offers settings-preserving quick-rebuild (not state-wiping start-fresh)', () => {
  const m = app.match(/function versionBannerHtml\(\) \{([\s\S]*?)\n\}/);
  assert.ok(m, 'versionBannerHtml() must exist');
  assert.match(m[1], /data-action="quick-rebuild"/, 'banner button must call quick-rebuild');
  assert.doesNotMatch(m[1], /data-action="start-fresh"/, 'banner must not wipe user settings (the old rebuild loop)');
});

test('quick-rebuild keeps state, stamps the current version, and re-renders', () => {
  const m = app.match(/if \(action === 'quick-rebuild'\) \{([\s\S]*?)\n    \}/);
  assert.ok(m, 'quick-rebuild handler must exist');
  assert.match(m[1], /saveLastGen\(\);/, 'must stamp coreBuildLastGen with the current version');
  assert.doesNotMatch(m[1], /clearState\(\)/, 'must not clear user settings (that was the loop)');
  assert.match(m[1], /render\(\);/, 'must re-render so the banner resolves immediately');
  assert.match(m[1], /!S\.service/, 'must guard against rebuilding an empty config');
});
