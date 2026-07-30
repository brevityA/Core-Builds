import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('last-generation snapshots carry version metadata for the update banner', () => {
  const match = app.match(/function saveLastGen\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, 'saveLastGen() must exist');
  assert.match(match[1], /snap\._ver = CONFIGURATOR_VERSION;[\s\S]*snap\._ts = Date\.now\(\);/);
});
