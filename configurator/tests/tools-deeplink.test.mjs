import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Regression guard: the Tools page links to ../#troubleshooter and ../#health-score, but the
// configurator only ever parsed #cfg= share links — so those "Open →" cards silently did
// nothing. handleDeepLink() must map them to the real UI actions on load.

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('handleDeepLink exists and is invoked once after initial render', () => {
  assert.match(app, /function handleDeepLink\(hash\) \{/, 'handleDeepLink not defined');
  assert.match(app, /try \{ handleDeepLink\(location\.hash\); \} catch/, 'handleDeepLink not called on load');
});

test('handleDeepLink maps the two Tools-page anchors and leaves #cfg= to the share-link path', () => {
  assert.match(app, /if \(hash === '#troubleshooter'\) \{ setTimeout\(showTroubleshooter, 300\); return; \}/,
    '#troubleshooter not mapped to showTroubleshooter()');
  assert.match(app, /if \(hash === '#health-score'\) \{ step = STEPS; pushStep\(\); render\(\); window\.scrollTo\(0, 0\); return; \}/,
    '#health-score not mapped to the review step');
  assert.match(app, /if \(!hash \|\| hash\.startsWith\('#cfg='\)\) return;/,
    'deep-link handler must not clobber the #cfg= share-link path');
});
