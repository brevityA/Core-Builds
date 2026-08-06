import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// AIOStreams v2.32 removed the legacy built-in torbox-search preset (TorBox
// Search API shut down). Saving a config that still includes it fails on
// v2.32+ hosts. These source-scan gates keep the removed preset out of the
// configurator's generated output and the static template suite.

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '../..');

test('app.js does not emit or reference the removed torbox-search preset', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  // The emission literal is the gate: a preset object with type 'torbox-search'.
  // (User-facing docs copy may legitimately mention the removed preset.)
  assert.ok(!/type:\s*'torbox-search'/.test(app), 'app.js must not contain a torbox-search type literal');
  assert.ok(!app.includes("{ type:'torbox-search'"), 'app.js must not emit a torbox-search preset object');
});

test('app.js emits Newznab in the v2.32 api shape', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  assert.ok(!app.includes("newznabUrl:"), 'app.js must not emit legacy newznabUrl');
  assert.ok(!app.includes("apiPath:"), 'app.js must not emit legacy apiPath');
  assert.ok(app.includes("api:{ url:"), 'app.js must emit api.url for Newznab presets');
  assert.ok(app.includes("seasonEpisodeStrategy:'episode'"), 'app.js must emit seasonEpisodeStrategy');
});

test('shared core generator does not emit the removed torbox-search preset', async () => {
  const core = await readFile(resolve(REPO_ROOT, 'packages/core/src/generate-template.js'), 'utf8');
  assert.ok(!core.includes("'torbox-search'"), 'packages/core generate-template.js must not emit torbox-search');
});

test('no static template outside the Legacy lane carries the removed preset', () => {
  const templatesRoot = resolve(REPO_ROOT, 'Templates');
  const walk = (dir) => readdirSync(dir).flatMap((entry) => {
    const full = resolve(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
  const files = walk(templatesRoot).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 50, 'template walk should cover the full suite');
  for (const file of files) {
    const relative = file.slice(templatesRoot.length + 1);
    if (relative.split('/')[0] === 'Legacy') continue; // explicit compatibility lane
    const content = readFileSync(file, 'utf8');
    assert.ok(!content.includes('"type": "torbox-search"'),
      `${relative} must not contain the removed torbox-search preset`);
  }
});
