/**
 * Core Banner Studio — logic contract.
 *
 * Every assertion maps to a numbered finding in `../RESEARCH.md`. The point of
 * extracting `core.mjs` (BS-P1-07) was to make these reachable from `node --test`
 * without a browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BANNER_STUDIO_VERSION, BRANDS, DEF, PRESETS, EXPORT_SETS, READY,
  CONTRAST_MIN, CLAMP_REPORT_EPSILON, ASSET_PERSIST_LIMIT, ASSET_SHARE_LIMIT, SPEC_V,
  contrast, contrastVerdict, relLum, hexRgb, rgbHex, mix, clamp, fnv, fitCrop,
  layout, maxLogoWidth, clampIsReportable, reduceScale,
  sanitize, makeSpec, encSpec, decSpec, ringAdd, assetPersistence,
  planExport, planCardExports, svgAvailability,
} from '../core.mjs';

/* ── BS-P0-01 / BS-P0-03 · defaults and brands pass their own checks ────── */

test('BS-P0-03 · every brand accent clears the contrast floor on its own background', () => {
  const failures = [];
  for (const [id, b] of Object.entries(BRANDS)) {
    const ratio = contrast(b.accent, b.bg);
    if (ratio < CONTRAST_MIN) failures.push(`${id} ${b.accent} on ${b.bg} = ${ratio.toFixed(2)}:1`);
  }
  assert.deepEqual(failures, [], 'a brand that can never pass its own check is a broken preset');
});

test('BS-P0-03 · Disney+ specifically is fixed — it was 1.98:1 and unfixable', () => {
  // The old pairing: #113CCF on the single shared #1e2126.
  assert.ok(contrast('#113CCF', '#1e2126') < CONTRAST_MIN, 'guard: the old pairing really did fail');
  assert.ok(contrast(BRANDS.disney.accent, BRANDS.disney.bg) >= CONTRAST_MIN);
});

test('BS-P0-01 · the shipped default state passes the flat-colour contrast check', () => {
  const b = BRANDS[sanitize({}).brand];
  assert.ok(contrast(b.accent, DEF.bgHex) >= CONTRAST_MIN);
});

test('BS-P0-01 · the default vignette was reduced from the value that darkened the logo zone', () => {
  assert.ok(DEF.vignette <= 0.6, `vignette ${DEF.vignette} is back in the range that triggered BS-P0-01`);
});

test('every brand declares a background, and it is a valid hex', () => {
  for (const [id, b] of Object.entries(BRANDS)) {
    assert.match(b.bg, /^#[0-9a-fA-F]{6}$/, `${id} has no usable background`);
  }
});

/* ── BS-P0-02 · the clear-space clamp only reports perceptible clamping ─── */

const NF_RATIO = 276.742 / 1024;

test('BS-P0-02 · the 1px cosmetic clamp at the default no longer reports', () => {
  const requested = DEF.logoW * 1800;
  const actual = maxLogoWidth(1800, 1200, DEF, 6, NF_RATIO);
  const delta = requested - actual;
  assert.ok(delta > 0 && delta < 2, `guard: the default really is clamped, by ${delta.toFixed(2)}px`);
  assert.equal(clampIsReportable(requested, actual, 1800), false, 'a 1px trim on a 1800px canvas is not worth a warning');
});

test('BS-P0-02 · a genuinely large clamp still reports', () => {
  const requested = DEF.logoW * 1800;
  const actual = maxLogoWidth(1800, 1200, DEF, 8, NF_RATIO);
  assert.ok(requested - actual > 50, 'guard: eight cards really do force a big trim');
  assert.equal(clampIsReportable(requested, actual, 1800), true);
});

test('BS-P0-02 · the report threshold scales with canvas width, not absolute pixels', () => {
  // The same proportional trim must behave identically at any canvas size.
  for (const W of [1080, 1800, 3840]) {
    assert.equal(clampIsReportable(0.5 * W, 0.5 * W - 0.001 * W, W), false);
    assert.equal(clampIsReportable(0.5 * W, 0.5 * W - 0.01 * W, W), true);
  }
  assert.ok(CLAMP_REPORT_EPSILON > 0 && CLAMP_REPORT_EPSILON < 0.01);
});

test('the clamp never returns a width below the hard floor', () => {
  for (const n of [0, 1, 4, 8, 20]) {
    assert.ok(maxLogoWidth(1800, 1200, DEF, n, NF_RATIO) >= 0.12 * 1800 - 1e-9);
  }
});

/* ── contrast verdicts give an actionable remedy ─────────────────────────── */

test('a passing ratio reports pass and offers no remedy', () => {
  const v = contrastVerdict(contrast('#FFFFFF', '#0b0c0e'), { accent: '#FFFFFF', bg: '#0b0c0e' });
  assert.equal(v.pass, true);
  assert.equal(v.remedy, null);
});

test('a failing ratio names the remedy that actually recovers the most contrast', () => {
  const v = contrastVerdict(1.98, { accent: '#113CCF', bg: '#1e2126' });
  assert.equal(v.pass, false);
  assert.ok(v.advice.includes('2.25:1'));
  assert.equal(v.remedy.kind, 'accent');
  assert.equal(v.remedy.value, '#FFFFFF');
  // Applying the suggested remedy must actually pass.
  assert.ok(contrast(v.remedy.value, '#1e2126') >= CONTRAST_MIN);
});

test('on a light background the remedy is a black mark, not a reflexive white one', () => {
  const v = contrastVerdict(1.4, { accent: '#cccccc', bg: '#f2f4f7' });
  assert.equal(v.remedy.value, '#000000');
  assert.ok(contrast(v.remedy.value, '#f2f4f7') >= CONTRAST_MIN);
});

test('the suggested remedy always actually passes — swept over the whole RGB cube', () => {
  // Not a spot check. If any background existed where the offered remedy still
  // failed, the tool would be handing the user a dead-end button.
  let worstBackground = null;
  let worstRatio = Infinity;
  for (let r = 0; r < 256; r += 5) {
    for (let g = 0; g < 256; g += 5) {
      for (let b = 0; b < 256; b += 5) {
        const bg = rgbHex(r, g, b);
        const v = contrastVerdict(1.0, { accent: '#808080', bg });
        assert.equal(v.remedy.kind, 'accent');
        const achieved = contrast(v.remedy.value, bg);
        if (achieved < worstRatio) { worstRatio = achieved; worstBackground = bg; }
      }
    }
  }
  assert.ok(
    worstRatio >= CONTRAST_MIN,
    `remedy failed on ${worstBackground} at ${worstRatio.toFixed(2)}:1`,
  );
  // The analytic global minimum of max(white, black) is sqrt(1.05/0.05) ~= 4.583,
  // attained around L = sqrt(1.05*0.05) - 0.05. Pin it so nobody "optimises"
  // the remedy into something that can dip below the floor.
  assert.ok(Math.abs(worstRatio - 4.583) < 0.02, `worst case drifted to ${worstRatio.toFixed(3)}`);
});

test('there is no unreachable background remedy branch left in the verdict', () => {
  // Because max(white, black) >= 4.58 always, a `background` remedy could never
  // fire. It used to exist and was mislabelled; it must stay gone.
  for (const bg of ['#767676', '#5d60ff', '#ffffff', '#000000', '#808080']) {
    assert.equal(contrastVerdict(1.2, { accent: '#888888', bg }).remedy.kind, 'accent');
  }
});

/* ── colour maths ────────────────────────────────────────────────────────── */

test('contrast is symmetric and bounded by the WCAG range', () => {
  assert.equal(contrast('#FFFFFF', '#000000').toFixed(2), '21.00');
  assert.equal(contrast('#000000', '#FFFFFF').toFixed(2), '21.00');
  assert.equal(contrast('#123456', '#123456').toFixed(2), '1.00');
});

test('hex parsing handles shorthand and round-trips', () => {
  assert.deepEqual(hexRgb('#fff'), [255, 255, 255]);
  assert.deepEqual(hexRgb('#0d1017'), [13, 16, 23]);
  assert.equal(rgbHex(13, 16, 23), '#0d1017');
});

test('mix interpolates endpoints exactly', () => {
  assert.equal(mix('#000000', '#ffffff', 0), '#000000');
  assert.equal(mix('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
});

test('relLum orders black < mid < white', () => {
  assert.ok(relLum('#000000') < relLum('#808080'));
  assert.ok(relLum('#808080') < relLum('#ffffff'));
});

test('clamp falls back on non-finite input rather than producing NaN', () => {
  assert.equal(clamp('abc', 0, 1, 0.5), 0.5);
  assert.equal(clamp(undefined, 0, 1, 0.5), 0.5);
  assert.equal(clamp(5, 0, 1, 0.5), 1);
  assert.equal(clamp(-5, 0, 1, 0.5), 0);
});

test('fnv is deterministic and unsigned', () => {
  assert.equal(fnv('Stranger Things'), fnv('Stranger Things'));
  assert.notEqual(fnv('a'), fnv('b'));
  assert.ok(fnv('anything') >= 0);
});

test('fitCrop centres a cover-crop for both orientations', () => {
  const wide = fitCrop(2000, 1000, 1, 1);
  assert.equal(wide.sw, 1000);
  assert.equal(wide.sx, 500);
  assert.equal(wide.sy, 0);
  const tall = fitCrop(1000, 2000, 1, 1);
  assert.equal(tall.sh, 1000);
  assert.equal(tall.sy, 500);
});

/* ── BS-P1-04 · export planning matches the preview ──────────────────────── */

test('BS-P1-04 · a single export plans exactly the chosen preset at its exact size', () => {
  const [plan, ...rest] = planExport({ preset: 'ref', scale: 1, brand: 'netflix' });
  assert.equal(rest.length, 0);
  assert.equal(plan.width, PRESETS.ref[0]);
  assert.equal(plan.height, PRESETS.ref[1]);
  assert.equal(plan.capped, false);
  assert.match(plan.filename, /1800x1200\.png$/);
});

test('BS-P1-04 · export dimensions equal preset dimensions times scale', () => {
  for (const key of Object.keys(PRESETS)) {
    const [w, h] = PRESETS[key];
    for (const scale of [1, 2, 3]) {
      const [plan] = planExport({ preset: key, scale });
      assert.equal(plan.width, w * plan.scale, `${key}@${scale} width`);
      assert.equal(plan.height, h * plan.scale, `${key}@${scale} height`);
      // The aspect ratio the user previewed must survive the export exactly.
      assert.equal(plan.width / plan.height, w / h, `${key}@${scale} aspect drifted`);
    }
  }
});

test('BS-P1-04 · a size set plans every preset in the set, once each', () => {
  const plan = planExport({ setKey: 'social', scale: 1 });
  assert.deepEqual(plan.map(p => p.preset), EXPORT_SETS.social.presets);
  assert.equal(new Set(plan.map(p => p.filename)).size, plan.length, 'filenames must not collide');
});

test('BS-P1-04 · the "all" set covers every declared preset', () => {
  assert.deepEqual([...EXPORT_SETS.all.presets].sort(), Object.keys(PRESETS).sort());
});

test('every export set references only real presets', () => {
  for (const [name, set] of Object.entries(EXPORT_SETS)) {
    for (const key of set.presets) assert.ok(PRESETS[key], `set ${name} references unknown preset ${key}`);
  }
});

test('oversized exports are capped for canvas safety and say so', () => {
  const [plan] = planExport({ preset: 'tv', scale: 3 });
  assert.equal(plan.capped, true, '3840x2160 @3x exceeds the 16.7Mpx canvas ceiling');
  assert.ok(plan.width <= 8192 && plan.height <= 8192);
  assert.ok(plan.width * plan.height <= 1.6e7);
  assert.equal(plan.requestedScale, 3);
  assert.ok(plan.scale < 3);
});

test('reduceScale never returns a scale below 1', () => {
  const r = reduceScale(9000, 9000, 3);
  assert.equal(r.scale, 1);
  assert.equal(r.reduced, true);
});

test('filenames are filesystem-safe and carry the real dimensions', () => {
  for (const p of planExport({ setKey: 'all', scale: 2, brand: 'netflix' })) {
    assert.match(p.filename, /^[a-z0-9_.-]+$/i, `${p.filename} has unsafe characters`);
    assert.ok(p.filename.includes(`${p.width}x${p.height}`), `${p.filename} must state its true size`);
  }
});

/* ── BS-P1-05 · SVG availability is honest ───────────────────────────────── */

test('BS-P1-05 · SVG is available for vector and text wordmarks', () => {
  assert.equal(svgAvailability({ brand: 'netflix' }).available, true);
  assert.equal(svgAvailability({ brand: 'hulu', logoText: 'hulu' }).available, true);
});

test('BS-P1-05 · SVG is refused, with a reason, when a bitmap is involved', () => {
  const logo = svgAvailability({ _logoUrl: 'data:image/png;base64,AAA' });
  assert.equal(logo.available, false);
  assert.match(logo.reason, /bitmap logo/);

  const bg = svgAvailability({ _bgUrl: 'data:image/png;base64,AAA' });
  assert.equal(bg.available, false);
  assert.match(bg.reason, /background image/);
});

/* ── per-card export ─────────────────────────────────────────────────────── */

test('per-card export plans one 2:3 file per card with unique names', () => {
  const st = { brand: 'netflix', cards: [{ n: 'Stranger Things' }, { n: 'Wednesday' }, { n: 'Squid Game' }] };
  const plans = planCardExports(st, { height: 900 });
  assert.equal(plans.length, 3);
  for (const p of plans) {
    assert.equal(p.height, 900);
    assert.equal(p.width, 600, 'cards are 2:3, matching the poster aspect used in the cascade');
    assert.match(p.filename, /^[a-z0-9_.-]+\.png$/i);
  }
  assert.equal(new Set(plans.map(p => p.filename)).size, 3);
});

test('per-card export survives titles that are pure punctuation', () => {
  const plans = planCardExports({ brand: 'max', cards: [{ n: '!!!' }, { n: '???' }] });
  assert.equal(plans.length, 2);
  for (const p of plans) assert.match(p.filename, /^[a-z0-9_.-]+\.png$/i);
});

test('no cards means no per-card files', () => {
  assert.deepEqual(planCardExports({ brand: 'netflix', cards: [] }), []);
});

/* ── BS-P1-06 · persistence honesty ──────────────────────────────────────── */

test('BS-P1-06 · a small asset persists and shares silently', () => {
  const a = assetPersistence('data:image/png;base64,' + 'A'.repeat(1000));
  assert.equal(a.persists, true);
  assert.equal(a.shares, true);
  assert.equal(a.reason, '');
});

test('BS-P1-06 · a mid-size asset persists but warns that it cannot be shared', () => {
  const a = assetPersistence('d'.repeat(ASSET_SHARE_LIMIT + 10));
  assert.equal(a.persists, true);
  assert.equal(a.shares, false);
  assert.match(a.reason, /share link/);
});

test('BS-P1-06 · an oversized asset says it will be LOST, rather than vanishing silently', () => {
  const a = assetPersistence('d'.repeat(ASSET_PERSIST_LIMIT + 10));
  assert.equal(a.persists, false);
  assert.match(a.reason, /lost on reload/);
  assert.match(a.reason, /KB/, 'the message must quantify the overage');
});

test('BS-P1-06 · the share cap is below the persist cap, and both are used consistently', () => {
  assert.ok(ASSET_SHARE_LIMIT < ASSET_PERSIST_LIMIT);
  const st = { brand: 'netflix', cards: [], _logoUrl: 'data:' + 'x'.repeat(ASSET_SHARE_LIMIT + 100) };
  // Too big to share => must not be silently embedded in the spec.
  assert.equal(makeSpec(st).customLogo, undefined);
});

/* ── state sanitisation and round-tripping ───────────────────────────────── */

test('sanitize repairs hostile input without throwing', () => {
  for (const bad of [null, undefined, 42, 'string', [], { brand: '__proto__' }]) {
    const st = sanitize(bad);
    assert.ok(BRANDS[st.brand], `brand fell through for ${JSON.stringify(bad)}`);
    assert.ok(PRESETS[st.preset]);
    assert.ok(Array.isArray(st.cards));
  }
});

test('sanitize clamps every numeric into its declared range', () => {
  const st = sanitize({ cardSize: 99, rot: -999, spreadY: -1, glow: 5, vignette: 12, maxCards: 500, logoW: 9 });
  assert.ok(st.cardSize <= 0.34);
  assert.ok(st.rot >= -24 && st.rot <= 24);
  assert.ok(st.spreadY >= 0.1 && st.spreadY <= 0.3);
  assert.ok(st.glow <= 0.16);
  assert.ok(st.vignette <= 1);
  assert.ok(st.maxCards <= 8);
  assert.ok(st.logoW <= 0.55);
});

test('sanitize defaults the background to the brand background, not one shared colour', () => {
  assert.equal(sanitize({ brand: 'hulu' }).bgHex, BRANDS.hulu.bg);
  assert.equal(sanitize({ brand: 'disney' }).bgHex, BRANDS.disney.bg);
  // An explicit user choice still wins.
  assert.equal(sanitize({ brand: 'hulu', bgHex: '#123456' }).bgHex, '#123456');
});

test('sanitize rejects non-http/data card URLs (no javascript: smuggling)', () => {
  const st = sanitize({ cards: [{ n: 'x', url: 'javascript:alert(1)', o: 'javascript:alert(1)', m: 'ftp://x' }] });
  assert.equal(st.cards[0].url, '');
  assert.equal(st.cards[0].o, '');
  assert.equal(st.cards[0].m, '');
});

test('sanitize caps card count and truncates long titles', () => {
  const cards = Array.from({ length: 50 }, (_, i) => ({ n: 'x'.repeat(200) + i }));
  const st = sanitize({ cards, maxCards: 8 });
  assert.ok(st.cards.length <= 8);
  for (const c of st.cards) assert.ok(c.n.length <= 60);
});

test('sanitize only accepts well-formed hex overrides', () => {
  assert.equal(sanitize({ accentOverride: 'red' }).accentOverride, null);
  assert.equal(sanitize({ accentOverride: '#GGGGGG' }).accentOverride, null);
  assert.equal(sanitize({ accentOverride: '#00d4ff' }).accentOverride, '#00d4ff');
});

test('sanitize accepts svg as an export format now that it is supported', () => {
  assert.equal(sanitize({ fmt: 'svg' }).fmt, 'svg');
  assert.equal(sanitize({ fmt: 'jpeg' }).fmt, 'jpeg');
  assert.equal(sanitize({ fmt: 'bmp' }).fmt, 'png', 'unknown formats fall back to png');
});

test('a spec round-trips through sanitize without drifting', () => {
  const original = sanitize({ brand: 'crunchyroll', preset: 'story', rot: 7.5, kicker: 'NOW STREAMING', pillPos: 'bl' });
  const restored = sanitize(makeSpec(original));
  for (const k of ['brand', 'preset', 'rot', 'kicker', 'pillPos', 'bgHex', 'cardSize', 'logoW']) {
    assert.deepEqual(restored[k], original[k], `${k} drifted across a spec round-trip`);
  }
});

test('makeSpec stamps the schema version', () => {
  assert.equal(makeSpec(sanitize({})).v, SPEC_V);
});

/* ── share link encoding ─────────────────────────────────────────────────── */

test('share links round-trip through URL-safe base64', { skip: typeof btoa === 'undefined' ? 'no btoa' : false }, () => {
  const spec = makeSpec(sanitize({ brand: 'plex', preset: 'square', kicker: 'CORE BUILDS' }));
  const enc = encSpec(spec);
  assert.match(enc, /^b[A-Za-z0-9_-]+$/, 'must be URL-safe with no padding');
  assert.deepEqual(decSpec(enc), spec);
});

test('decSpec rejects junk, wrong versions, and oversized payloads', () => {
  assert.equal(decSpec(''), null);
  assert.equal(decSpec('not-a-spec'), null);
  assert.equal(decSpec(null), null);
  assert.equal(decSpec('b' + 'A'.repeat(70000)).__tooBig, 1);
});

test('decSpec rejects a spec from a future schema version', { skip: typeof btoa === 'undefined' ? 'no btoa' : false }, () => {
  assert.equal(decSpec(encSpec({ v: SPEC_V + 1, brand: 'netflix' })), null);
});

/* ── diagnostics ring buffer ─────────────────────────────────────────────── */

test('the error ring never grows past its cap and keeps the newest entries', () => {
  let ring = [];
  for (let i = 0; i < 120; i++) ring = ringAdd(ring, { kind: 'render', msg: `error ${i}` });
  assert.equal(ring.length, 50);
  assert.equal(ring[ring.length - 1].msg, 'error 119');
});

test('ring entries are truncated so one huge message cannot fill storage', () => {
  const ring = ringAdd([], { kind: 'x'.repeat(100), msg: 'y'.repeat(5000) });
  assert.ok(ring[0].kind.length <= 20);
  assert.ok(ring[0].msg.length <= 300);
});

/* ── layout geometry ─────────────────────────────────────────────────────── */

test('layout reproduces the measured reference anchors at 1800x1200', () => {
  const L = layout(1800, 1200, DEF, 6);
  assert.equal(L.cw, 0.25 * 1800);
  assert.equal(L.ch, 0.25 * 1800 * 1.5);
  assert.equal(L.x0, 0.859 * 1800);
  assert.ok(Math.abs(L.logo.L - 0.0786 * 1800) < 1e-9);
  assert.ok(Math.abs(L.logo.cy - 0.5068 * 1200) < 1e-9);
  assert.ok(L.stepX < 0, 'the cascade drifts left');
  assert.ok(L.stepY > 0, 'the cascade drifts down');
});

test('layout is resolution-independent — same proportions at every preset', () => {
  const at = (W, H) => { const L = layout(W, H, DEF, 6); return { x: L.x0 / W, l: L.logo.L / W, cy: L.logo.cy / H, cw: L.cw / W }; };
  const a = at(1800, 1200), b = at(3840, 2160), c = at(1080, 1920);
  for (const k of ['x', 'l', 'cy', 'cw']) {
    assert.ok(Math.abs(a[k] - b[k]) < 1e-9, `${k} drifted at 4K`);
    assert.ok(Math.abs(a[k] - c[k]) < 1e-9, `${k} drifted at 9:16`);
  }
});

test('layout exposes its canvas size so renderers need not recompute it', () => {
  const L = layout(1080, 1920, DEF, 4);
  assert.equal(L.W, 1080);
  assert.equal(L.H, 1920);
});

/* ── ready-made kits ─────────────────────────────────────────────────────── */

test('every ready-made kit names a real brand and a real preset', () => {
  for (const [id, kit] of Object.entries(READY)) {
    assert.ok(BRANDS[kit.spec.brand], `kit ${id} references unknown brand ${kit.spec.brand}`);
    assert.ok(PRESETS[kit.spec.preset], `kit ${id} references unknown preset ${kit.spec.preset}`);
    assert.ok(kit.name && kit.desc, `kit ${id} needs a name and a description`);
  }
});

test('every kit survives sanitize and lands on the brand it asked for', () => {
  for (const [id, kit] of Object.entries(READY)) {
    const st = sanitize(kit.spec);
    assert.equal(st.brand, kit.spec.brand, `kit ${id} lost its brand`);
    assert.equal(st.preset, kit.spec.preset, `kit ${id} lost its preset`);
  }
});

test('every kit produces a design that passes the contrast floor', () => {
  for (const [id, kit] of Object.entries(READY)) {
    const st = sanitize(kit.spec);
    const b = BRANDS[st.brand];
    assert.ok(contrast(b.accent, st.bgHex) >= CONTRAST_MIN, `kit ${id} starts the user on a failing design`);
  }
});

test('the version is a semver string', () => {
  assert.match(BANNER_STUDIO_VERSION, /^\d+\.\d+\.\d+$/);
});
