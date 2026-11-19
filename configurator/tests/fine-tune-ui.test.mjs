// Fine-Tune and the stream-card entry points (v3.35). Pins the section bar, the
// order (Stream cards second), the light-theme tokens and every way to the picker.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/07-menu-parity.css', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../../tools/core-nav.js', import.meta.url), 'utf8');

function fnBody(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  return app.slice(start, app.indexOf('\nfunction ', start + 10));
}
const panel = fnBody('renderAdvancedPanel');

test('every chip in the section bar has a section to land on', () => {
  const sections = [...app.matchAll(/\['(ft-[a-z]+)','[^']+'\]/g)].map(m => m[1]);
  assert.deepEqual(sections, ['ft-profile', 'ft-layout', 'ft-audio', 'ft-video', 'ft-subtitles', 'ft-catalogs', 'ft-more']);
  for (const id of sections) assert.match(panel, new RegExp(`id="${id}"`), `${id} missing from Fine-Tune`);
  assert.match(panel, /\$\{ftJumpHtml\(\)\}/);
});

test('Stream cards comes right after the output profile', () => {
  const order = ['ft-profile', 'ft-layout', 'ft-audio', 'ft-video', 'ft-subtitles', 'ft-catalogs', 'ft-more'].map(id => panel.indexOf(`id="${id}"`));
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'sections out of order');
});

test('the header and section bar stay pinned: the drawer card does not clip', () => {
  assert.match(css, /\.advanced-drawer-content>\.card\{overflow:visible\}/);
  assert.match(panel, /<div class="ft-top">/);
});

test('jumping never calls scrollIntoView on a chip (it cancels the drawer scroll)', () => {
  const sync = fnBody('syncFtJump');
  assert.doesNotMatch(sync, /chip\.scrollIntoView/);
  assert.match(sync, /row\.scrollLeft/);
});

test('Fine-Tune and the profile picker take their colours from the theme', () => {
  for (const name of ['renderAdvancedPanel', 'renderOutputProfilePicker']) {
    const body = fnBody(name);
    for (const raw of ['#e6edf3', '#9ca3af', '#6b7280', '#4b5563', '#8b949e', '#c9d1d9', '#0b0f16', 'rgba(255,255,255']) {
      assert.ok(!body.includes(raw), `${name} still hard-codes ${raw}`);
    }
  }
});

test('every way to the stream-card picker uses one action', () => {
  assert.match(app, /if \(action === 'show-stream-cards'\) \{ openStreamCards\(el\); return; \}/);
  assert.match(app, /'#cards':'show-stream-cards'/, 'deep link');
  assert.match(app, /class="rv-cards-row" data-action="show-stream-cards"/, 'Review row');
  assert.match(app, /data-action="show-stream-cards" class="fine-tune-btn fine-tune-cards"/, 'Custom build button');
  assert.match(nav, /\['Stream cards', 'configurator\/#cards', 'cards'\]/, 'site menu');
});

test('Quick install shows Stream cards in step 3, once', () => {
  const step3 = app.slice(app.indexOf('id="ux-prefs"'), app.indexOf('id="expressAdvanced"'));
  assert.match(step3, /class="fastlane-default ux-cards-row" data-express-customize="ft-layout"/);
  assert.doesNotMatch(fnBody('expressDefaultRows'), /ft-layout/, 'not repeated in the folded defaults');
});

test('stream cards are keyboard-operable and score radios are grouped per picker', () => {
  assert.match(app, /data-action="fmt-scroll-pick" data-fmt="\$\{f\.id\}" role="button" tabindex="0" aria-pressed="\$\{active\}"/);
  assert.match(app, /closest\('\.device-card, \.fmt-row'\)/);
  assert.match(fnBody('fmtScoreControlHtml'), /name="\$\{group\}"/);
  assert.doesNotMatch(app, /name="fmtScore"/);
});

test('Quick install\'s tall hero heading is not pinned over the steps', () => {
  assert.match(css, /#expressLaneModal \.fastlane-head\.ux-hero\{position:relative\}/);
});

test('a newer section jump cancels the slide-in correction of an older one', () => {
  const fn = app.slice(app.indexOf('function ftJumpTo('), app.indexOf('function syncFtJump('));
  assert.match(fn, /const jump = \+\+_ftJumpSeq;/);
  assert.match(fn, /if \(jump !== _ftJumpSeq\) return;/);
});

test('the stream-card picker shows one preview above plain rows', () => {
  const picker = fnBody('fmtDropdownHtml');
  assert.match(picker, /fmtStageHtml\(\)/);
  assert.doesNotMatch(picker, /fmt-live-preview|corePreview|enginePreview/, 'rows carry no preview of their own');
  assert.match(picker, /escHtml\(f\.label\)/, 'an imported formatter\'s name is escaped');
  const stage = fnBody('fmtStageHtml');
  assert.match(stage, /isCustom \? null :/, 'an imported formatter does not borrow another preview');
  assert.match(css, /\.fmt-row\{display:flex;/);
  assert.match(css, /\.fmt-row-tag\{[^}]*font-family:var\(--font-mono\)/, 'tags match the main page');
});
