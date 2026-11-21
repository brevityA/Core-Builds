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
  // Through DEEP_ACTIONS (v3.37), which clears the hash so the menu link works twice.
  assert.match(app, /'#troubleshooter':'open-troubleshooter'/, '#troubleshooter not mapped to the troubleshooter action');
  assert.match(app, /if \(action === 'open-troubleshooter'\) showTroubleshooter\(\);/);
  // v3.37: the score lives in Review's Checks sheet, which the link opens.
  assert.match(app, /if \(hash === '#health-score'\) \{ step = STEPS; pushStep\(\); render\(\); window\.scrollTo\(0, 0\); setTimeout\(\(\) => openRvSheet\('checks'\), 100\); return; \}/,
    '#health-score not mapped to the Checks sheet');
  assert.match(app, /if \(!hash \|\| hash\.startsWith\('#cfg='\)\) return;/,
    'deep-link handler must not clobber the #cfg= share-link path');
});
