// Start Here (tools/start/): every language complete, every configurator label the
// guide names still exists in the configurator, and every answer combination
// produces a full plan with all its text present.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STR, LANGS, DEVICES, APPS, SERVICES, FIXES, plan, fmt, t, uiLabel, labelsIn, detectLang } from '../guide.mjs';
import { I18N_ROWS } from '../../../configurator/src/data/i18n-strings.js';

const appJs = readFileSync(new URL('../../../configurator/src/js/app.js', import.meta.url), 'utf8');
const ids = LANGS.map(l => l.id);

test('every language has every key, and nothing extra', () => {
  const keys = Object.keys(STR.en).sort();
  for (const id of ids) {
    assert.ok(STR[id], `no strings for ${id}`);
    assert.deepEqual(Object.keys(STR[id]).sort(), keys, `${id} keys differ from en`);
    for (const k of keys) assert.ok(String(STR[id][k]).trim(), `${id}.${k} is empty`);
  }
});

test('each translation keeps the same {placeholders} and [[labels]] as English', () => {
  const vars = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const k of Object.keys(STR.en)) {
    for (const id of ids) {
      assert.deepEqual(vars(STR[id][k]), vars(STR.en[k]), `${id}.${k} placeholders`);
      assert.deepEqual(labelsIn(STR[id][k]).sort(), labelsIn(STR.en[k]).sort(), `${id}.${k} [[labels]] must stay the English configurator labels`);
    }
  }
});

test('every configurator label the guide names exists in the configurator', () => {
  const used = new Set(['Get key ↗', 'Install in ~30 seconds', 'Fast', 'Balanced', 'Maximum', ...APPS.map(a => a.label), ...SERVICES.map(v => v.label)]);
  for (const s of Object.values(STR.en)) labelsIn(s).filter(l => !l.startsWith('{')).forEach(l => used.add(l));
  // Quick install assembles this one from parts: `${d.linkLabel||'Get key'} &nearr;`.
  const SOURCE_FORM = { 'Get key ↗': "'Get key'} &nearr;" };
  for (const label of used) {
    // Labels are written into app.js as literal text, sometimes HTML-escaped (&amp;).
    const inApp = appJs.includes(SOURCE_FORM[label] || label) || appJs.includes(label.replace(/&/g, '&amp;'));
    assert.ok(inApp, `configurator no longer shows "${label}"; update tools/start/guide.mjs`);
  }
});

test('labels show the way the configurator shows them in each language', () => {
  const row = new Map(I18N_ROWS.map(r => [r[0], r]));
  assert.equal(uiLabel('Quick install', 'es'), row.get('Quick install')[1]);
  assert.equal(uiLabel('Balanced', 'de'), row.get('Balanced')[4]);
  // Not translated in the configurator, so not translated here either.
  assert.equal(row.has('Set a Password'), false);
  assert.equal(uiLabel('Set a Password', 'fr'), 'Set a Password');
});

test('every answer combination gives a complete plan with text in every language', () => {
  for (const d of DEVICES) for (const a of APPS) for (const v of SERVICES) {
    const { build, add } = plan({ device: d.id, app: a.id, service: v.id });
    const tasks = [...build.flatMap(g => g.tasks), ...add];
    assert.ok(build.length === 5 && add.length >= 1, `${d.id}/${a.id}/${v.id}`);
    const taskIds = tasks.map(x => x[0]);
    assert.equal(new Set(taskIds).size, taskIds.length, `duplicate task ids for ${d.id}/${a.id}/${v.id}`);
    for (const [, key, small, vars] of tasks) {
      for (const k of [key, small].filter(Boolean)) {
        assert.ok(k in STR.en, `missing key ${k}`);
        for (const id of ids) {
          const html = fmt(t(id, k), id, { url: 'example', ...(vars || {}) });
          assert.doesNotMatch(html, /\{\w+\}|\[\[|\*\*/, `${id}.${k} left a marker unfilled for ${d.id}/${a.id}/${v.id}`);
        }
      }
    }
    // Stremio asks for the Stremio login; nothing else does.
    assert.equal(taskIds.includes('b.login'), a.id === 'stremio');
    // Free / P2P has no key to paste; EasyNews signs in with a username and password.
    assert.equal(taskIds.includes('b.key'), v.id !== 'free' && v.id !== 'en');
    assert.equal(taskIds.includes('b.login-en'), v.id === 'en');
  }
});

test('a TV setup is done from a phone or computer, and Stremio on a TV signs in instead of pasting', () => {
  const tv = plan({ device: 'atv', app: 'stremio', service: 'torbox' });
  assert.equal(tv.build[0].tasks[0][1], 'b_open_tv');
  assert.deepEqual(tv.add.map(x => x[0]), ['a.tvapp', 'a.seen']);
  const wu = plan({ device: 'atv', app: 'wuplay', service: 'rd' });
  assert.deepEqual(wu.add.map(x => x[0]), ['a.cfg', 'a.scan']);
});

test('every device, app, service and fix has its text', () => {
  for (const id of ids) {
    for (const d of DEVICES) assert.ok(STR[id]['d_' + d.id] && STR[id][`d_${d.id}_n`]);
    for (const a of APPS) assert.ok(STR[id][`a_${a.id}_n`]);
    for (const a of APPS.filter(x => x.id !== 'other')) assert.ok(STR[id][`a_${a.id}_g`]);
    for (const v of SERVICES) assert.ok(STR[id][`v_${v.id}_n`]);
    for (const f of FIXES) assert.ok(STR[id]['f_' + f] && STR[id][`f_${f}_x`]);
  }
});

test('fmt escapes values and turns markers into markup', () => {
  assert.equal(fmt('Tap [[Quick install]] on **{x}**', 'en', { x: '<b>' }), 'Tap <span class="ui">Quick install</span> on <strong>&lt;b&gt;</strong>');
  assert.equal(fmt('[[Quick install]]', 'es'), `<span class="ui">${uiLabel('Quick install', 'es')}</span>`);
  assert.equal(fmt('[[Options & defaults]]', 'en'), '<span class="ui">Options &amp; defaults</span>');
});

test('language: saved choice, then browser, then English (shared key with the configurator)', () => {
  assert.equal(detectLang(['pt-BR'], null), 'pt');
  assert.equal(detectLang(['ja'], null), 'en');
  assert.equal(detectLang(['de'], 'fr'), 'fr');
});

test('the page loads its scripts as files, as its content policy requires', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /script-src 'self'[;"]/);
  // Every script tag must load a file: an inline one would be blocked by the CSP.
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].map(m => m[1]);
  assert.ok(tags.length >= 2);
  for (const attrs of tags) assert.match(attrs, /\bsrc="/, `inline script: <script${attrs}>`);
  assert.match(html, /<script type="module" src=".\/app.mjs"><\/script>/);
});

test('Chillio with Free / P2P stops before the steps, as Quick install does', async () => {
  const { blocked } = await import('../guide.mjs');
  const policy = readFileSync(new URL('../../../configurator/src/core/chilllink-policy.js', import.meta.url), 'utf8');
  assert.match(policy, /service === 'p2p'[\s\S]{0,80}status: 'blocked'/, 'the configurator still blocks Chillio with P2P');
  assert.equal(blocked({ app: 'chillio', service: 'free' }), 'chillFree');
  for (const a of APPS) for (const v of SERVICES) {
    if (!(a.id === 'chillio' && v.id === 'free')) assert.equal(blocked({ app: a.id, service: v.id }), null, `${a.id}/${v.id}`);
  }
});

test('EasyNews asks for a username and password, not a key', () => {
  const creds = readFileSync(new URL('../../../configurator/src/data/credentials.js', import.meta.url), 'utf8');
  assert.match(creds, /easynews:\s*\{ label: 'EasyNews Username'/);
  assert.match(creds, /easynewsPass:\s*\{ label: 'EasyNews Password'/);
  const ids = plan({ device: 'pc', app: 'stremio', service: 'en' }).build.flatMap(g => g.tasks.map(x => x[0]));
  assert.ok(ids.includes('b.login-en'));
  assert.ok(!ids.includes('b.key'));
});
