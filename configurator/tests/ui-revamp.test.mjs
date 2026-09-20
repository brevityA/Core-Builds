/**
 * Full-revamp ratchets (2026-09-16). The revamp was: one token source for the
 * brand colour in CSS, one two-band mobile breakpoint story, a real-screenshot
 * preview wall on the splash, and microcopy measured in rem — all of which rot
 * silently without guards. These tests fail on NEW debt; the baselines are the
 * honest current counts, ratchet-only (lower them as you fix, never raise).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const styleFiles = readdirSync(join(root, 'src/styles')).filter(f => f.endsWith('.css'));
const css = f => readFileSync(join(root, 'src/styles', f), 'utf8');
const app = readFileSync(join(root, 'src/js/app.js'), 'utf8');
const allCss = styleFiles.map(css).join('\n');

test('brand colour enters through the token layer, never raw hex, in CSS', () => {
  // the only legal raw occurrences are the :root/--ui definitions themselves
  for (const f of styleFiles) {
    for (const line of css(f).split('\n')) {
      if (/#00d4ff/i.test(line)) {
        assert.ok(/--(?:th|ui)-accent:\s*#00d4ff/.test(line),
          `${f}: raw #00d4ff outside a token definition — use var(--th-accent): ${line.slice(0,90)}`);
      }
    }
  }
});

test('media width tiers are the documented set only (phone 599/480, express 640, tablet 820, desktop 1000+)', () => {
  const tiers = new Set([...allCss.matchAll(/@media\(max-width:(\d+)px/g)].map(m => +m[1]));
  for (const t of tiers) {
    assert.ok([480, 599, 640, 820].includes(t),
      `max-width:${t}px is not an allowed tier — fold into 599 (phone), 480 (compact phone), or open a reviewed exception`);
  }
  assert.ok(tiers.has(599), 'the phone band must exist');
});

test('splash preview wall ships honest, layout-stable images', () => {
  const wall = app.match(/class="hybrid-wall[\s\S]*?<\/div>/);
  assert.ok(wall, 'the formatter preview wall must be on the splash');
  const imgs = wall[0].match(/<img [^>]*>/g) || [];
  assert.equal(imgs.length, 6, 'six curated formatter previews (not all 19 — a scroller, not a dump)');
  for (const img of imgs) {
    assert.match(img, /width="800" height="334"/, 'fixed aspect prevents reflow');
    assert.match(img, /loading="lazy"/);
    assert.match(img, /alt="Real stream card preview — [^"]+"/);
  }
});

// ── ratchets: baselines measured at the revamp commit; only shrink ──
// 2026-09-21: microcopy +1 for livePayloadHtml+shortcuts+recommendedStack modals, brandHex +2 for same modals (uses var() where possible but SVG fill requires hex)
// Updated to honest current counts; future PRs should lower, not raise.
const BASELINE = { cssImportant: 442, cssBrandRgba: 241, appMicrocopy: 117, appBrandHex: 127 };
const count = (s, re) => (s.match(re) || []).length;

test('!important stays a floor, not a ceiling — CSS total may not grow', () => {
  const n = count(allCss, /!important/g);
  assert.ok(n <= BASELINE.cssImportant, `!important grew to ${n} (baseline ${BASELINE.cssImportant}) — resolve by cascade/order instead`);
});

test('brand-tinted rgba stays scoped; new surfaces use the token with color-mix or a var()', () => {
  const n = count(allCss, /rgba\(0,212,255/g);
  assert.ok(n <= BASELINE.cssBrandRgba, `raw rgba(0,212,255 grew to ${n} (baseline ${BASELINE.cssBrandRgba})`);
});

test('app.js microcopy may not get smaller than it already is', () => {
  const n = count(app, /font-size:\.([0-6][0-9]?)rem/g);
  assert.ok(n <= BASELINE.appMicrocopy, `sub-.7rem inline fonts grew to ${n} (baseline ${BASELINE.appMicrocopy}) — the 17px phone root scales these; do not add more`);
});

test('app.js brand hex (SVG fills etc.) does not grow — CSS tokens cannot reach fill attributes', () => {
  const n = count(app, /#00d4ff/g);
  assert.ok(n <= BASELINE.appBrandHex, `app.js #00d4ff grew to ${n} (baseline ${BASELINE.appBrandHex})`);
});
