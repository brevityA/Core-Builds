import { toTickerText, parseFeed } from '/lib/parser.mjs';
import { LEAGUES, compareEvents, buildDemoSlate, mergeEvents } from '/lib/scoreboard.mjs';
import { buildClientSlate, isNativeShell } from '/lib/client-slate.mjs';
import { loadState, saveState, cacheSlate, readCachedSlate } from './state.js';
import { initTvNav } from './tv.js';

const params = new URLSearchParams(location.search);
if (params.get('native') === '1') globalThis.CORELINE_NATIVE = true;
if (params.get('tv') === '1') globalThis.CORELINE_TV = true;

const SAMPLE_FEED = { url: `${location.origin}/feeds/sample-sports.xml`, label: 'Sample' };
const LEAGUE_ORDER = ['ALL', 'LIVE', 'RSS', ...Object.values(LEAGUES).map((l) => l.label)];

const $ = (id) => document.getElementById(id);

const state = loadState();
let events = [];
let wakeLock = null;
let clockTimer = null;
let refreshGen = 0;
let pairTimer = null;

init();

async function init() {
  document.documentElement.toggleAttribute('data-tv', Boolean(globalThis.CORELINE_TV));
  applyChrome();
  bind();
  initTvNav(document.getElementById('app'));
  tickClock();
  clockTimer = setInterval(tickClock, 1000);
  const cached = readCachedSlate();
  if (cached?.events?.length) {
    events = cached.events;
  } else {
    events = buildDemoSlate();
  }
  render();
  await refresh();
  setInterval(refresh, 60_000);
  if ('serviceWorker' in navigator && !isNativeShell()) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function bind() {
  document.body.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'settings') openDrawer(true);
    if (action === 'close-settings') openDrawer(false);
    if (action === 'refresh') refresh(true);
    if (action === 'mode') toggleMode();
    if (action === 'add-feed') addFeed();
    if (action === 'pair-start') startPair();
    if (action === 'pair-stop') stopPair();
    if (action === 'remove-feed') {
      state.feeds = state.feeds.filter((f) => f.url !== btn.dataset.url);
      persist();
      renderFeeds();
      refresh();
    }
    if (action === 'filter') {
      state.leagueFilter = btn.dataset.league;
      persist();
      render();
    }
  });

  $('sampleFeed').addEventListener('change', () => {
    state.sampleFeed = $('sampleFeed').checked;
    persist();
    refresh();
  });
  $('speed').addEventListener('input', () => {
    state.speed = Number($('speed').value);
    document.documentElement.style.setProperty('--crawl-s', `${state.speed}s`);
    persist();
  });
  $('favorites').addEventListener('change', () => {
    state.favorites = $('favorites').value;
    persist();
    render();
  });
  $('showFinals').addEventListener('change', () => {
    state.showFinals = $('showFinals').checked;
    persist();
    render();
  });
  $('wakeLock').addEventListener('change', () => {
    state.wakeLock = $('wakeLock').checked;
    persist();
    syncWakeLock();
  });
  $('theme').addEventListener('change', () => {
    state.theme = $('theme').value;
    persist();
    applyChrome();
  });
  $('clockFmt').addEventListener('change', () => {
    state.clockFmt = $('clockFmt').value;
    persist();
    tickClock();
  });

  window.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea, select')) return;
    const key = event.key.toLowerCase();
    if (key === 's') openDrawer(true);
    if (key === 't') toggleMode();
    if (key === 'r') refresh(true);
    if (key === 'f') document.documentElement.requestFullscreen?.().catch(() => {});
  });

  $('drawer').addEventListener('click', (event) => {
    if (event.target.id === 'drawer') openDrawer(false);
  });
}

function applyChrome() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.mode = state.mode;
  document.documentElement.style.setProperty('--crawl-s', `${state.speed}s`);
  $('sampleFeed').checked = state.sampleFeed;
  $('speed').value = state.speed;
  $('favorites').value = state.favorites;
  $('showFinals').checked = state.showFinals;
  $('wakeLock').checked = state.wakeLock;
  $('theme').value = state.theme;
  $('clockFmt').value = state.clockFmt;
  renderLeagueToggles();
  renderFeeds();
  if ($('pairBox')) $('pairBox').hidden = !isNativeShell();
  syncWakeLock();
}

function persist() {
  saveState(state);
}

function openDrawer(open) {
  $('drawer').hidden = !open;
  if (open && !globalThis.CORELINE_TV) $('feedUrl').focus();
  if (!open) stopPair();
}

function toggleMode() {
  state.mode = state.mode === 'crawl' ? 'board' : 'crawl';
  persist();
  applyChrome();
}

function addFeed(rawUrl, rawLabel) {
  const url = (rawUrl ?? $('feedUrl').value).trim();
  const label = (rawLabel ?? $('feedLabel').value).trim() || 'RSS';
  if (!url) return toast('Paste a feed URL first');
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad');
    if (state.feeds.some((f) => f.url === parsed.href)) return toast('Already added');
    state.feeds.push({ url: parsed.href, label });
    if (!rawUrl) {
      $('feedUrl').value = '';
      $('feedLabel').value = '';
    }
    persist();
    renderFeeds();
    refresh(true);
    toast(`Added ${label}`);
  } catch {
    toast('Need a full http(s) URL');
  }
}

function nativeBridge() {
  return globalThis.CoreLineNative || null;
}

function startPair() {
  const bridge = nativeBridge();
  if (!bridge?.startPair) {
    toast('Pairing is in the Android app — same Wi-Fi as the TV');
    return;
  }
  let info;
  try {
    info = JSON.parse(bridge.startPair());
  } catch {
    toast('Could not start pairing');
    return;
  }
  if (!info.ok || !info.url) {
    toast(info.error || 'No Wi-Fi address yet');
    return;
  }
  $('pairCard').hidden = false;
  $('pairUrl').textContent = info.url;
  $('pairCode').textContent = info.code || '';
  const qr = $('pairQr');
  qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(info.url)}`;
  qr.onerror = () => { qr.style.display = 'none'; };
  clearInterval(pairTimer);
  pairTimer = setInterval(pollPairInbox, 1000);
}

function stopPair() {
  clearInterval(pairTimer);
  pairTimer = null;
  try { nativeBridge()?.stopPair?.(); } catch { /* ignore */ }
  if ($('pairCard')) $('pairCard').hidden = true;
}

function pollPairInbox() {
  const bridge = nativeBridge();
  if (!bridge?.takeInbox) return;
  let payload = '';
  try { payload = bridge.takeInbox() || ''; } catch { return; }
  if (!payload) return;
  try {
    const feed = JSON.parse(payload);
    if (feed.url) {
      addFeed(feed.url, feed.label);
      stopPair();
    }
  } catch { /* ignore malformed */ }
}

function renderFeeds() {
  $('feedList').innerHTML = state.feeds.map((feed) => `
    <li>
      <div><b>${esc(feed.label)}</b><span>${esc(feed.url)}</span></div>
      <button class="ghost focusable" data-action="remove-feed" data-url="${esc(feed.url)}">Remove</button>
    </li>
  `).join('') || '<li class="hint">No custom feeds yet — add one above or keep the sample on.</li>';
}

function renderLeagueToggles() {
  $('leagueToggles').innerHTML = Object.values(LEAGUES).map((league) => `
    <label class="check">
      <input class="focusable" type="checkbox" data-league-id="${league.id}" ${state.leagues.includes(league.id) ? 'checked' : ''}>
      <span>${league.label}</span>
    </label>
  `).join('');
  $('leagueToggles').querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.dataset.leagueId;
      state.leagues = input.checked
        ? [...new Set([...state.leagues, id])]
        : state.leagues.filter((x) => x !== id);
      persist();
      refresh();
    });
  });
}

async function refresh(manual = false) {
  if (manual) toast('Refreshing slate…');
  try {
    const feeds = [
      ...state.feeds,
      ...(state.sampleFeed ? [SAMPLE_FEED] : []),
    ];
    const data = isNativeShell()
      ? await buildClientSlate({ leagues: state.leagues, feeds })
      : await fetchSlateFromServer(state.leagues, feeds);
    events = data.events || [];
    cacheSlate(data);
    $('brandSub').textContent = data.demo
      ? 'Demo slate · live scoreboards unreachable'
      : `Updated ${new Date(data.generatedAt || Date.now()).toLocaleTimeString()}`;
    render();
    if (manual) toast(data.demo ? 'Showing demo slate' : `Loaded ${events.length} listings`);
  } catch (err) {
    const cached = readCachedSlate();
    if (cached?.events?.length) {
      events = cached.events;
      render();
      toast('Could not refresh — showing last slate');
    } else {
      events = await localFallback();
      render();
      toast('Offline slate');
    }
    console.warn(err);
  }
}

async function fetchSlateFromServer(leagues, feeds) {
  const query = new URLSearchParams({
    leagues: leagues.join(','),
    feeds: feeds.map((f) => `${encodeURIComponent(f.url)}|${encodeURIComponent(f.label)}`).join(','),
  });
  const res = await fetch(`/api/slate?${query}`);
  if (!res.ok) throw new Error(`slate ${res.status}`);
  return res.json();
}

async function localFallback() {
  let rss = [];
  try {
    const xml = await fetch('./feeds/sample-sports.xml').then((r) => r.text());
    rss = parseFeed(xml, { source: 'rss', label: 'Sample' });
  } catch { /* ignore */ }
  return mergeEvents([buildDemoSlate(), rss]);
}

function visibleEvents() {
  const favs = state.favorites.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  return events
    .filter((ev) => state.showFinals || ev.status !== 'final')
    .filter((ev) => matchesFilter(ev, state.leagueFilter))
    .sort((a, b) => {
      const af = isFav(a, favs) ? 0 : 1;
      const bf = isFav(b, favs) ? 0 : 1;
      if (af !== bf) return af - bf;
      return compareEvents(a, b);
    });
}

function matchesFilter(ev, filter) {
  if (!filter || filter === 'ALL') return true;
  if (filter === 'LIVE') return ev.status === 'live';
  if (filter === 'RSS') return ev.source === 'rss';
  return ev.league === filter;
}

function isFav(ev, favs) {
  if (!favs.length) return false;
  const bag = [ev.home?.abbr, ev.away?.abbr, ev.home?.name, ev.away?.name].filter(Boolean).map((s) => String(s).toUpperCase());
  return favs.some((f) => bag.some((b) => b.includes(f)));
}

function render() {
  const list = visibleEvents();
  const live = events.filter((e) => e.status === 'live').length;
  const up = events.filter((e) => e.status === 'upcoming').length;
  const rss = events.filter((e) => e.source === 'rss').length;
  $('statLive').textContent = live;
  $('statUp').textContent = up;
  $('statRss').textContent = rss;
  $('chyron').classList.toggle('is-live', live > 0);
  $('bugLive').textContent = live ? `${live} LIVE` : 'LINE';

  renderFilters();
  renderHero(list);
  renderGrid(list);
  renderCrawl(list);
  const next = list.find((e) => e.status === 'live') || list.find((e) => e.status === 'upcoming');
  if ($('bigNext') && next) {
    $('bigNext').textContent = toTickerText(next);
  }
  $('empty').hidden = list.length > 0;
  $('grid').hidden = list.length === 0;
}

function renderFilters() {
  const counts = { ALL: events.length, LIVE: events.filter((e) => e.status === 'live').length, RSS: events.filter((e) => e.source === 'rss').length };
  for (const label of Object.values(LEAGUES).map((l) => l.label)) {
    counts[label] = events.filter((e) => e.league === label).length;
  }
  $('leagues').innerHTML = LEAGUE_ORDER
    .filter((label) => label === 'ALL' || counts[label])
    .map((label) => `
      <button class="league-chip focusable" data-action="filter" data-league="${label}" aria-pressed="${state.leagueFilter === label}">
        ${label}${label === 'ALL' ? '' : ` ${counts[label] || ''}`}
      </button>
    `).join('');
}

function renderHero(list) {
  const featured = list.find((e) => e.status === 'live' && e.away && e.home);
  const hero = $('hero');
  if (!featured) {
    hero.hidden = true;
    hero.innerHTML = '';
    return;
  }
  hero.hidden = false;
  hero.innerHTML = `
    <article class="hero-card focusable" tabindex="0">
      <div>
        <div class="hero-meta">
          <span class="badge live">LIVE</span>
          <span>${esc(featured.league)}</span>
          <span>${esc(featured.detail || '')}</span>
        </div>
        <div class="teams">
          ${teamLine(featured.away, featured)}
          ${teamLine(featured.home, featured)}
        </div>
      </div>
      <div class="hero-side">
        <div class="pills">${(featured.channels || []).map((c) => `<span class="pill">${esc(c)}</span>`).join('')}</div>
        <div class="when">${esc(featured.venue || featured.feed || '')}</div>
      </div>
    </article>
  `;
}

function teamLine(team, event) {
  const win = event.status === 'final' && team.winner;
  return `
    <div class="team-row">
      <div class="abbr">${esc(team.abbr || '—')}</div>
      <div class="team-name">${esc(team.name || '')}</div>
      <div class="score ${win ? 'win' : ''}">${team.score ?? ''}</div>
    </div>
  `;
}

function renderGrid(list) {
  const cards = list.filter((e) => e.away && e.home);
  const headlines = list.filter((e) => !(e.away && e.home));
  $('grid').innerHTML = [
    ...cards.map(gameCard),
    ...headlines.map(headlineCard),
  ].join('');
}

function gameCard(ev) {
  const badge = ev.status === 'live' ? 'live' : ev.status === 'final' ? 'final' : 'upcoming';
  const label = ev.status === 'live' ? (ev.detail || 'LIVE') : ev.status === 'final' ? 'FINAL' : (ev.detail || 'UP');
  return `
    <article class="game focusable" tabindex="0">
      <div class="game-top">
        <span class="league-tag">${esc(ev.league || ev.feed || 'RSS')}</span>
        <span class="badge ${badge}">${esc(label)}</span>
      </div>
      <div class="game-teams">
        <div class="gt ${ev.away?.winner ? 'win' : ''}"><span class="who">${esc(ev.away.abbr)}</span><span class="sc">${ev.away.score ?? ''}</span></div>
        <div class="gt ${ev.home?.winner ? 'win' : ''}"><span class="who">${esc(ev.home.abbr)}</span><span class="sc">${ev.home.score ?? ''}</span></div>
      </div>
      <div class="game-foot">
        <div class="channels">${(ev.channels || []).map((c) => `<span class="ch">${esc(c)}</span>`).join('') || '<span class="when">No channel listed</span>'}</div>
      </div>
    </article>
  `;
}

function headlineCard(ev) {
  return `
    <article class="game focusable" tabindex="0">
      <div class="game-top">
        <span class="league-tag">${esc(ev.league || ev.feed || 'RSS')}</span>
        <span class="badge ${ev.status}">${esc(ev.status.toUpperCase())}</span>
      </div>
      <div class="gt"><span class="who">${esc(ev.headline || ev.rawTitle || 'Listing')}</span></div>
      <div class="channels">${(ev.channels || []).map((c) => `<span class="ch">${esc(c)}</span>`).join('')}</div>
    </article>
  `;
}

function renderCrawl(list) {
  const html = (list.length ? list : [{ headline: 'Add an RSS feed in settings — Team vs Team · ESPN, TSN4, SN 3', channels: [], status: 'upcoming' }])
    .map((ev) => {
      const text = toTickerText(ev);
      const kind = ev.status === 'live' ? 'LIVE' : ev.status === 'final' ? 'FINAL' : 'UP';
      const klass = ev.status === 'live' ? 'k' : ev.status === 'final' ? 'k final' : 'k up';
      const channels = (ev.channels || []).join('  ');
      const body = ev.away && ev.home
        ? `${esc(ev.away.abbr)}${ev.status !== 'upcoming' && ev.away.score != null ? ` ${esc(ev.away.score)}-${esc(ev.home.score)} ` : ' vs '}${esc(ev.home.abbr)}`
        : esc(ev.headline || ev.rawTitle || text);
      return `<span class="tick"><span class="${klass}">${kind}</span> ${body}${channels ? ` <span class="chs">${esc(channels)}</span>` : ''}</span>`;
    })
    .join('');
  $('crawlA').innerHTML = html;
  $('crawlB').innerHTML = html;
}

function tickClock() {
  const now = new Date();
  const opts = state.clockFmt === '24'
    ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
    : { hour: 'numeric', minute: '2-digit' };
  $('clock').textContent = now.toLocaleTimeString([], opts);
  if ($('bigTime')) {
    $('bigTime').textContent = now.toLocaleTimeString([], { ...opts, second: undefined });
    $('bigDate').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }
}

async function syncWakeLock() {
  try { nativeBridge()?.setKeepAwake?.(Boolean(state.wakeLock)); } catch { /* no native bridge */ }
  try {
    if (state.wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
    } else {
      await wakeLock?.release();
      wakeLock = null;
    }
  } catch { /* unsupported / denied */ }
}

function toast(message) {
  const el = $('toast');
  el.hidden = false;
  el.textContent = message;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
