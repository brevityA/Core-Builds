// The site menu (tools/core-nav.js): one list of routes on every page but the
// configurator's main page. Pins where it loads, that every internal route
// lands somewhere real, and that the configurator keeps it off the main page.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NAV = join(ROOT, 'tools', 'core-nav.js');
const nav = readFileSync(NAV, 'utf8');
const app = readFileSync(join(ROOT, 'configurator', 'src', 'js', 'app.js'), 'utf8');

const TOOL_PAGES = [
  'account-tools/index.html',
  'tools/index.html',
  'tools/badges/index.html',
  'tools/banner-studio/index.html',
  'tools/genies/index.html',
  'tools/genies/nuvio-stacks.html',
  'tools/genies/wuplay-catalogs.html',
  'tools/genies/wuplay-genie/catalogs.html',
  'tools/genies/wuplay-genie/index.html',
  'tools/inspector/index.html',
  'tools/preflight/index.html',
  'tools/speedtest/index.html',
];

const routes = [...nav.matchAll(/\['([^']+)', '([^']+)', '[a-z]+'\]/g)].map(([, name, href]) => ({ name, href }));

test('every tool page loads the menu from tools/core-nav.js', () => {
  for (const page of TOOL_PAGES) {
    const html = readFileSync(join(ROOT, page), 'utf8');
    const m = html.match(/<script src="([^"]*core-nav\.js)" defer><\/script>/);
    assert.ok(m, `${page} has no deferred core-nav.js script`);
    assert.doesNotMatch(html, /<script[^>]*type="module"[^>]*core-nav/, `${page} loads it as a module`);
    const target = resolve(ROOT, dirname(page), m[1]);
    assert.equal(relative(ROOT, target), join('tools', 'core-nav.js'), `${page} points at ${m[1]}`);
  }
});

test('every internal route opens a file that exists', () => {
  const internal = routes.filter((r) => !/^https?:/.test(r.href));
  assert.ok(internal.length >= 12, 'expected the Build, Tools and Help routes');
  for (const { name, href } of internal) {
    const path = href.split('#')[0];
    const file = path.endsWith('/') || path === '' ? join(path, 'index.html') : path;
    assert.ok(existsSync(join(ROOT, file)), `${name} → ${href} has no ${file}`);
  }
});

test('every configurator hash route is one the configurator handles', () => {
  const deep = app.match(/const DEEP_ACTIONS = \{([^}]+)\}/);
  assert.ok(deep, 'DEEP_ACTIONS map not found');
  const handled = new Set([...deep[1].matchAll(/'(#[a-z-]+)'/g)].map((m) => m[1]));
  handled.add('#changelog'); // handled separately, before the map
  assert.match(app, /hash === '#changelog'/);
  for (const { name, href } of routes) {
    const [path, hash] = href.split('#');
    if (path === 'configurator/' && hash) assert.ok(handled.has(`#${hash}`), `${name} uses unhandled #${hash}`);
  }
});

test('external links open in a new tab without an opener', () => {
  assert.match(nav, /target="_blank" rel="noopener noreferrer"/);
});

test('the configurator mounts it in the header and keeps it off the main page', () => {
  assert.match(app, /import '\.\.\/\.\.\/\.\.\/tools\/core-nav\.js';/);
  const call = app.match(/window\.CoreNav\.mount\(\{([\s\S]*?)\}\);/);
  assert.ok(call, 'mountCoreNav call not found');
  assert.match(call[1], /anchor: document\.querySelector\('\.wrap > \.hdr'\)/);
  assert.match(call[1], /\.hybrid-splash/, 'hidden on the main page');
  assert.match(call[1], /#expressLaneModal/, 'hidden while Quick install is open');
  assert.match(call[1], /\.modal-overlay/, 'hidden while a dialog is open');
});

test('the floating button stays below dialogs and the drawer above them', () => {
  assert.match(nav, /\.cbn-btn\{position:fixed;[^}]*z-index:150;/);
  assert.match(nav, /\.cbn-drawer\{[^}]*z-index:10001;/);
});

test('it is a classic script that leaks nothing but window.CoreNav', () => {
  // Classic so it works from file:// and beside Banner Studio's inline handlers;
  // no import.meta, which the configurator's IIFE bundle would leave empty.
  assert.doesNotMatch(nav, /import\.meta|^\s*(export|import)\s/m);
  const window = {};
  const context = vm.createContext({ window });
  new vm.Script(nav, { filename: 'core-nav.js' }).runInContext(context);
  assert.equal(typeof window.CoreNav?.mount, 'function');
  for (const name of ['SECTIONS', 'ICONS', 'CSS', 'HEX', 'mountCoreNav', 'icon', 'samePage', 'self']) {
    assert.equal(vm.runInContext(`typeof ${name}`, context), 'undefined', `${name} reached the global scope`);
  }
});

test('wizard shortcuts leave the menu alone (Enter on Menu, Escape that closes it)', () => {
  const start = app.indexOf("document.addEventListener('keydown', (e) => {\n    // The site menu handles its own keys");
  assert.ok(start >= 0, 'wizard keydown guard missing');
  const guard = app.slice(start, start + 400);
  assert.match(guard, /classList\.contains\('cbn-open'\)/);
  assert.match(guard, /closest\('\.cbn-btn, \.cbn-drawer'\)/);
});

test('the configurator mounts the menu on every start-up path, hand-offs included', () => {
  const guardOpen = app.indexOf('if (!_genieRoute && !_badgeBuilderRoute) {');
  const guardClose = app.indexOf('\n  }\n', guardOpen);
  const mount = app.indexOf('window.CoreNav.mount({');
  assert.ok(guardOpen >= 0 && mount >= 0);
  assert.ok(mount > guardClose, 'mount sits inside the deep-link guard');
});

test('a new-tab link hands focus back to the Menu button', () => {
  assert.match(nav, /if \(link\) close\(link\.target === '_blank'\);/);
});

test('npm run dev serves the repo root so ../tools/core-nav.js resolves', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'configurator', 'package.json'), 'utf8'));
  assert.match(pkg.scripts.dev, /http\.server 8080 -d \.\./);
});

test('same-page menu links work after a hand-off (hashchange is outside the guard)', () => {
  const guardOpen = app.indexOf('if (!_genieRoute && !_badgeBuilderRoute) {');
  const guardClose = app.indexOf('\n  }\n', guardOpen);
  const listener = app.indexOf("window.addEventListener('hashchange'", guardOpen);
  assert.ok(listener > guardClose, 'hashchange listener sits inside the hand-off guard');
});

test('the menu hides while a Fastlane dialog is open', () => {
  const call = app.match(/window\.CoreNav\.mount\(\{([\s\S]*?)\}\);/);
  assert.match(call[1], /\.fastlane-overlay/);
});

test('npm run dev listens on localhost only', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'configurator', 'package.json'), 'utf8'));
  assert.match(pkg.scripts.dev, /--bind 127\.0\.0\.1/);
});

test('the drawer takes the page\'s own ground, and the floating button leaves room at the end', () => {
  assert.doesNotMatch(nav, /prefers-color-scheme:light\)\{:root:not/, 'no longer keyed to the system theme alone');
  assert.match(nav, /:root\.cbn-light-page \.cbn-drawer\{/);
  assert.match(nav, /function open\(\) \{\n    lastFocus = document\.activeElement;\n    syncTheme\(\);/);
  assert.match(nav, /html\.cbn-floats body::after\{content:"";display:block;height:/);
});

test('pages with the Genie-family header, Inspector and Account Tools load the shared shell', () => {
  const shell = readFileSync(join(ROOT, 'tools', 'core-shell.css'), 'utf8');
  assert.match(shell, /\.hdr \.pill\{order:9/);
  for (const page of TOOL_PAGES) {
    const html = readFileSync(join(ROOT, page), 'utf8');
    const needs = /class="hdr"|class="cb-title"/.test(html);
    const m = html.match(/<link rel="stylesheet" href="([^"]*core-shell\.css)">/);
    if (!needs) continue;
    assert.ok(m, `${page} uses shared classes without core-shell.css`);
    assert.equal(relative(ROOT, resolve(ROOT, dirname(page), m[1])), join('tools', 'core-shell.css'));
  }
});
