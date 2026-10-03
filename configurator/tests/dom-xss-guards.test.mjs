/**
 * CodeQL js/xss-through-dom (2026-10-03): state values reach innerHTML through
 * label(), the help tooltips and a few templates. State can arrive from a shared
 * link, an imported config or a localStorage backup, so each path must escape.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const fn = (name) => app.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))?.[0];
const PAYLOAD = '<img src=x onerror=alert(1)>';

test('label() escapes any value that is not a known option name', () => {
  const escHtml = app.match(/function escHtml\(s\)\{[^\n]*\}/)[0];
  const labelFor = new Function('S', 'FORMATTERS', 'DEFS', `${escHtml}\n${fn('label')}\nreturn label;`);
  const DEFS = [{ key: 'service', opts: [{ v: 'torbox-pro', name: 'TorBox Pro' }] }, { key: 'device', opts: [] }];
  const label = labelFor({ customFormatter: { label: PAYLOAD }, multiServices: ['torbox-pro', PAYLOAD] }, [{ id: 'family-v4', label: 'Family v4' }], DEFS);
  for (const out of [label('formatter', PAYLOAD), label('formatter', 'custom'), label('device', PAYLOAD), label('nokey', PAYLOAD), label('audio', PAYLOAD)]) {
    assert.doesNotMatch(out, /<img/, out);
  }
  assert.equal(label('formatter', 'family-v4'), 'Family v4', 'known names are returned as authored');
  assert.equal(label('service', 'torbox-pro'), 'TorBox Pro');
});

test('help tooltips keep their markup in a registry, not in the DOM attribute', () => {
  assert.doesNotMatch(app, /innerHTML = icon\.getAttribute\('data-fttip'\)/);
  assert.match(app, /pop\.innerHTML = FT_TIPS\.get\(icon\.getAttribute\('data-fttip'\)\)/);
  const tip = new Function(`const FT_TIPS = new Map(); const FT_TIP_IDS = new Map();\n${fn('ftTip')}\nreturn { ftTip, FT_TIPS };`)();
  const a = tip.ftTip('<strong>Help</strong> text'), b = tip.ftTip('<strong>Help</strong> text');
  assert.equal(a, b, 're-rendering the same tip reuses its id');
  const id = a.match(/data-fttip="([^"]+)"/)[1];
  assert.match(id, /^t\d+$/);
  assert.equal(tip.FT_TIPS.get(id), '<strong>Help</strong> text');
});

test('templates escape state they interpolate directly', () => {
  assert.match(app, /placeholder="\$\{escH\(auto\)\}"/, 'template name placeholder');
  assert.match(app, /value="\$\{escHtml\(S\.instanceUuid \|\| ''\)\}"/, 'instance UUID field');
  assert.match(app, /\(S\.langs\|\|\['English'\]\)\.map\(escHtml\)\.join\(' · '\)/, 'language chip');
  assert.match(app, /streams not in ' \+ \(S\.langs\|\|\['English'\]\)\.map\(escHtml\)/, 'template highlights');
  assert.match(app, /const svc = escHtml\(b\.multiServices/, 'backup timeline rows');
});
