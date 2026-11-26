// Start Here page: renders guide.mjs into the one-page guided setup.
import { LANGS, LANG_KEY, detectLang, fmt, t, uiLabel, DEVICES, APPS, SERVICES, CONFIGURATOR_URL, deviceName, appName, isTV, plan, FIXES, blocked } from './guide.mjs';

const STATE_KEY = 'cb-start-guide';
const blank = () => ({ device: null, app: null, service: null, ticks: {}, played: null, fix: null });
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: this visit only */ } },
};

let s = blank();
try {
  const saved = JSON.parse(store.get(STATE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    s = { ...blank(), ...saved, ticks: saved.ticks && typeof saved.ticks === 'object' ? saved.ticks : {} };
    if (!DEVICES.some(d => d.id === s.device)) s.device = null;
    if (!APPS.some(a => a.id === s.app)) s.app = null;
    if (!SERVICES.some(v => v.id === s.service)) s.service = null;
  }
} catch { /* corrupt: start fresh */ }
const save = () => store.set(STATE_KEY, JSON.stringify(s));

let urlLang = null;
try { urlLang = new URLSearchParams(location.search).get('lang'); } catch { /* ignore */ }
let lang = detectLang(navigator.languages || [navigator.language], LANGS.some(l => l.id === urlLang) ? urlLang : store.get(LANG_KEY));

const $ = id => document.getElementById(id);
const T = (key, vars) => fmt(t(lang, key), lang, vars);
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A locked section's buttons are disabled, not just faded: Tab must not reach them.
function tiles(items, key, recId, locked = false) {
  return `<div class="grid" role="radiogroup">${items.map(o => `<button type="button" class="choice${s[key] === o.id ? ' sel' : ''}" role="radio" aria-checked="${s[key] === o.id}" data-set="${key}" data-val="${o.id}"${locked ? ' disabled' : ''}><b>${esc(o.name)}${o.id === recId ? `<span class="reco">${T('forYou')}</span>` : ''}</b><span>${esc(o.note)}</span></button>`).join('')}</div>`;
}
const deviceItems = () => DEVICES.map(d => ({ id: d.id, name: t(lang, 'd_' + d.id), note: t(lang, `d_${d.id}_n`) }));
const appItems = () => APPS.map(a => ({ id: a.id, name: a.name || t(lang, 'a_other'), note: t(lang, `a_${a.id}_n`) }));
const svcItems = () => SERVICES.map(v => ({ id: v.id, name: v.name || t(lang, 'v_free'), note: t(lang, `v_${v.id}_n`) }));

function mini(kind) {
  const tile = (label, lit) => `<div class="t${lit ? ' lit' : ''}"${lit ? ` data-tap="${T('tap')}"` : ''}>${esc(uiLabel(label, lang))}</div>`;
  if (kind === 'app') return `<div class="mini" aria-hidden="true"><div class="cap">${T('miniApp')}</div><div class="row">${APPS.map(a => tile(a.label, a.id === s.app)).join('')}</div></div>`;
  if (kind === 'svc') {
    const v = SERVICES.find(x => x.id === s.service);
    const fields = s.service === 'free' ? ''
      : s.service === 'en'
        ? `<div class="key"><div>${T('miniUser', { svc: v.name })}</div></div><div class="key"><div>${T('miniPass', { svc: v.name })}</div></div>`
        : `<div class="key"><div>${T('keyPaste', { svc: v.name })}</div><b>${esc(uiLabel('Get key ↗', lang))}</b></div>`;
    return `<div class="mini" aria-hidden="true"><div class="cap">${T('miniSvc')}</div><div class="row">${SERVICES.map(x => tile(x.label, x.id === s.service)).join('')}</div>${fields}</div>`;
  }
  if (kind === 'pref') return `<div class="mini" aria-hidden="true"><div class="cap">${T('miniPref')}</div><div class="row">${['Fast', 'Balanced', 'Maximum'].map(l => tile(l, l === 'Balanced')).join('')}</div></div>`;
  return `<div class="mini" aria-hidden="true"><div class="cap">${T('miniGo')}</div><div class="cta">${esc(uiLabel('Install in ~30 seconds', lang))}</div></div>`;
}

function taskList(tasks) {
  return `<ul class="tasks">${tasks.map(([id, key, small, vars]) => {
    const on = !!s.ticks[id], dom = 'tk-' + id.replace(/\W/g, '-');
    const v = { url: CONFIGURATOR_URL, ...(vars || {}) };
    return `<li class="task${on ? ' done' : ''}"><input type="checkbox" id="${dom}" data-tick="${id}"${on ? ' checked' : ''}><label for="${dom}">${T(key, v)}${small ? `<small>${T(small, v)}</small>` : ''}</label></li>`;
  }).join('')}</ul>`;
}

const label = (n, titleHtml, ok) => `<div class="lbl"><span class="num">${T('step')} ${n}</span><em>${titleHtml}</em>${ok ? `<span class="ok">✓ ${T('done')}</span>` : ''}</div>`;

function render() {
  const blockedKey = s.app && s.service ? blocked(s) : null;
  const ready = s.device && s.app && s.service && !blockedKey;
  const dev = DEVICES.find(d => d.id === s.device);
  const app = APPS.find(a => a.id === s.app);
  const appN = s.app ? appName(lang, s.app) : '';
  let h = '';
  h += `<section class="sec" id="sec-device">${label(1, T('s1'), !!s.device)}<p class="why">${T('s1why')}</p>${tiles(deviceItems(), 'device')}</section>`;
  h += `<section class="sec${s.device ? '' : ' locked'}" id="sec-app"${s.device ? '' : ' aria-disabled="true"'}>${label(2, T('s2'), !!s.app)}<p class="why">${s.device ? T('s2why', { device: deviceName(lang, s.device), rec: APPS.find(a => a.id === dev.rec).name }) : T('s2lock')}</p>${tiles(appItems(), 'app', dev?.rec, !s.device)}
    ${app && app.id !== 'other' ? `<div class="note"><span class="i" aria-hidden="true">↓</span><span>${T('getApp', { app: app.name, where: t(lang, `a_${app.id}_g`) })}</span></div>` : ''}</section>`;
  h += `<section class="sec${s.app ? '' : ' locked'}" id="sec-service"${s.app ? '' : ' aria-disabled="true"'}>${label(3, T('s3'), !!s.service)}<p class="why">${T('s3why')}</p>${tiles(svcItems(), 'service', null, !s.app)}
    ${s.service === 'free' && !blockedKey ? `<div class="note"><span class="i" aria-hidden="true">i</span><span>${T('freeNote')}</span></div>` : ''}
    ${blockedKey ? `<div class="note warn" role="alert"><span class="i" aria-hidden="true">!</span><span>${T(blockedKey)}</span></div>` : ''}</section>`;
  let total = 3, done = [s.device, s.app, s.service].filter(Boolean).length;
  if (ready) {
    const { build, add } = plan(s);
    const buildIds = build.flatMap(g => g.tasks.map(x => x[0])), addIds = add.map(x => x[0]);
    h += `<section class="sec" id="sec-build">${label(4, T('s4'), buildIds.every(id => s.ticks[id]))}<p class="why">${T('s4why')}</p>${build.map(g => `<div class="group">${g.mini ? mini(g.mini) : ''}${taskList(g.tasks)}</div>`).join('')}
      <div class="note warn"><span class="i" aria-hidden="true">!</span><span>${T('manifestNote')}</span></div></section>`;
    h += `<section class="sec" id="sec-add">${label(5, T('s5', { app: appN }), addIds.every(id => s.ticks[id]))}<p class="why">${s.app === 'stremio' ? T('s5whyStremio') : T('s5why')}</p>${taskList(add)}</section>`;
    h += `<section class="sec" id="sec-test">${label(6, T('s6'), s.played === true)}<p class="why">${T('s6why')}</p>
      <div class="grid two"><button type="button" class="choice${s.played === true ? ' sel' : ''}" data-played="1"><b>${T('plays')}</b><span>${T('playsSub')}</span></button><button type="button" class="choice${s.played === false ? ' sel' : ''}" data-played="0"><b>${T('notQuite')}</b><span>${T('notQuiteSub')}</span></button></div>
      ${s.played === false ? `<div class="fixes">${FIXES.map(id => `<button type="button" class="choice${s.fix === id ? ' sel' : ''}" data-fix="${id}" aria-expanded="${s.fix === id}"><b>${T('f_' + id)}</b>${s.fix === id ? `<span>${T('f_' + id + '_x')}</span>` : ''}</button>`).join('')}</div>` : ''}
      ${s.played === true ? `<div class="done-card"><b>${T('doneTitle')}</b>${T('doneBody', { app: appN })}</div>` : ''}</section>`;
    total += buildIds.length + addIds.length + 1;
    done += [...buildIds, ...addIds].filter(id => s.ticks[id]).length + (s.played === true ? 1 : 0);
  } else {
    h += `<section class="sec locked" id="sec-locked" aria-disabled="true"><div class="lbl"><span class="num">${T('steps46')}</span><em>${T('lockedTitle')}</em></div><p class="why">${T('lockedWhy')}</p></section>`;
  }
  $('root').innerHTML = h;
  $('kicker').innerHTML = T('kicker');
  $('intro').innerHTML = T('intro');
  $('footKept').innerHTML = T('footKept');
  $('footDocs').innerHTML = T('footDocs');
  $('footOpen').innerHTML = T('footOpen');
  $('restart').textContent = t(lang, 'restart');
  const finished = ready && done === total;
  $('progTxt').textContent = finished ? t(lang, 'allDone') : t(lang, 'progress').replace('{done}', String(done)).replace('{total}', ready ? String(total) : '…');
  $('progBar').style.width = `${Math.round((ready ? done / total : done / 12) * 100)}%`;
  $('prog').setAttribute('aria-valuenow', String(done));
  $('prog').setAttribute('aria-valuemax', String(ready ? total : 12));
  document.documentElement.lang = lang;
  document.title = `${t(lang, 'title')} · Core Builds`;
  const cur = LANGS.find(l => l.id === lang);
  $('langCode').textContent = cur.short;
  $('langBtn').setAttribute('aria-label', `${t(lang, 'language')}: ${cur.label}`);
  $('langMenu').querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.lang === lang)));
}

// Language picker
$('langMenu').innerHTML = LANGS.map(l => `<button type="button" role="menuitemradio" aria-checked="false" data-lang="${l.id}" lang="${l.id}">${l.label}</button>`).join('');
const closeMenu = () => { $('langMenu').hidden = true; $('langBtn').setAttribute('aria-expanded', 'false'); };
$('langBtn').addEventListener('click', e => {
  e.stopPropagation();
  const open = $('langMenu').hidden;
  $('langMenu').hidden = !open;
  $('langBtn').setAttribute('aria-expanded', String(open));
  if (open) $('langMenu').querySelector('[aria-checked="true"]')?.focus();
});
$('langMenu').addEventListener('keydown', e => {
  const items = [...$('langMenu').querySelectorAll('[data-lang]')];
  const i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  else if (e.key === 'Escape') { closeMenu(); $('langBtn').focus(); }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.lang')) closeMenu();
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.lang) { lang = b.dataset.lang; store.set(LANG_KEY, lang); closeMenu(); $('langBtn').focus(); }
  else if (b.id === 'restart') { s = blank(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else if (b.dataset.set) {
    if (s[b.dataset.set] !== b.dataset.val) {
      s[b.dataset.set] = b.dataset.val;
      // A different answer means different steps: earlier ticks no longer describe them.
      s.ticks = {}; s.played = null; s.fix = null;
    }
  }
  else if (b.dataset.played) { s.played = b.dataset.played === '1'; s.fix = null; }
  else if (b.dataset.fix) { s.fix = s.fix === b.dataset.fix ? null : b.dataset.fix; }
  else return;
  const focusSel = b.dataset.set ? `[data-set="${b.dataset.set}"][data-val="${b.dataset.val}"]` : b.dataset.fix ? `[data-fix="${b.dataset.fix}"]` : b.dataset.played ? `[data-played="${b.dataset.played}"]` : null;
  save(); render();
  if (focusSel) document.querySelector(focusSel)?.focus();
});
document.addEventListener('change', e => {
  const k = e.target.dataset?.tick;
  if (!k) return;
  s.ticks[k] = e.target.checked;
  save(); render();
  document.getElementById(e.target.id)?.focus();
});
render();
