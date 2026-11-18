/**
 * 2026-11 maintainability/reliability pass — structural guards for:
 *   - <details> panels keeping their open state across re-renders
 *     (render() rewrites main.innerHTML; native [open] would be lost),
 *   - theme toggling surviving unavailable storage (private mode, file://),
 *   - field-level validation status being announced (aria-live),
 *   - the (flag-gated) Sentry sink never sending URL fragments, which is
 *     where share links carry #cfg=<selections>.
 *
 * These tests read the source (the suite's established style for browser-only
 * behaviour) and the policy module directly; the e2e suite covers the live DOM.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(root, 'src/js/app.js'), 'utf8');

test('render() is wrapped so persisted panels keep [open] across re-renders', () => {
  // the wrapper remembers open, opt-in details and restores them by id
  assert.match(app, /function render\(\) \{[\s\S]{0,600}?querySelectorAll\('details\[data-persist-open\]\[open\]'\)/);
  assert.match(app, /for \(const id of _persistOpenDetails\) \{[\s\S]{0,200}?d\.open = true/);
  // the real render body keeps its name's behaviour under renderCore
  assert.match(app, /function renderCore\(\) \{\s*\n\s*renderProgress\(\);/);
});

test('the wizard panels that re-render under user interaction opt into persistence', () => {
  for (const id of ['manualSetupDetails', 'baseConfigDetails', 'pasteManifestDetails', 'fmtPickerDetails', 'jsonPreviewDetails', 'langDetails', 'tmdbDetails']) {
    assert.match(app, new RegExp(`<details id="${id}" data-persist-open`), `${id} must carry data-persist-open`);
  }
});

test('theme toggle applies the theme even when localStorage is unavailable', () => {
  const m = app.match(/function toggleTheme\(\)\{[^}]*\}[^}]*\}/);
  assert.ok(m, 'toggleTheme present');
  assert.match(m[0], /html\.setAttribute\('data-theme',t\);try\{localStorage\.setItem\('cbTheme',t\)\}catch/);
  // the page-bootstrap script must also tolerate missing storage (read side)
  const page = readFileSync(join(root, 'src/index.html'), 'utf8');
  assert.match(page, /try\{document\.documentElement\.setAttribute\('data-theme',localStorage\.getItem\('cbTheme'\)[\s\S]{0,120}?\}catch/);
});

test('UUID validation status is announced to assistive tech', () => {
  assert.match(app, /<div id="uuidStatus" role="status" aria-live="polite"/);
  // the TMDB key status already had this — keep the pair consistent
  assert.match(app, /id="tmdbKeyStatus" role="status" aria-live="polite"/);
});

test('Sentry (flag-gated) strips URL fragments from every URL field it owns', () => {
  // one shared stripper, applied to each documented field
  assert.match(app, /const stripHash = u => \(typeof u === 'string' \? u\.split\('#'\)\[0\] : u\)/);
  assert.match(app, /if \(event\.request\) event\.request\.url = stripHash\(event\.request\.url\)/);
  assert.match(app, /if \(crumb\.data\) crumb\.data\.url = stripHash\(crumb\.data\.url\)/);
  assert.match(app, /if \(crumb\.category === 'history'\) crumb\.message = stripHash\(crumb\.message\)/);
  assert.match(app, /span\.description = stripHash\(span\.description\)/);
  assert.match(app, /if \(span\.data\) span\.data\.url = stripHash\(span\.data\.url\)/);
  // and the coverage boundary is documented, not implied
  assert.match(app, /NOT covered: arbitrary free text inside console\/DOM breadcrumbs/);
  // Sentry must remain disabled unless an operator opts in via cb-flags
  assert.match(app, /const dsn = CB_FLAGS\.sentryDsn;[\s\S]{0,80}?if \(!dsn/);
});

test('details persistence restores only ids that still exist (no throw on absent panels)', () => {
  const m = app.match(/for \(const id of _persistOpenDetails\) \{[\s\S]*?\n  \}/);
  assert.ok(m, 'restore loop present');
  assert.match(m[0], /if \(d\) d\.open = true/);
});

// ── Behavioural check of the exact wrapper code, executed against a stub DOM.
// The wrapper is the only code under test here: it is extracted verbatim from
// app.js and run in a sandbox where renderCore is a controllable stub that
// simulates what main.innerHTML = ... does to <details> elements (they come
// back closed). Real-DOM verification (focus, keyboard, rendering) is e2e.

import { createContext, runInContext } from 'node:vm';

function runWrapper(scenario) {
  const wrapperSrc = app.match(/let _persistOpenDetails = \[\];\nfunction render\(\) \{[\s\S]*?(?=\nfunction renderCore\(\) \{)/);
  assert.ok(wrapperSrc, 'wrapper extractable from app.js');
  // live DOM state, per id
  const live = scenario.initial;
  const details = () => Object.values(live);
  const ctx = createContext({
    document: {
      getElementById(id) {
        if (id === 'main') {
          return { querySelectorAll: () => details().filter(d => d.open) };
        }
        return live[id] || null;
      },
    },
    renderCore() {
      // simulate the innerHTML rewrite: every details element returns closed
      for (const d of details()) d.open = false;
      if (scenario.renderCoreHook) scenario.renderCoreHook(live);
    },
  });
  runInContext(wrapperSrc[0] + '\n;globalThis.__render = render;', ctx);
  ctx.__render();
  return live;
}

test('wrapper behaviour: an open panel survives a re-render', () => {
  const live = runWrapper({
    initial: { manualSetupDetails: { id: 'manualSetupDetails', open: true }, baseConfigDetails: { id: 'baseConfigDetails', open: false } },
  });
  assert.equal(live.manualSetupDetails.open, true, 'open panel restored after re-render');
});

test('wrapper behaviour: an explicitly closed panel stays closed', () => {
  const live = runWrapper({
    initial: { manualSetupDetails: { id: 'manualSetupDetails', open: false }, baseConfigDetails: { id: 'baseConfigDetails', open: false } },
  });
  assert.equal(live.manualSetupDetails.open, false);
  assert.equal(live.baseConfigDetails.open, false);
});

test('wrapper behaviour: a panel the user just closed is not force-reopened', () => {
  // previous render left it open (restored); the user then closed it; a state
  // change re-renders — the wrapper must read the LIVE state (closed), not the
  // previously-restored one
  const live = runWrapper({
    initial: { langDetails: { id: 'langDetails', open: false } },
  });
  assert.equal(live.langDetails.open, false, 'closed state is authoritative');
});

test('wrapper behaviour: open state does not leak to unrelated steps', () => {
  const live = runWrapper({
    initial: { manualSetupDetails: { id: 'manualSetupDetails', open: true } },
    renderCoreHook(l) {
      // step changed: the old panel is gone, new-step panels exist (closed)
      delete l.manualSetupDetails;
      l.fmtPickerDetails = { id: 'fmtPickerDetails', open: false };
    },
  });
  assert.equal(live.fmtPickerDetails.open, false, 'new-step panels untouched');
  assert.equal(live.manualSetupDetails, undefined, 'absent panel not recreated');
});

test('wrapper behaviour: early-return renderCore (e.g. splash) is safe', () => {
  runWrapper({
    initial: { manualSetupDetails: { id: 'manualSetupDetails', open: true } },
    renderCoreHook(l) {
      // splash branch: main.innerHTML now has no details at all
      for (const id of Object.keys(l)) l[id] = null;
    },
  });
  assert.ok(true, 'no throw when the restored panel no longer exists');
});
