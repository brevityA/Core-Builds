import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/06-features.css', import.meta.url), 'utf8');

test('Advanced Builder restores the inline extras and scraper carousel', () => {
  assert.ok(app.includes('const carouselOptSection ='));
  assert.ok(app.includes('const optSection = S.simpleMode ? compactOptSection : carouselOptSection'));
  assert.ok(app.includes('data-action="toggle-carousel-service"'));
  assert.ok(app.includes('data-action="toggle-optional-scraper"'));
});

test('Quick and guided routes retain the compact optional-services picker', () => {
  assert.ok(app.includes('const compactOptSection ='));
  assert.ok(app.includes('showAdditionalServicesPicker(options={})'));
  assert.ok(app.includes('id="flExtrasBtn"'));
});

test('carousel cards expose selection state to keyboard and assistive technology', () => {
  assert.ok(app.includes('role="checkbox" aria-checked="${active}" tabindex="0"'));
  assert.ok(app.includes("extrasCard && (e.key === 'Enter' || e.key === ' ')"));
  assert.ok(app.includes("card.setAttribute('aria-checked', String(selected))"));
  assert.match(css, /\.opt-scraper-card:focus-visible/);
});
