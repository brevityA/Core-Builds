// Interface language for the configurator: English, Español, Português, Français, Deutsch.
//
// The app renders English. This module translates what is on screen after each
// render, by exact text: a text node or a title / aria-label / placeholder whose
// whole (trimmed) value is a known English string is swapped for the chosen
// language. Anything not in the table stays English, so a missing translation
// never breaks a screen, and nothing the app reads back changes: values, data-*
// attributes and the generated config are never touched.
//
// Skipped: script/style, form fields' values, <pre>/<code>, and any subtree marked
// [data-no-i18n] (JSON previews, formatter previews, the user's own names).
import { I18N_ROWS, I18N_LANGS, I18N_HTML_ROWS } from '../data/i18n-strings.js';

export const LANGS = I18N_LANGS; // [{ id:'en', label:'English', short:'EN' }, ...]
const IDS = LANGS.map(l => l.id);
const STORE_KEY = 'coreBuildUiLang';
const ATTRS = ['title', 'aria-label', 'placeholder'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE', 'NOSCRIPT', 'SVG']);

// en -> { es, pt, fr, de }
const TABLE = new Map();
for (const row of I18N_ROWS) {
  const [en, ...rest] = row;
  const t = {};
  IDS.slice(1).forEach((id, i) => { t[id] = rest[i]; });
  TABLE.set(en, t);
}

// Strings with a number or name inside. Each pattern's captured parts are kept,
// translated when they are themselves in the table.
const PATTERNS = [
  { re: /^Step (\d+) of (\d+)$/, out: { es: 'Paso $1 de $2', pt: 'Passo $1 de $2', fr: 'Étape $1 sur $2', de: 'Schritt $1 von $2' } },
  { re: /^Step (\d+)$/, out: { es: 'Paso $1', pt: 'Passo $1', fr: 'Étape $1', de: 'Schritt $1' } },
  { re: /^Step (\d+) of (\d+) ([—·]) (.+)$/, out: { es: 'Paso $1 de $2 $3 $4', pt: 'Passo $1 de $2 $3 $4', fr: 'Étape $1 sur $2 $3 $4', de: 'Schritt $1 von $2 $3 $4' }, sub: [4] },
  { re: /^(Sources|Your Device|Video Quality|Content Preferences|Accounts & Keys): (.+)$/, out: { es: '$1: $2', pt: '$1: $2', fr: '$1 : $2', de: '$1: $2' }, sub: [1, 2] },
  { re: /^(\d+)\/(\d+) checks passed$/, out: { es: '$1/$2 comprobaciones superadas', pt: '$1/$2 verificações aprovadas', fr: '$1/$2 vérifications réussies', de: '$1/$2 Prüfungen bestanden' } },
  { re: /^Go back to (.+)$/, out: { es: 'Volver a $1', pt: 'Voltar para $1', fr: 'Revenir à $1', de: 'Zurück zu $1' }, sub: [1] },
  // Messages that end in a detail from the host or the browser: translate the lead-in, keep the detail.
  { re: /^(Install failed|Update failed|Could not create account|Could not strip patterns|Preview generation failed|Applied|Restored backup from|Stripped): ?(.*)$/, out: { es: '$1: $2', pt: '$1: $2', fr: '$1 : $2', de: '$1: $2' }, sub: [1] },
];

// Paragraphs with bold or code in the middle of a sentence are translated whole:
// word order differs between languages, so their pieces cannot be swapped one by
// one. Keys are the element's innerHTML, normalised by the browser itself
// (entities, quotes) the first time they are needed, then matched with whitespace
// collapsed.
let HTML = null; // normalised en innerHTML -> { es, pt, fr, de }
let HTML_FIRST = null; // first words of each key, to find candidates cheaply
const squash = s => s.replace(/\s+/g, ' ').trim();
function firstWords(node) {
  for (let n = node.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 3) { if (n.data.trim()) return n.data.trim(); continue; }
    if (n.nodeType === 1) { const w = firstWords(n); if (w) return w; }
  }
  return '';
}
function htmlTable() {
  if (HTML) return HTML;
  HTML = new Map(); HTML_FIRST = new Set();
  const tpl = document.createElement('template');
  for (const [en, ...rest] of I18N_HTML_ROWS) {
    tpl.innerHTML = en;
    const t = {};
    IDS.slice(1).forEach((id, i) => { t[id] = rest[i]; });
    HTML.set(squash(tpl.innerHTML), t);
    HTML_FIRST.add(firstWords(tpl.content));
  }
  return HTML;
}

let lang = 'en';
// Read ?lang= when this module loads: loadState() strips the query string on
// DOMContentLoaded, before initI18n() runs.
let urlLang = null;
try { urlLang = new URLSearchParams(location.search).get('lang'); } catch { /* no location (tests) */ }
const textState = new WeakMap(); // Text node -> { en, out }
const attrState = new WeakMap(); // Element -> { [attr]: { en, out } }
const htmlState = new WeakMap(); // Element -> { en, out, lang }: out is innerHTML as the browser re-serialised it

function doHtml(el) {
  const table = htmlTable();
  const rec = htmlState.get(el);
  if (!rec && !HTML_FIRST.has(firstWords(el))) return;
  const cur = el.innerHTML;
  const ours = rec && cur === rec.out; // still exactly what we put there
  if (ours && rec.lang === lang) return; // nothing to do: this is what stops re-entry
  const en = ours ? rec.en : cur;
  const hit = lang === 'en' ? null : table.get(squash(en))?.[lang];
  if (!hit) {
    if (ours) el.innerHTML = en; // back to English
    if (rec) htmlState.set(el, { en, out: el.innerHTML, lang });
    return;
  }
  el.innerHTML = hit;
  htmlState.set(el, { en, out: el.innerHTML, lang });
}

export function translate(en, to = lang) {
  if (to === 'en' || typeof en !== 'string') return en;
  const hit = TABLE.get(en);
  if (hit && hit[to]) return hit[to];
  for (const p of PATTERNS) {
    const m = en.match(p.re);
    if (!m) continue;
    let out = p.out[to];
    for (let i = 1; i < m.length; i++) {
      const part = p.sub?.includes(i) ? (TABLE.get(m[i])?.[to] || m[i]) : m[i];
      out = out.split(`$${i}`).join(part);
    }
    return out;
  }
  return en;
}

// Keep the node's own leading/trailing whitespace; match on the trimmed value.
function swap(en) {
  const core = en.trim();
  if (!core) return en;
  const t = translate(core);
  if (t === core) return en;
  const lead = en.slice(0, en.indexOf(core));
  const trail = en.slice(lead.length + core.length);
  return lead + t + trail;
}

function skipped(el) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName.toUpperCase()) || e.isContentEditable) return true;
    if (e.hasAttribute('data-no-i18n')) return true;
  }
  return false;
}

function doText(node) {
  const rec = textState.get(node);
  // The app may have rewritten the node since we last touched it: then its
  // current text is the new English.
  const en = rec && node.data === rec.out ? rec.en : node.data;
  const out = swap(en);
  if (out !== node.data) node.data = out;
  if (out !== en || rec) textState.set(node, { en, out });
}

function doAttrs(el) {
  let rec = attrState.get(el);
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const cur = el.getAttribute(a);
    const prev = rec?.[a];
    const en = prev && cur === prev.out ? prev.en : cur;
    const out = swap(en);
    if (out !== cur) el.setAttribute(a, out);
    if (out !== en || prev) { rec = rec || {}; rec[a] = { en, out }; attrState.set(el, rec); }
  }
}

export function translateTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (!skipped(root.parentElement)) doText(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  const start = root.nodeType === 1 ? root : null;
  if (start && skipped(start)) return;
  if (start) { doHtml(start); doAttrs(start); }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        const tag = n.tagName.toUpperCase();
        if (SKIP_TAGS.has(tag) || n.hasAttribute('data-no-i18n') || n.isContentEditable) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 3) doText(n); else { doHtml(n); doAttrs(n); }
  }
}

export function detectLang(navLangs, stored) {
  if (stored && IDS.includes(stored)) return stored;
  for (const l of navLangs || []) {
    const base = String(l || '').toLowerCase().split('-')[0];
    if (IDS.includes(base)) return base;
  }
  return 'en';
}

export function currentLang() { return lang; }

export function setLang(id) {
  if (!IDS.includes(id)) id = 'en';
  lang = id;
  try { localStorage.setItem(STORE_KEY, id); } catch { /* private mode: keep it for this visit */ }
  document.documentElement.lang = id;
  translateTree(document.body);
  syncButton();
}

let btn = null;
let menu = null;

function syncButton() {
  if (!btn) return;
  const cur = LANGS.find(l => l.id === lang) || LANGS[0];
  btn.querySelector('.cb-lang-code').textContent = cur.short;
  btn.setAttribute('aria-label', `Language: ${cur.label}`);
  menu?.querySelectorAll('[data-lang]').forEach(o => o.setAttribute('aria-checked', String(o.dataset.lang === lang)));
}

function closeMenu() { if (menu) { menu.hidden = true; btn?.setAttribute('aria-expanded', 'false'); } }

function buildButton() {
  const wrap = document.createElement('div');
  wrap.className = 'cb-lang';
  wrap.setAttribute('data-no-i18n', '');
  wrap.innerHTML = `<button type="button" class="cb-lang-btn" aria-haspopup="menu" aria-expanded="false" title="Language · Idioma · Langue · Sprache"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg><span class="cb-lang-code">EN</span></button>
<div class="cb-lang-menu" role="menu" hidden>${LANGS.map(l => `<button type="button" role="menuitemradio" aria-checked="false" data-lang="${l.id}" lang="${l.id}">${l.label}</button>`).join('')}</div>`;
  btn = wrap.querySelector('.cb-lang-btn');
  menu = wrap.querySelector('.cb-lang-menu');
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('[aria-checked="true"]')?.focus();
  });
  menu.addEventListener('click', e => {
    const o = e.target.closest('[data-lang]');
    if (!o) return;
    setLang(o.dataset.lang);
    closeMenu();
    btn.focus();
  });
  menu.addEventListener('keydown', e => {
    const items = [...menu.querySelectorAll('[data-lang]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
  // The wizard binds Escape/Enter/arrows on document (Back, Next). Keys pressed
  // inside the picker are the picker's: stop them here, without preventing the
  // buttons' own Enter/Space activation.
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { closeMenu(); btn.focus(); }
    e.stopPropagation();
  });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) closeMenu(); });
  document.body.appendChild(wrap);
}

export function initI18n() {
  let stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch { /* no storage: fall back to the browser */ }
  lang = detectLang(navigator.languages || [navigator.language], IDS.includes(urlLang) ? urlLang : stored);
  document.documentElement.lang = lang;
  buildButton();
  syncButton();
  if (lang !== 'en') translateTree(document.body);
  // childList only: our own edits change node.data (characterData) or the three
  // attributes, which re-enter doAttrs but settle on the first pass.
  new MutationObserver(records => {
    if (lang === 'en') return;
    for (const r of records) {
      if (r.type === 'childList') {
        // A whole paragraph swapped in (a help pop-up, a re-rendered hint) is matched at its parent.
        if (r.target.nodeType === 1 && r.addedNodes.length && !skipped(r.target)) doHtml(r.target);
        r.addedNodes.forEach(n => translateTree(n));
      }
      else if (r.type === 'attributes' && r.target.nodeType === 1 && !skipped(r.target)) doAttrs(r.target);
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ATTRS });
}
