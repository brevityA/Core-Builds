import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const displayVersion = pkg.version.replace(/\.0$/, '');
const shell = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
const built = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const buildScript = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');

test('source index.html uses __CB_VERSION__ placeholder, not a hard-coded version', () => {
  assert.ok(shell.includes('v__CB_VERSION__'), 'source should contain the placeholder token');
  assert.ok(!(/v\d+\.\d+<\/span>/.test(shell)), 'source should not hard-code a version in the badge');
});

test('built index.html contains the package.json version in the header badge', () => {
  const expected = `title="View changelog">v${displayVersion}</span>`;
  assert.ok(built.includes(expected), `built HTML should contain "${expected}"`);
});

test('built index.html does not contain the raw placeholder', () => {
  assert.ok(!built.includes('__CB_VERSION__'), 'built HTML should not contain unresolved placeholder');
});

test('build script reads version from package.json', () => {
  assert.ok(buildScript.includes("readFile(resolve(root, 'package.json')"), 'build should read package.json');
  assert.ok(buildScript.includes('__CB_VERSION__'), 'build should replace the placeholder');
});
