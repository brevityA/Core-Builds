import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/03-enhancements.css', import.meta.url), 'utf8');

test('device picker uses the responsive grid rather than the formatter carousel', () => {
  assert.ok(app.includes('class="device-grid"'));
  assert.ok(app.includes('class="device-card"'));
  assert.ok(app.includes('class="device-help-banner"'));
  assert.ok(!app.includes('id="devScroll"'));
  assert.match(css, /\.device-grid\{display:grid/);
  assert.match(css, /@media\(max-width:599px\)[\s\S]*\.device-grid\{grid-template-columns:repeat\(2,1fr\)/);
});

test('device grid exposes radio semantics and keyboard activation', () => {
  assert.ok(app.includes('role="radiogroup" aria-label="Your device"'));
  assert.ok(app.includes('role="radio" aria-checked="${active}" tabindex="0"'));
  assert.ok(app.includes('Keyboard support for the device grid cards'));
});
