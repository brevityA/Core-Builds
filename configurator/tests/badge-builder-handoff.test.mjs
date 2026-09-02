import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const badgeApp = await readFile(new URL('../../tools/badges/app.mjs', import.meta.url), 'utf8');
const badgeCore = await readFile(new URL('../../tools/badges/core.mjs', import.meta.url), 'utf8');
const build = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');

const key = 'cb-badge-builder-handoff-v1';

test('Badge Builder and Configurator share one versioned session handoff key', () => {
  assert.ok(badgeCore.includes(`HANDOFF_KEY = '${key}'`));
  assert.ok(app.includes(`sessionStorage.getItem('${key}')`));
  assert.ok(app.includes(`sessionStorage.removeItem('${key}')`));
  assert.ok(badgeApp.includes('sessionStorage.setItem(HANDOFF_KEY'));
});

test('Configurator consumes only fresh, bounded Core Badge Builder formatters', () => {
  assert.match(app, /handoff\?\.v === 1/);
  assert.match(app, /handoff\?\.source === 'core-badge-builder'/);
  assert.match(app, /age >= 0 && age < 10 \* 60 \* 1000/);
  assert.match(app, /name\.length > 5000 \|\| description\.length > 5000/);
  assert.ok(app.includes("S.formatter = 'custom'"));
  assert.ok(app.includes("showToast('Core Badge Companion applied"));
});

test('custom formatter persistence restores a valid companion and rejects missing payloads', () => {
  assert.match(app, /const savedCustomFormatter = sanitizeCustomFormatter\(parsed\.customFormatter\)/);
  assert.match(app, /else if \(S\.formatter === 'custom'\) \{\s*S\.formatter = 'family-v4'/);
});

test('web build already publishes the complete tools tree', () => {
  assert.ok(build.includes("cp(resolve(repoRoot, 'tools')"));
});
