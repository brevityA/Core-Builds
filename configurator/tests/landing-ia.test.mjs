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
const startBlock = between('id="splashStart"', '</nav>');
const menuBlock = between('id="lpMenu"', '</nav>');
const heroBlock = between('class="hybrid-hero"', 'class="hybrid-core-stage');
assert.ok(startBlock && menuBlock && heroBlock, 'fixture guard: the landing rows, menu and hero must exist');

test('one list of equal rows, Core Builds first (v3.33)', () => {
  const rows = startBlock.match(/class="lp-row(?: [^"]*)?"/g) || [];
  assert.equal(rows.length, 6, 'Core Builds + five tools');
  assert.match(startBlock, /^[^]*?class="lp-row lp-row-main" data-action="open-express-lane"><span class="lp-row-ico">\$\{BRAND_GLYPHS\.corebuilds\}<\/span><b>Core Builds<\/b>/);
  for (const href of ['../tools/inspector/', '../account-tools/', '../tools/genies/nuvio-stacks.html', '../tools/badges/', '../tools/']) {
    assert.ok(startBlock.includes(`href="${href}"`), href);
  }
});

test('the rows are in the hero, ahead of the illustration', () => {
  assert.ok(heroBlock.includes('id="splashStart"'), 'on a phone the hero stacks, so the rows come before the core graphic in source');
});

test('every secondary route is one tap away in the menu', () => {
  for (const action of ['custom-start', 'easy-start', 'update-template', 'paste-manifest-splash', 'open-tutorial', 'compare-templates', 'show-changelog', 'open-diagnostics']) {
    assert.match(menuBlock, new RegExp(`data-action="${action}"`), action);
  }
  assert.match(menuBlock, /href="..\/tools\/genies\/"/);
  assert.ok(existsSync(new URL('../../tools/genies/index.html', import.meta.url)), 'the Genie link cannot 404');
  assert.match(app, /id="lpMenuBtn" data-lp-menu="open" aria-label="Open menu" aria-expanded="false" aria-controls="lpMenu"/);
  const banner = app.indexOf('class="hybrid-session continue-banner"');
  assert.ok(banner > -1 && banner < app.indexOf('class="hybrid-hero"'), 'a saved build is resumed from above the hero, on the first screen');
  assert.equal((app.match(/data-action="continue-session"/g) || []).length, 1, 'one Resume control, not two');
});

test('no tour pops up over the landing on a first visit', () => {
  assert.doesNotMatch(app, /setTimeout\(\(\) => tutGo\(0\), 1000\)/);
  assert.match(app, /action === 'open-tutorial'\) \{ tutGo\(0\); \}/, 'the tour still opens on demand');
});

test('the tour points at the rows', () => {
  assert.match(app, /target:'#splashStart'/);
  assert.match(app, /target:'#splashStart \[data-action="open-express-lane"\]'/);
  assert.doesNotMatch(app, /target:'\.splash-doors/, 'no step may point at the removed Express section');
  assert.doesNotMatch(app, /target:'#splashPresets'|target:'\.hybrid-services'/, 'no step may point at the removed chips or presets');
});

test('on a phone the cards stack full width', () => {
  assert.match(css, /@media\(max-width:599px\)\{[^}]*\}?\.splash-start\{grid-template-columns:1fr/);
});
