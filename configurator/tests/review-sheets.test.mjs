// Review without folds (v3.37): Install stays on the page and every other
// setting group opens one sheet that closes back to Review. Behaviour in a real
// browser is covered by e2e/review-sheets.spec.mjs; this pins the structure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(root, 'src/js/app.js'), 'utf8');
const nav = readFileSync(join(root, '..', 'tools', 'core-nav.js'), 'utf8');

const reviewStart = app.indexOf('  if (step === STEPS) {\n    if (!S.name)');
const reviewEnd = app.indexOf("  } else if (def.id === 'apis') {", reviewStart);
const review = app.slice(reviewStart, reviewEnd);

test('the Review step renders no folded panels', () => {
  assert.ok(reviewStart > 0 && reviewEnd > reviewStart, 'Review block found');
  assert.doesNotMatch(review, /<details/, 'Review has no <details>');
});

test('Install is on the page, with Test streams first under it', () => {
  const install = review.slice(review.indexOf('<section class="rv-install"'), review.indexOf('</section>'));
  assert.match(install, /data-action="simple-install"/);
  assert.match(install, /data-action="test-drive">\$\{ICO\.eye\(15,'currentColor'\)\} Test streams first/);
});

test('four rows, four sheets, and nothing lost on the way', () => {
  for (const id of ['aio', 'cards', 'checks', 'export']) {
    assert.match(review, new RegExp(`id="rvSheet-${id}" role="dialog" aria-modal="true"`), `${id} sheet`);
  }
  const between = (a, b) => review.slice(review.indexOf(`id="rvSheet-${a}"`), b ? review.indexOf(`id="rvSheet-${b}"`) : undefined);
  const aio = between('aio', 'cards');
  for (const id of ['pasteManifest', 'aioHost', 'aioPwd', 'aioUuid', 'baseUuidInput', 'basePwdInput', 'btnAio']) assert.match(aio, new RegExp(`id="${id}"`), `${id} in Your AIOStreams`);
  assert.ok(aio.indexOf('id="aioUuid"') < aio.indexOf('id="baseUuidInput"'), 'Base config sits at the bottom');
  const cards = between('cards', 'checks');
  assert.match(cards, /\$\{formatterPickerHtml\(\)\}/);
  assert.match(cards, /What this build does[\s\S]*\$\{insightsHtml\(\)\}/);
  const checks = between('checks', 'export');
  for (const f of ['templateHealthCheck()', 'healthScoreHtml()', 'hostCompatHtml()']) assert.ok(checks.includes(f), f);
  const exp = review.slice(review.indexOf('id="rvSheet-export"'));
  for (const a of ['generate-dl', 'share-config', 'create-import', 'copy-json']) assert.match(exp, new RegExp(`data-action="${a}"`), a);
  assert.match(exp, /id="jsonPreview"/);
});

test('the Tools fold moved to the site menu', () => {
  assert.doesNotMatch(review, /open-troubleshooter|open-feedback-report|open-recommended-stack/);
  const help = nav.slice(nav.indexOf("['Help', ["), nav.indexOf("['Community', ["));
  assert.match(help, /\['Troubleshooter', 'configurator\/#troubleshooter', 'wrench'\]/);
  assert.match(help, /\['Copy a safe feedback report', 'configurator\/#feedback', 'clip'\]/);
  assert.match(help, /\['Recommended add-ons', 'configurator\/#stack', 'star'\]/);
  assert.match(app, /'#stack':'open-recommended-stack'/);
  // Menu › Import a config opens Your AIOStreams at its paste field.
  assert.match(app, /if \(pasteMode\) \{[\s\S]{0,300}?openRvSheet\('aio'/);
});

test('a sheet closes on Back, on Escape and with Done, and survives a re-render', () => {
  assert.match(app, /if \(_rvSheet\) \{ closeRvSheet\(\{ fromHistory: true \}\); return; \}/, 'Back');
  assert.match(app, /if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); closeRvSheet\(\); return; \}/, 'Escape');
  assert.match(review, /class="rv-sheet-done" data-action="rv-sheet-close">Done/, 'Done');
  assert.match(app, /if \(typeof detachRvSheets === 'function'\) detachRvSheets\(\);\s*renderCore\(\);/, 'render() detaches old sheets');
  assert.match(review, /mountRvSheets\(main\);/, 'Review reopens the sheet that was open');
  assert.match(app, /hideOn: \(\) => !!document\.querySelector\('[^']*\.rv-sheet\.open'\)/, 'the site menu hides under a sheet');
});

test('review fixes: sheets sit under modals and toasts, keys defer to a dialog above, Tab reaches summaries', () => {
  const css = readFileSync(join(root, 'src/styles/07-menu-parity.css'), 'utf8');
  const z = Number(css.match(/\.rv-sheet\{position:fixed;inset:0;z-index:(\d+);/)[1]);
  assert.ok(z > 150 && z < 200, `sheet z-index ${z} must sit above the menu button (150) and below modals (200) and toasts (999)`);
  assert.match(app, /const aboveSheet = \[\.\.\.document\.querySelectorAll\('\.modal-overlay, [^']*'\)\]\s*\.find\(n => \{ if \(n\.hidden \|\| !n\.getClientRects\(\)\.length\) return false;[^\n]*pointerEvents !== 'none'; \}\);/, 'only a showing dialog takes the keys');
  assert.match(app, /if \(rvSheet && !rvSheet\.hidden && aboveSheet\) \{[\s\S]{0,300}?if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); aboveSheet\.querySelector\([^)]*\)\?\.click\(\); \}\s*return;/, 'Escape closes that dialog and stops there');
  assert.match(app, /rvSheet\.querySelectorAll\('button,a\[href\],input,select,textarea,summary,/);
  assert.match(app, /if \(id === 'aio'\) setTimeout\(\(\) => \{ const chk = document\.getElementById\('rvChecksVal'\)/, 'Checks row refreshes only after the AIOStreams sheet, off the tap');
  assert.match(app, /function rvChecksSummary\(\) \{[\s\S]{0,120}?const hosts = hostCompatCheck\(\);[\s\S]{0,120}?calculateHealthScore\(_cachedBuildResult\)/, 'build before reading the cache');
  assert.match(nav, /attributes: true, attributeFilter: \['class', 'hidden'\]/, 'menu notices a sheet opening by class');
});

test('v3.38: Fine-Tune opens with sections up to its target, then attaches the rest', () => {
  assert.match(app, /const keep = Math\.max\(target, 0\) \+ 1;/);
  assert.match(app, /setTimeout\(\(\) => \{ if \(overlay\.isConnected\) flushFtSections\(\); \}, 0\);/, 'rest attached after the first paint');
  assert.match(app, /function ftJumpTo\(id, smooth = true\) \{\n  flushFtSections\(\);/, 'a jump attaches every section first');
  assert.match(app, /openAdvancedDrawer\(customizeBtn, sectionId \|\| undefined\)/, 'Quick install opens at its section');
});

test('v3.38: Share Link shows a QR code and the link, and says so when copying is refused', () => {
  assert.match(app, /function qrDataUrl\(u\)/);
  assert.match(app, /const qrSrc = u => qrDataUrl\(u\);/, 'the manifest modal uses the same QR helper');
  assert.match(review, /<div class="share-qr" id="shareQr" hidden><\/div>/);
  assert.match(app, /navigator\.clipboard\.writeText\(url\)\.then\(done, refused\)/);
  // The link carries SHARE_KEYS only: no keys or passwords.
  assert.match(app, /function shareConfigUrl\(\) \{\n  const pub = \{\};\n  SHARE_KEYS\.forEach\(k => \{ pub\[k\] = S\[k\]; \}\);/);
});
