import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('Fine-Tune actions use delegated closest lookup for nested click targets', () => {
  assert.match(app, /const el = e\.target\.dataset\.action \? e\.target : e\.target\.closest\('\[data-action\]'\)/);
  for (const action of ['set-audio','set-formatter','toggle-carousel-service','toggle-optional-scraper','toggle-pref']) {
    assert.ok(app.includes(`data-action="${action}"`) || app.includes(`action === '${action}'`), `missing ${action} wiring`);
  }
});

test('Fine-Tune drawer has keyboard-safe open and close paths', () => {
  assert.match(app, /function openAdvancedDrawer\(trigger\)/);
  assert.match(app, /function closeAdvancedDrawer\(\)/);
  assert.ok(app.includes("overlay.addEventListener('keydown'"));
});
