/**
 * 2026-11 UI pass (2) — state consistency, step/progress sync, and copy that
 * matches actual behaviour. The previous pass (ui-example.html direction)
 * introduced shape-based step states and class-ified action buttons; this
 * suite guards:
 *   - selected/completed/active/pending/disabled/focus/error states exist
 *     and are theme-token driven,
 *   - visual step state, aria-current and the announced progress text stay
 *     in sync (same `step` source),
 *   - navigation guards (back-only jumps) and selection preservation,
 *   - Fine-Tune / Skip / export / import / share descriptions match what the
 *     code actually does (verified against the handlers, not the labels).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(root, 'src/js/app.js'), 'utf8');
const page = readFileSync(join(root, 'src/index.html'), 'utf8');
const css = f => readFileSync(join(root, 'src/styles', f), 'utf8');

// ── 3. visual step state / accessible current-step / progress text sync ──

test('active step bubble carries aria-current="step"', () => {
  assert.match(app, /const current = state === 'active' \? ' aria-current="step"'/);
  assert.match(app, /<div class="step-unit \$\{state\}"\$\{clickable\}\$\{current}>/);
});

test('progress text is a live region kept in sync from the same step source', () => {
  assert.match(page, /<div id="stepAnnounce" class="sr-only" role="status" aria-live="polite">/);
  // rendered inside renderProgress from `step` — the same variable the strip uses
  assert.match(app, /if \(ann\) ann\.textContent = `Step \$\{Math\.min\(step, STEPS\)\} of \$\{STEPS\}/);
  assert.ok(
    app.indexOf('stepAnnounce') > app.indexOf('function renderProgress'),
    'announcement must be written by renderProgress, next to the strip it mirrors'
  );
});

test('completed/active/pending step states are shape + token based', () => {
  const b = css('02-brand-theme.css');
  assert.match(b, /\.step-unit\.done \.step-bub\{width:14px;height:14px;background:var\(--th-green\);color:#fff\}/);
  assert.match(b, /\.step-unit\.active \.step-bub\{[^}]*border:2px solid var\(--th-accent\)/);
  assert.match(b, /\.step-bub\{[^}]*background:var\(--th-tx5\)/);
  assert.match(b, /\.step-unit\[data-action\]:focus-visible\{outline:2px solid var\(--th-accent\)/);
});

// ── 2. consistent state styles across the app ──

test('focus has one token-based floor for all interactive elements', () => {
  assert.match(css('01-core.css'),
    /button:focus-visible,\[role="button"\]:focus-visible,a:focus-visible,summary:focus-visible,\[tabindex\]:focus-visible\{outline:2px solid var\(--th-accent\);outline-offset:2px\}/);
});

test('disabled states: primary CTA explained + action buttons visibly disabled', () => {
  const c1 = css('01-core.css'), c2 = css('02-brand-theme.css'), c6 = css('06-features.css');
  assert.match(c1, /\.btn-next:disabled\{[^}]*cursor:not-allowed\}/);
  assert.match(c2, /\.btn-next:disabled\{[^}]*color:#8c959f/); // light theme
  // the disabled Next label explains the requirement, as a themed class
  assert.match(c2, /\.cta-disabled-lbl\{flex:1;font-size:.88rem;font-weight:600;color:var\(--th-tx4\)\}/);
  assert.match(c2, /\[data-theme="light"\] \.cta-disabled-lbl\{color:var\(--th-tx5\)\}/);
  assert.match(app, /Select one to continue/);
  // secondary action buttons get the same disabled treatment
  assert.match(c6, /\.btn-aio:disabled,[^}]*\.fine-tune-btn:disabled\{opacity:.55;cursor:wait/);
});

test('error/success/warning colours come from the token layer', () => {
  const b = css('02-brand-theme.css');
  for (const t of ['--th-green', '--th-yellow', '--th-red']) {
    assert.ok(b.includes(`var(${t})`) || css('01-core.css').includes(`--${t.slice(2)}:`), `${t} must be a token`);
  }
});

test('new controls meet 44px touch targets on coarse pointers', () => {
  assert.match(css('06-features.css'), /@media\(pointer:coarse\)\{\.skip-step-btn,\.rv-tool-btn,\.rv-secondary-btn\{min-height:44px/);
});

// ── 4. navigation: which steps are reachable, selections preserved ──

test('jump-step is back-only and never touches the selection state', () => {
  const m = app.match(/action === 'jump-step'\) \{[\s\S]*?\n    \}/);
  assert.ok(m, 'jump-step handler present');
  assert.match(m[0], /if \(n >= 1 && n < step\)/, 'only already-completed steps (n < step) are reachable');
  assert.doesNotMatch(m[0], /\bS\.\w+\s*=/, 'jumping must not mutate any selection');
});

test('browser back/forward restores the step without clearing selections', () => {
  assert.match(app, /window\.addEventListener\('popstate'[\s\S]{0,400}?step = \(e\.state && typeof e\.state\.step === 'number'\) \? e\.state\.step : 0;/);
  // popstate handler must saveState+render, not reinitialise S
  const m = app.match(/addEventListener\('popstate'[\s\S]*?\}\);/);
  assert.doesNotMatch(m[0], /replaceState\(\{\}/, 'history state must carry the step');
});

test('skip buttons apply the documented defaults (verified against handlers)', () => {
  const sd = app.match(/action === 'skip-device'\) \{[\s\S]*?\n    \}/)[0];
  const sc = app.match(/action === 'skip-content'\) \{[\s\S]*?\n    \}/)[0];
  assert.match(sd, /S\.device = 'generic'/, 'Skip on device really sets generic — the label may say "standard settings"');
  assert.match(sc, /S\.content = 'all'/, 'Skip on content really sets Everything — the label may name the default');
});

// ── 5. Fine-Tune copy matches what openAdvancedDrawer actually does ──

test('Fine-Tune sub-line does not claim defaults are applied or picks are kept ambiguously', () => {
  assert.match(app, /class="fine-tune-sub">Expert settings — stream cards, sound, video, subtitles\. Opens over your step; nothing is reset\.</);
  // the drawer must not mutate state on open
  const d = app.match(/function openAdvancedDrawer[\s\S]*?\n}/);
  assert.doesNotMatch(d[0], /S\.\w+\s*=/, 'opening the drawer must not set any selection');
});

// ── 6. export / import / share / privacy copy matches the implementation ──

test('export help line: local file, plain-text keys warning (matches generate() + exportCredNotice)', () => {
  assert.match(app, /class="action-help">Writes a JSON file in your browser\. If you added debrid keys, they're in the file in plain text — keep it private\.</);
  assert.doesNotMatch(app, /nothing is uploaded/, 'COUNTER_URL usage ping fires on every download — do not claim nothing is uploaded');
});

test('import help line: keys stripped, paste service, AIOStreams import link (matches uploadTemplateForImport)', () => {
  assert.match(app, /class="action-help">Uploads your template \(debrid keys stripped\) to a paste service, then gives you an import link to open in AIOStreams\.</);
  assert.doesNotMatch(app, /no credentials needed/, 'keys must be re-entered in AIOStreams Services after import');
  assert.match(app, /sanitizeTemplateForRemoteImport\(rawTemplate\)/, 'the uploaded template really is sanitized before upload');
});

test('share link is whitelist-only and the app says so', () => {
  assert.match(app, /SHARE_KEYS\.forEach\(k => \{ pub\[k\] = S\[k\]; \}\)/);
  assert.match(app, /settings only, no API keys or passwords included/);
});

test('feedback report redacts credentials before copy', () => {
  const policy = readFileSync(join(root, 'src/core/feedback-report-policy.js'), 'utf8');
  assert.match(policy, /CREDENTIAL_PATTERN/);
  assert.match(policy, /\[redacted\]/);
});

// ── 9. preserved hooks: version badge re-classified but pinned tail intact ──

test('version badge keeps its pinned markup tail while moving to a class', () => {
  assert.match(page, /class="hdr-ver-badge" title="View changelog">v__CB_VERSION__<\/span>/);
  assert.match(css('02-brand-theme.css'), /\.hdr-ver-badge\{position:absolute;top:9px;right:12px/);
  assert.match(css('02-brand-theme.css'), /\[data-theme="light"\] \.hdr-ver-badge\{/);
});

test('step-card buttons have no inline hover handlers left (class-based states)', () => {
  assert.match(app, /<button type="button" data-action="skip-device" class="skip-step-btn">/);
  assert.match(app, /<button type="button" data-action="open-advanced" class="fine-tune-btn">/);
  const from = app.indexOf('data-action="skip-device"');
  const to = app.indexOf('data-action="open-advanced" class="fine-tune-btn"');
  assert.ok(from > -1 && to > from, 'skip and fine-tune buttons exist in the step card template');
  assert.doesNotMatch(app.slice(from, to + 400), /onmouseover=|onmouseout=/, 'no inline hover handlers between the skip and Fine-Tune buttons');
});
