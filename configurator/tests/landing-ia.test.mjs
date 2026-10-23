/**
 * Landing IA (v3.20 redesign).
 *
 * Two equal ways in sit under the lede, on the first screen on a phone too:
 * Quick install (the Express lane) and Custom build (the full builder). Update,
 * Import, Setup Genie and the tour are text links beneath them, a saved build's
 * Resume banner sits above the hero, and no
 * tour pops up over the landing on a first visit. Replaces the September
 * Express-first layout, where the Advanced Builder was a small grey link at the
 * bottom edge of the screen.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/04-landing.css', import.meta.url), 'utf8');
const between = (from, to) => {
  const a = app.indexOf(from), b = app.indexOf(to, a);
  return a > -1 && b > a ? app.slice(a, b) : null;
};
const startBlock = between('id="splashStart"', 'id="splashAltRoutes"');
const moreBlock = between('id="splashAltRoutes"', 'class="hybrid-trust"');
const heroBlock = between('class="hybrid-hero"', 'class="hybrid-core-stage');
assert.ok(startBlock && moreBlock && heroBlock, 'fixture guard: the landing entry blocks must exist');

test('two equal entry cards: Quick install and Custom build', () => {
  const cards = startBlock.match(/class="start-card [^"]*"/g) || [];
  assert.equal(cards.length, 2);
  assert.match(startBlock, /class="start-card start-quick" data-action="open-express-lane"/);
  assert.match(startBlock, /class="start-card start-custom" data-action="custom-start"/);
  assert.match(startBlock, /Service &rarr; device &rarr; resolution &rarr; key &rarr; Deploy/);
});

test('the entry cards are in the hero, ahead of the illustration', () => {
  assert.ok(heroBlock.includes('id="splashStart"'), 'on a phone the hero stacks, so the cards come before the core graphic');
});

test('the other routes stay one click away as text links', () => {
  for (const action of ['update-template', 'paste-manifest-splash', 'open-tutorial']) {
    assert.match(moreBlock, new RegExp(`data-action="${action}"`), action);
  }
  const banner = app.indexOf('class="hybrid-session continue-banner"');
  assert.ok(banner > -1 && banner < app.indexOf('class="hybrid-hero"'), 'a saved build is resumed from above the hero, on the first screen');
  assert.equal((app.match(/data-action="continue-session"/g) || []).length, 1, 'one Resume control, not two');
  assert.match(moreBlock, /href="..\/tools\/genies\/"/);
  assert.ok(existsSync(new URL('../../tools/genies/index.html', import.meta.url)), 'the Genie link cannot 404');
});

test('no tour pops up over the landing on a first visit', () => {
  assert.doesNotMatch(app, /setTimeout\(\(\) => tutGo\(0\), 1000\)/);
  assert.match(app, /action === 'open-tutorial'\) \{ tutGo\(0\); \}/, 'the tour still opens on demand');
});

test('the tour points at the entry cards', () => {
  assert.match(app, /target:'#splashStart'/);
  assert.match(app, /target:'#splashStart \[data-action="open-express-lane"\]'/);
  assert.doesNotMatch(app, /target:'\.splash-doors/, 'no step may point at the removed Express section');
});

test('on a phone the cards stack full width', () => {
  assert.match(css, /@media\(max-width:599px\)\{[^}]*\}?\.splash-start\{grid-template-columns:1fr/);
});
