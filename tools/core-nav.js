// Core Builds site menu: one button, one drawer, the same routes on every page.
//
// A classic script, so it also works from file:// and next to pages that use
// inline handlers (Banner Studio stays module-free on purpose). Tool pages load
// it with <script src="…/core-nav.js" defer> and it mounts itself, resolving
// links from its own location. The configurator bundles it and calls
// window.CoreNav.mount() itself; it hides on the configurator's main page,
// which lists these routes already.
//
// Wrapped in an IIFE so none of its names reach a page's global scope.
// No dependencies; styles are injected once, and every page's CSP
// (script-src 'self', style-src 'unsafe-inline') allows it.
(function () {
'use strict';

const SECTIONS = [
  ['Build', [
    ['Main page', 'configurator/', 'home'],
    ['Quick install', 'configurator/#express', 'bolt'],
    ['Custom build', 'configurator/#advanced', 'sliders'],
    ['Guided setup', 'configurator/#guided', 'compass'],
    ['Stream cards', 'configurator/#cards', 'cards'],
    ['Update an existing setup', 'configurator/#update', 'refresh'],
    ['Import a config', 'configurator/#import', 'import'],
  ]],
  ['Tools', [
    ['All Core Tools', 'tools/', 'grid'],
    ['Template Inspector', 'tools/inspector/', 'search'],
    ['Back Up Addons', 'account-tools/', 'download'],
    ['Nuvio Stack Genie', 'tools/genies/nuvio-stacks.html', 'play'],
    ['Core Badge Builder', 'tools/badges/', 'badge'],
    ['Core Speed', 'tools/speedtest/', 'gauge'],
  ]],
  ['Help', [
    ["What's new", 'configurator/#changelog', 'spark'],
    ['Take the tour', 'configurator/#tour', 'route'],
    ['Report an issue', 'configurator/#report', 'flag'],
    ['Support Core Builds', 'configurator/#support', 'heart'],
  ]],
  ['Community', [
    ['Docs', 'https://corebuilds-docs.docsalot.dev/', 'book'],
    ['Core Crew on Reddit', 'https://www.reddit.com/r/CoreBuilds/', 'chat'],
    ['Discord', 'https://discord.gg/AwJ49yzbqT', 'chat'],
    ['GitHub', 'https://github.com/brevityA/Core-Builds', 'code'],
  ]],
];

const ICONS = {
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  sliders: 'M5 4v16M12 4v16M19 4v16M3 9h4M10 15h4M17 7h4',
  compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  import: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  cards: 'M4 6h16v5H4zM4 13h16v5H4zM7 8.5h6M7 15.5h4',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM16 16l5 5',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  play: 'M7 4l13 8-13 8z',
  badge: 'M4 5h16v14H4zM8 9h8M8 13h5',
  gauge: 'M4 17a8 8 0 1116 0M12 17l4-6',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  route: 'M6 19a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM6 15V9a4 4 0 014-4h6M18 9v6a4 4 0 01-4 4H8',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16',
  chat: 'M4 5h16v11H9l-5 4z',
  code: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
};

const HEX = '<svg viewBox="0 0 512 512" aria-hidden="true"><polygon points="256,41 442,149 442,363 256,471 70,363 70,149" fill="none" stroke="currentColor" stroke-width="40" stroke-linejoin="round"/><polygon points="256,176 336,256 256,336 176,256" fill="currentColor"/></svg>';

const CSS = `
.cbn-btn{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:150;display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 16px 0 13px;border-radius:999px;border:1px solid rgba(31,200,232,.35);background:rgba(10,16,22,.86);color:#e6edf3;font:600 14px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.45);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.cbn-btn:hover{border-color:#1fc8e8;color:#fff}
.cbn-btn:focus-visible,.cbn-drawer a:focus-visible,.cbn-close:focus-visible{outline:2px solid #1fc8e8;outline-offset:2px}
.cbn-btn svg{width:18px;height:18px}
.cbn-btn .cbn-bars{display:inline-flex;flex-direction:column;gap:3px}.cbn-btn .cbn-bars i{display:block;width:16px;height:2px;border-radius:2px;background:currentColor}
html.cbn-hide .cbn-btn{display:none}
.cbn-btn.cbn-inline{position:static;flex:0 0 auto;width:40px;height:40px;padding:0;justify-content:center;gap:0;margin-right:10px;background:transparent;color:inherit;border-color:rgba(127,140,155,.38);box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.cbn-btn.cbn-inline .cbn-word{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.cbn-scrim{position:fixed;inset:0;z-index:10000;background:rgba(3,6,10,.55);opacity:0;transition:opacity .2s}
.cbn-drawer{position:fixed;top:0;bottom:0;left:0;z-index:10001;width:min(340px,88vw);overflow-y:auto;overscroll-behavior:contain;background:#0b1117;color:#e6edf3;border-right:1px solid #1d2631;box-shadow:20px 0 60px rgba(0,0,0,.5);padding:18px 14px max(24px,env(safe-area-inset-bottom));transform:translateX(-102%);transition:transform .24s cubic-bezier(.2,.8,.2,1);font:500 15px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif}
.cbn-open .cbn-scrim{opacity:1}.cbn-open .cbn-drawer{transform:none}
.cbn-head{display:flex;align-items:center;gap:10px;padding:2px 6px 14px;border-bottom:1px solid #1d2631;margin-bottom:6px}
.cbn-head .cbn-mark{width:28px;height:28px;color:#1fc8e8}.cbn-head b{font-size:17px;font-weight:700;letter-spacing:-.01em}.cbn-head b span{color:#1fc8e8}
.cbn-close{margin-left:auto;width:36px;height:36px;border-radius:10px;border:1px solid #1d2631;background:transparent;color:#8b96a3;font-size:18px;cursor:pointer}
.cbn-close:hover{color:#fff;border-color:#2b3846}
.cbn-label{margin:14px 8px 6px;font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.2em;text-transform:uppercase;color:#1fc8e8}
.cbn-drawer a{display:flex;align-items:center;gap:12px;min-height:44px;padding:0 10px;border-radius:12px;color:#c9d3dd;text-decoration:none}
.cbn-drawer a:hover{background:#121a23;color:#fff}
.cbn-drawer a[aria-current="page"]{background:rgba(31,200,232,.1);color:#fff;box-shadow:inset 0 0 0 1px rgba(31,200,232,.3)}
.cbn-drawer a svg{flex:0 0 auto;width:18px;height:18px;color:#7f8b98}.cbn-drawer a:hover svg,.cbn-drawer a[aria-current="page"] svg{color:#1fc8e8}
.cbn-drawer a .cbn-ext{margin-left:auto;font-size:12px;color:#5d6773}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]) .cbn-drawer{background:#fbfcfd;color:#1c2128;border-color:#d8dee4}:root:not([data-theme="dark"]) .cbn-drawer a{color:#3a434d}:root:not([data-theme="dark"]) .cbn-drawer a:hover{background:#eef2f6;color:#0d1117}:root:not([data-theme="dark"]) .cbn-head,:root:not([data-theme="dark"]) .cbn-close{border-color:#d8dee4}:root:not([data-theme="dark"]) .cbn-label,:root:not([data-theme="dark"]) .cbn-head .cbn-mark{color:#0a7ea4}:root:not([data-theme="dark"]) .cbn-drawer a[aria-current="page"]{background:rgba(10,126,164,.08);color:#0d1117;box-shadow:inset 0 0 0 1px rgba(10,126,164,.3)}}
:root[data-theme="light"] .cbn-drawer{background:#fbfcfd;color:#1c2128;border-color:#d8dee4}:root[data-theme="light"] .cbn-drawer a{color:#3a434d}:root[data-theme="light"] .cbn-drawer a:hover{background:#eef2f6;color:#0d1117}:root[data-theme="light"] .cbn-head,:root[data-theme="light"] .cbn-close{border-color:#d8dee4}:root[data-theme="light"] .cbn-label,:root[data-theme="light"] .cbn-head .cbn-mark{color:#0a7ea4}:root[data-theme="light"] .cbn-drawer a[aria-current="page"]{background:rgba(10,126,164,.08);color:#0d1117;box-shadow:inset 0 0 0 1px rgba(10,126,164,.3)}
@media print{.cbn-btn,.cbn-scrim,.cbn-drawer{display:none!important}}
@media (prefers-reduced-motion:reduce){.cbn-drawer,.cbn-scrim{transition:none}}
`;

const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name] || ICONS.grid}"/></svg>`;

function samePage(url) {
  const strip = (p) => p.replace(/index\.html$/, '').replace(/\/+$/, '/');
  return url.origin === location.origin && strip(url.pathname) === strip(location.pathname) && !url.hash;
}

/**
 * Mount the menu once per page.
 * @param {{ root?: string|URL, hideOn?: () => boolean, anchor?: Element, markCurrent?: boolean }} options
 *   root        — the site root every relative route resolves against.
 *   hideOn      — return true to hide the button (re-checked as the page changes).
 *   anchor      — put a compact button at the start of this element instead of
 *                 floating it (the configurator's header, so it never covers the
 *                 wizard's bottom bar).
 *   markCurrent — highlight the link to this page (off where one URL has many screens).
 */
function mountCoreNav({ root, hideOn, anchor, markCurrent = true } = {}) {
  if (typeof document === 'undefined' || document.getElementById('cbnBtn')) return null;
  const base = new URL(root || new URL('../', location.href));

  const style = document.createElement('style');
  style.id = 'cbnStyle';
  style.textContent = CSS;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'cbnBtn';
  btn.className = anchor ? 'cbn-btn cbn-inline' : 'cbn-btn';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'cbnDrawer');
  btn.innerHTML = '<span class="cbn-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="cbn-word">Menu</span>';

  const scrim = document.createElement('div');
  scrim.className = 'cbn-scrim';
  scrim.hidden = true;

  const drawer = document.createElement('nav');
  drawer.id = 'cbnDrawer';
  drawer.className = 'cbn-drawer';
  drawer.setAttribute('aria-label', 'Core Builds');
  drawer.hidden = true;
  const links = SECTIONS.map(([label, items]) => `<div class="cbn-label">${label}</div>` + items.map(([name, href, ico]) => {
    const external = /^https?:/.test(href);
    const url = external ? new URL(href) : new URL(href, base);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : (markCurrent && samePage(url) ? ' aria-current="page"' : '');
    return `<a href="${url.href}"${attrs}>${icon(ico)}<span>${name}</span>${external ? '<span class="cbn-ext" aria-hidden="true">↗</span>' : ''}</a>`;
  }).join('')).join('');
  drawer.innerHTML = `<div class="cbn-head"><span class="cbn-mark">${HEX}</span><b>Core <span>Builds</span></b><button type="button" class="cbn-close" aria-label="Close menu">✕</button></div>${links}`;

  if (anchor) anchor.prepend(btn);
  else document.body.append(btn);
  document.body.append(scrim, drawer);

  let lastFocus = null;
  const isOpen = () => document.documentElement.classList.contains('cbn-open');
  function open() {
    lastFocus = document.activeElement;
    scrim.hidden = false;
    drawer.hidden = false;
    requestAnimationFrame(() => document.documentElement.classList.add('cbn-open'));
    btn.setAttribute('aria-expanded', 'true');
    (drawer.querySelector('a[aria-current]') || drawer.querySelector('a')).focus({ preventScroll: true });
  }
  function close(restore = true) {
    if (!isOpen()) return;
    document.documentElement.classList.remove('cbn-open');
    btn.setAttribute('aria-expanded', 'false');
    const done = () => { if (!isOpen()) { scrim.hidden = true; drawer.hidden = true; } };
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    reduced ? done() : setTimeout(done, 260);
    if (restore && lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
  }

  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  scrim.addEventListener('click', () => close());
  drawer.querySelector('.cbn-close').addEventListener('click', () => close());
  // A link to another hash on this page (the configurator's #advanced, #tour…)
  // does not unload it, so close the drawer before the action runs.
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) close(false); });
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const items = [...drawer.querySelectorAll('a, button')];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  if (typeof hideOn === 'function') {
    const sync = () => {
      const hide = !!hideOn();
      document.documentElement.classList.toggle('cbn-hide', hide);
      if (hide) close(false);
    };
    sync();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
  }
  return { open, close };
}

// Expose the mount for the configurator (and anything else that bundles this).
if (typeof window !== 'undefined') window.CoreNav = { mount: mountCoreNav };

// Loaded as its own <script>: mount with links relative to this file, which
// sits in tools/, one level below the site root.
const self = typeof document !== 'undefined' ? document.currentScript : null;
if (self && /core-nav\.js(\?|#|$)/.test(self.src || '')) {
  const root = new URL('../', self.src);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountCoreNav({ root }));
  else mountCoreNav({ root });
}
})();
