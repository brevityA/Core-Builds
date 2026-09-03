/**
 * The shipped code must BE the tested code.
 *
 * Banner Studio ships as one self-contained HTML file, so `core.mjs` is inlined
 * into the `<script id="core">` fence rather than imported (see
 * `scripts/sync-core.mjs` for why a module tag is not an option here). That
 * split is only safe if something enforces it, otherwise it rots exactly the way
 * `tools/badges/` already has, where two constants live in the module and never
 * made it into the page.
 *
 * These tests are that enforcement.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

import { toClassicScript } from '../scripts/sync-core.mjs';
import * as core from '../core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const moduleSource = readFileSync(join(here, '..', 'core.mjs'), 'utf8');

const fence = html.split('/*CORE-START*/')[1].split('/*CORE-END*/')[0];

/** Every core symbol the classic script block reads as a global. */
const REQUIRED_GLOBALS = [
  'SPEC_V', 'RING_MAX', 'CAPS', 'PRESETS', 'BRANDS', 'DEF', 'READY',
  'layout', 'maxLogoWidth', 'reduceScale', 'fitCrop',
  'rgba', 'mix', 'rgbHex', 'contrast', 'fnv', 'clamp',
  'sanitize', 'makeSpec', 'encSpec', 'decSpec', 'ringAdd',
];

function runFence() {
  const sandbox = {
    console,
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
  };
  vm.createContext(sandbox);
  vm.runInContext(fence, sandbox, { filename: 'core-fence.js' });
  return sandbox;
}

test('the inline fence is byte-identical to what core.mjs generates', () => {
  assert.equal(
    fence.trim(),
    toClassicScript(moduleSource).trim(),
    'index.html has drifted from core.mjs — run: node tools/banner-studio/scripts/sync-core.mjs',
  );
});

test('the fence carries a do-not-edit banner pointing at the generator', () => {
  assert.match(fence, /AUTO-GENERATED FROM core\.mjs/);
  assert.match(fence, /sync-core\.mjs/);
});

test('the fence parses as a classic script — no leftover module syntax', () => {
  assert.doesNotThrow(() => new vm.Script(fence, { filename: 'core-fence.js' }));
  assert.equal(/^\s*(export|import)\s/m.test(fence), false, 'module syntax would be a SyntaxError in the page');
});

test('every inline script block in the page parses', () => {
  const blocks = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(blocks.length >= 2, 'expected the core fence plus the app script');
  blocks.forEach((body, i) => {
    assert.doesNotThrow(() => new vm.Script(body, { filename: `block-${i}.js` }), `script block ${i} does not parse`);
  });
});

test('the page stays classic — a module tag would break file:// and the inline onclick', () => {
  assert.equal(/<script[^>]*type=["']module["']/.test(html), false);
});

test('all 22 core symbols resolve from the following classic script block', () => {
  const sandbox = runFence();
  // Top-level `const` is a global LEXICAL binding, not a property of globalThis,
  // so probe the way the browser actually resolves it: from a sibling script in
  // the same realm.
  const missing = REQUIRED_GLOBALS.filter(name => {
    const visible = vm.runInContext(
      `(()=>{try{return typeof ${name} !== 'undefined'}catch(e){return false}})()`,
      sandbox, { filename: 'app-block.js' },
    );
    return !visible;
  });
  assert.deepEqual(missing, [], 'the app script would throw a ReferenceError on these');
});

test('the inlined copy behaves identically to the imported module', () => {
  const sandbox = runFence();
  const evaluate = expr => vm.runInContext(expr, sandbox, { filename: 'app-block.js' });

  assert.equal(evaluate('DEF.vignette'), core.DEF.vignette);
  assert.equal(evaluate('sanitize({}).bgHex'), core.sanitize({}).bgHex);
  assert.equal(evaluate('Object.keys(BRANDS).length'), Object.keys(core.BRANDS).length);
  assert.equal(evaluate('Object.keys(READY).join(",")'), Object.keys(core.READY).join(','));
  assert.equal(
    evaluate('contrast(BRANDS.netflix.accent, BRANDS.netflix.bg).toFixed(4)'),
    core.contrast(core.BRANDS.netflix.accent, core.BRANDS.netflix.bg).toFixed(4),
  );
  assert.equal(evaluate('fnv("Stranger Things")'), core.fnv('Stranger Things'));
});

test('the P0 fixes are present in the SHIPPED inline copy, not just the module', () => {
  const sandbox = runFence();
  const evaluate = expr => vm.runInContext(expr, sandbox, { filename: 'app-block.js' });

  // BS-P0-01: the default vignette really was lowered in the page.
  assert.ok(evaluate('DEF.vignette') <= 0.6);

  // BS-P0-03: every brand ships its own background and clears the floor.
  // Join inside the sandbox: values that cross a vm realm boundary carry that
  // realm's Array.prototype, so deepEqual would compare prototypes, not content.
  const failures = evaluate(`
    Object.entries(BRANDS)
      .filter(([, b]) => !b.bg || contrast(b.accent, b.bg) < CONTRAST_MIN)
      .map(([id]) => id)
      .join(',')
  `);
  assert.equal(failures, '', `brands shipping a failing default: ${failures}`);

  // BS-P0-02: the proportional clamp epsilon shipped.
  assert.ok(evaluate('CLAMP_REPORT_EPSILON') > 0 && evaluate('CLAMP_REPORT_EPSILON') < 0.01);
  assert.equal(evaluate('clampIsReportable(658.3, 657.3, 1800)'), false);
  assert.equal(evaluate('clampIsReportable(658.3, 585.9, 1800)'), true);
});

test('the generator refuses module syntax it cannot safely inline', () => {
  assert.throws(
    () => toClassicScript("import { x } from './y.mjs';\nexport const a = 1;\n"),
    /module syntax that cannot be inlined/,
  );
  assert.throws(
    () => toClassicScript('const a = 1;\nexport { a };\n'),
    /module syntax that cannot be inlined/,
  );
});

test('the inline onclick handler still refers to something the page defines', () => {
  const handler = html.match(/onclick="([^"]*)"/);
  assert.ok(handler, 'the white-mark shortcut handler disappeared');
  // It touches `st` and `render()`, which live in the classic app block. This is
  // precisely why the page cannot become a module.
  assert.match(handler[1], /\brender\(\)/);
});
