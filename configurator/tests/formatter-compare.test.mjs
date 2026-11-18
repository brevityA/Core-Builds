// Side-by-side compare and engine-rendered previews for every built-in formatter
// (v3.35). The freshness check needs AIOStreams' engine: offline runs skip
// locally, CI requires it (same rule as core-formatters.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadFormatterEngine } from './helpers/aiostreams-formatter-engine.mjs';
import { FORMATTERS } from '../src/data/formatters.js';
import { FORMATTER_PREVIEWS, FORMATTER_PREVIEW_SAMPLES } from '../src/data/formatter-previews.js';
import { COMPARE_SAMPLES } from './fixtures/core-formatter-samples.mjs';

let aio = null;
try { aio = await loadFormatterEngine(); }
catch (err) { if (process.env.CI) throw new Error(`could not load the AIOStreams formatter engine at the pin: ${err.message}`); }
const skip = aio ? false : 'AIOStreams formatter engine unreachable (offline); CI requires it';

const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('the committed previews are what the engine renders today', { skip }, async () => {
  const { renderFormatterPreviews } = await import('../scripts/render-formatter-previews.mjs');
  const committed = readFileSync(new URL('../src/data/formatter-previews.js', import.meta.url), 'utf8');
  const { source, failed } = await renderFormatterPreviews();
  assert.deepEqual(failed, []);
  assert.equal(committed, source, 'run node scripts/render-formatter-previews.mjs');
});

test('every built-in formatter has a rendered preview for every compare sample', () => {
  const keys = COMPARE_SAMPLES.map(s => s.key);
  assert.deepEqual(FORMATTER_PREVIEW_SAMPLES.map(s => s.key), keys);
  for (const f of FORMATTERS) {
    const modes = FORMATTER_PREVIEWS[f.id];
    assert.ok(modes, `${f.id} has no preview`);
    for (const mode of Object.values(modes)) for (const k of keys) {
      assert.equal(typeof mode[k].n, 'string', `${f.id} ${k}`);
      assert.ok(Array.isArray(mode[k].d), `${f.id} ${k}`);
    }
  }
});

test('the compare samples are synthetic and show the same stream to every formatter', () => {
  for (const s of COMPARE_SAMPLES) {
    assert.match(s.value.stream.title, /^Example /, 'no real titles');
    assert.match(s.value.addon.name, /^Source [A-Z]$/);
  }
  assert.ok(COMPARE_SAMPLES.some(s => s.value.service.cached === false), 'one sample is not cached');
});

test('compare escapes every rendered line and offers each formatter once', () => {
  const fn = app.slice(app.indexOf('function enginePreview('), app.indexOf('\n}\n', app.indexOf('function enginePreview(')));
  assert.match(fn, /split\('\\n'\)\.map\(escHtml\)/);
  assert.match(fn, /p\.d\.map\(escHtml\)/);
  assert.match(app, /function compareChoices\(\) \{\n  return FORMATTERS\.filter\(f => FORMATTER_PREVIEWS\[f\.id\]\);/);
});

test('picking from compare is a real formatter choice', () => {
  assert.match(app, /'fmt-scroll-pick', 'fmt-compare-use',/, 'releases the migration override like a card pick');
  const use = app.slice(app.indexOf("if (action === 'fmt-compare-use') {"), app.indexOf("if (action === 'set-fmt-score') {"));
  assert.match(use, /S\.formatter = el\.dataset\.fmt;/);
  assert.match(use, /saveState\(\);/);
});

test('cards show the engine render, with the illustration only as a fallback', () => {
  assert.match(app, /corePreview\(f\.id\) \|\| enginePreview\(f\.id\) \|\| FMT_PREVIEWS\[f\.id\]/);
});
