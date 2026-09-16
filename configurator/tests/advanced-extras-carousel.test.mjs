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
  // Both carousels now gate cards the selected route cannot satisfy, so the interactive
  // attributes live in one arm of a conditional and a gated card is deliberately not
  // focusable. Assert those properties rather than one byte sequence — the old literal
  // `role=… aria-checked=… tabindex=0` run only ever matched whichever card had not been
  // gated yet, which made it fail the moment the second one was.
  assert.ok(app.includes('role="checkbox" aria-checked="${active}"'), 'cards announce selection state');
  assert.match(app, /data-action="toggle-optional-scraper" tabindex="0"/, 'a reachable scraper card is focusable');
  assert.match(app, /data-action="toggle-carousel-service" tabindex="0"/, 'a reachable service card is focusable');
  assert.match(app, /aria-disabled="true" title="\$\{escHtml\(why\)\}"/, 'a gated card is announced as disabled, with the reason');
  assert.ok(app.includes("extrasCard && (e.key === 'Enter' || e.key === ' ')"));
  assert.ok(app.includes("card.setAttribute('aria-checked', String(selected))"));
  assert.match(css, /\.opt-scraper-card:focus-visible/);
});
