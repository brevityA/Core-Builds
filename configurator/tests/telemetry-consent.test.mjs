/**
 * Source invariants for opt-in usage telemetry consent.
 *
 * These tests are structural source invariants (targeted brace/paren extraction
 * on `src/js/app.js`), NOT behavioural proof. Behavioural proof lives in
 * `e2e/telemetry-consent.spec.mjs`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appRaw = readFileSync(join(root, 'src/js/app.js'), 'utf8');

const APPROVED_WORDING =
  'Share basic usage statistics with the project: page visits and downloads, '
  + 'including service, device and resolution. No API keys, account names, or '
  + 'full configuration are sent.';

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function functionBody(src, name) {
  const sig = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`);
  const match = sig.exec(src);
  assert.ok(match, `expected function ${name}() in src/js/app.js`);
  let idx = match.index + match[0].length;
  let depth = 1;
  while (idx < src.length && depth > 0) {
    const ch = src[idx++];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  assert.equal(depth, 0, `unbalanced braces in ${name}()`);
  return src.slice(match.index + match[0].length, idx - 1);
}

function guardCondition(src, targetSubstring) {
  const pos = src.indexOf(targetSubstring);
  assert.ok(pos !== -1, `expected ${targetSubstring} in source`);
  const before = src.slice(0, pos);
  const ifMatches = [...before.matchAll(/\bif\s*\(/g)];
  assert.ok(ifMatches.length > 0, `expected enclosing if (...) before ${targetSubstring}`);
  const lastIf = ifMatches[ifMatches.length - 1];
  let idx = lastIf.index + lastIf[0].length;
  let depth = 1;
  while (idx < src.length && depth > 0) {
    const ch = src[idx++];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
  }
  assert.equal(depth, 0, `unbalanced parens in if (...) guarding ${targetSubstring}`);
  return src.slice(lastIf.index + lastIf[0].length, idx - 1).trim();
}

function detailsBlock(html, marker) {
  const pos = html.indexOf(marker);
  assert.ok(pos !== -1, `expected ${marker} in markup`);
  const openIdx = html.lastIndexOf('<details', pos);
  assert.ok(openIdx !== -1, `expected opening <details> before ${marker}`);
  let idx = openIdx + '<details'.length;
  let depth = 1;
  while (idx < html.length && depth > 0) {
    const nextOpen = html.indexOf('<details', idx);
    const nextClose = html.indexOf('</details>', idx);
    assert.ok(nextClose !== -1, `expected closing </details> for ${marker}`);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      idx = nextOpen + '<details'.length;
    } else {
      depth--;
      idx = nextClose + '</details>'.length;
    }
  }
  return html.slice(openIdx, idx);
}

const appClean = stripComments(appRaw);

test('1. outbound usage surface is limited to /api/visit, /api/generate, USAGE_BEACON_URL, and Web Vitals', () => {
  const beaconCalls = [...appClean.matchAll(/(?<!function\s+)\bbeaconPost\s*\(([^)]+)\)/g)].map(m => m[1].trim());
  assert.equal(beaconCalls.length, 5, `expected exactly 5 beaconPost call sites (visit, generate, collector, plus primary+fallback in initWebVitals), got ${beaconCalls.length}: ${beaconCalls.join(' | ')}`);
  assert.ok(beaconCalls.some(c => c.includes('/api/visit')), 'missing /api/visit beaconPost');
  assert.ok(beaconCalls.some(c => c.includes('/api/generate')), 'missing /api/generate beaconPost');
  assert.ok(beaconCalls.some(c => c.startsWith('USAGE_BEACON_URL')), 'missing USAGE_BEACON_URL beaconPost');
  assert.equal(beaconCalls.filter(c => c.startsWith('url,')).length, 2, 'expected 2 Web-Vitals url beaconPost calls (primary + fallback)');
  assert.equal(appClean.match(/\/api\/visit/g)?.length || 0, 1);
  assert.equal(appClean.match(/\/api\/generate/g)?.length || 0, 1);
});

test('2. /api/visit is strictly gated on S.telemetryOk', () => {
  const cond = guardCondition(appClean, "beaconPost(COUNTER_URL + '/api/visit')");
  assert.equal(cond, 'S.telemetryOk', `expected /api/visit guarded by S.telemetryOk, got "${cond}"`);
});

test('3. /api/generate and configured USAGE_BEACON_URL collector calls are gated on S.telemetryOk', () => {
  const genCond = guardCondition(appClean, "beaconPost(COUNTER_URL + '/api/generate'");
  assert.match(genCond, /\bCOUNTER_URL\b/, 'expected COUNTER_URL in /api/generate guard');
  assert.match(genCond, /\bS\.telemetryOk\b/, 'expected S.telemetryOk in /api/generate guard');

  const beaconCond = guardCondition(appClean, 'beaconPost(USAGE_BEACON_URL');
  assert.match(beaconCond, /\bUSAGE_BEACON_URL\b/, 'expected USAGE_BEACON_URL in direct collector guard');
  assert.match(beaconCond, /\bS\.telemetryOk\b/, 'expected S.telemetryOk in direct collector guard');
});

test('4. initWebVitals gates both USAGE_BEACON_URL and COUNTER_URL fallback at the top of send()', () => {
  const body = functionBody(appClean, 'initWebVitals');
  const sendMatch = body.match(/const\s+send\s*=\s*\(name,\s*value\)\s*=>\s*\{([\s\S]*?)const\s+url\s*=\s*USAGE_BEACON_URL\s*\|\|\s*COUNTER_URL\s*;/);
  assert.ok(sendMatch, 'expected send() with USAGE_BEACON_URL || COUNTER_URL inside initWebVitals');
  assert.match(
    sendMatch[1],
    /if\s*\(\s*!S\.telemetryOk\s*\)\s*return\s*;/,
    'send() must return early when !S.telemetryOk before selecting USAGE_BEACON_URL || COUNTER_URL',
  );
});

test('5. /api/stats (splash read) stays outside the consent gate', () => {
  const cond = guardCondition(appClean, "fetch(COUNTER_URL + '/api/stats')");
  assert.equal(cond, 'COUNTER_URL', `/api/stats must remain gated only on COUNTER_URL, got "${cond}"`);
});

test('6. telemetryOk defaults false, stays excluded from SHARE_KEYS/sanitizeSharedConfig, and restores only from localStorage', () => {
  const stateDecl = appClean.match(/const\s+S\s*=\s*\{[^;]+telemetryOk:\s*(true|false)/);
  assert.ok(stateDecl, 'expected S.telemetryOk declaration');
  assert.equal(stateDecl[1], 'false', 'S.telemetryOk must default to false');

  const shareKeysDecl = appClean.match(/const\s+SHARE_KEYS\s*=\s*\[([^\]]+)\]/);
  assert.ok(shareKeysDecl, 'expected SHARE_KEYS array');
  assert.equal(shareKeysDecl[1].includes('telemetryOk'), false, 'SHARE_KEYS must exclude telemetryOk');

  const sanitizeBody = functionBody(appClean, 'sanitizeSharedConfig');
  assert.equal(sanitizeBody.includes('telemetryOk'), false, 'sanitizeSharedConfig must exclude telemetryOk');

  const loadBody = functionBody(appClean, 'loadState');
  const shareMarker = "if (hash.startsWith('#cfg='))";
  const localMarker = "const savedS = localStorage.getItem('coreBuild')";
  const shareIdx = loadBody.indexOf(shareMarker);
  const localIdx = loadBody.indexOf(localMarker);
  assert.ok(shareIdx !== -1 && localIdx !== -1 && shareIdx < localIdx);

  const shareBranch = loadBody.slice(shareIdx, localIdx);
  const localBranch = loadBody.slice(localIdx);
  assert.equal(shareBranch.includes('telemetryOk'), false, 'share-link branch must never restore telemetryOk');
  assert.match(
    localBranch,
    /if\s*\(\s*typeof\s+parsed\.telemetryOk\s*===\s*['"]boolean['"]\s*\)\s*S\.telemetryOk\s*=\s*parsed\.telemetryOk\s*;/,
    'localStorage branch must restore boolean parsed.telemetryOk',
  );
});

test('7. DOMContentLoaded calls loadState() before the initial /api/visit beacon check', () => {
  const domMatch = appClean.match(/document\.addEventListener\(\s*['"]DOMContentLoaded['"]/);
  assert.ok(domMatch, 'expected DOMContentLoaded listener');
  const afterDom = appClean.slice(domMatch.index);
  const loadPos = afterDom.indexOf('loadState();');
  const visitPos = afterDom.indexOf("beaconPost(COUNTER_URL + '/api/visit')");
  assert.ok(loadPos !== -1 && visitPos !== -1 && loadPos < visitPos, 'loadState() must precede /api/visit');
});

test('8. telemetryHtml() always renders approved wording and wires toggle-telemetry to S.telemetryOk + saveState()', () => {
  const htmlBody = functionBody(appClean, 'telemetryHtml');
  assert.equal(htmlBody.includes('USAGE_BEACON_URL'), false, 'telemetryHtml() must not hide behind USAGE_BEACON_URL');
  assert.ok(htmlBody.includes(APPROVED_WORDING), 'telemetryHtml() must contain exact approved wording');
  assert.match(htmlBody, /type="checkbox"/);
  assert.match(htmlBody, /data-action="toggle-telemetry"/);
  assert.match(htmlBody, /\$\{S\.telemetryOk\s*\?\s*'checked'\s*:\s*''\}/);

  const handlerMatch = appClean.match(/if\s*\(\s*e\.target\.dataset\.action\s*===\s*['"]toggle-telemetry['"]\s*\)\s*\{([^}]+)\}/);
  assert.ok(handlerMatch, 'expected toggle-telemetry event handler');
  assert.match(handlerMatch[1], /S\.telemetryOk\s*=\s*e\.target\.checked\s*;/);
  assert.match(handlerMatch[1], /saveState\(\)\s*;/);
});

test('9. the full-Review consent control is always rendered with the approved wording, visible above Export', () => {
  const allCalls = appClean.match(/\$\{telemetryHtml\(\)\}/g) || [];
  assert.equal(allCalls.length, 2, `expected exactly two \${telemetryHtml()} render sites (full Review + Quick Start), found ${allCalls.length}`);

  const renderBody = functionBody(appClean, 'renderCore');
  const exportBtnMarker = '<button class="btn-dl" data-action="generate-dl">';
  const customizeMarker = '<span class="rv-ico">';
  const telemetryPos = renderBody.indexOf('${telemetryHtml()}');
  const exportBtnPos = renderBody.indexOf(exportBtnMarker);
  assert.ok(telemetryPos !== -1 && exportBtnPos !== -1, 'expected telemetryHtml() and Export button in renderCore()');
  assert.ok(telemetryPos < exportBtnPos, 'telemetryHtml() in full Review must appear immediately before Export button');
  assert.equal(
    renderBody.slice(telemetryPos, exportBtnPos).includes('<details'),
    false,
    'full-Review telemetryHtml() must sit outside any <details>',
  );

  // Confirm Customize collapsed section has zero telemetryHtml() calls inside it
  const customizeDetails = detailsBlock(renderBody, 'Customize</span>');
  assert.equal(
    customizeDetails.includes('telemetryHtml()'),
    false,
    'Customize <details> must not contain telemetryHtml()',
  );
  assert.ok(customizeMarker.length > 0);
});

test('10. Quick Start renders the SAME shared consent control visibly before its install/export actions', () => {
  // Single control definition, single handler, single default-off
  assert.equal((appClean.match(/function\s+telemetryHtml\s*\(/g) || []).length, 1);
  assert.equal((appClean.match(/data-action="toggle-telemetry"/g) || []).length, 1);
  assert.equal((appClean.match(/telemetryOk:\s*(?:true|false)/g) || []).length, 1);

  const simpleBody = functionBody(appClean, 'simpleFinishHtml');
  const telemetryCalls = simpleBody.match(/\$\{telemetryHtml\(\)\}/g) || [];
  assert.equal(telemetryCalls.length, 1, 'Quick Start must render the single shared ${telemetryHtml()} call');
  assert.equal(simpleBody.includes('toggle-telemetry'), false, 'Quick Start must not duplicate consent markup');

  const nameRowPos = simpleBody.indexOf('data-action="update-name"');
  const telemetryPos = simpleBody.indexOf('${telemetryHtml()}');
  const freeActionPos = simpleBody.indexOf('${isFree ?');
  const btnAioPos = simpleBody.indexOf('id="btnAio"');
  const exportBtnPos = simpleBody.indexOf('data-action="generate-dl"');
  assert.ok(nameRowPos !== -1 && telemetryPos !== -1 && freeActionPos !== -1 && btnAioPos !== -1 && exportBtnPos !== -1);
  assert.ok(nameRowPos < telemetryPos, 'Quick Start consent control must follow the template-name row');
  assert.ok(telemetryPos < freeActionPos, 'Quick Start consent control must sit immediately before install/export action area');
  assert.ok(telemetryPos < btnAioPos && telemetryPos < exportBtnPos, 'Quick Start consent control must precede install and export buttons');

  // Ensure it is outside Fine-tune <details> and not wrapped in any <details>
  const fineTuneDetails = detailsBlock(simpleBody, 'Fine-tune</span>');
  assert.equal(fineTuneDetails.includes('telemetryHtml()'), false, 'Quick Start consent control must not sit inside Fine-tune <details>');
  const betweenNameAndAction = simpleBody.slice(nameRowPos, freeActionPos);
  assert.equal(betweenNameAndAction.includes('<details'), false, 'Quick Start consent control must not be inside a collapsed <details>');
});
