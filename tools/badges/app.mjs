import { BADGES, GROUPS, SAMPLE_RELEASES, THEMES, defaultBuilderState } from './catalog.mjs';
import {
  BADGE_BUILDER_VERSION,
  FORMATTER_FIELD_LIMIT,
  HANDOFF_KEY,
  badgeFileName,
  buildBadgePack,
  buildCompanionFormatter,
  catalogByGroup,
  formatterFileName,
  makeConfiguratorHandoff,
  matchingBadges,
  normalizeBuilderState,
  serialiseJson,
} from './core.mjs';

const STORAGE_KEY = 'cb-badge-builder-state-v1';
const CORS_PROXY = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev';
const groupCatalog = catalogByGroup();
const badgeById = new Map(BADGES.map((badge) => [badge.id, badge]));
const groupById = new Map(GROUPS.map((group) => [group.id, group]));
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let currentStep = 1;
let state = loadState();
let openGroups = new Set(GROUPS.filter((group) => group.essential).map((group) => group.id));
let toastTimer;

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed?.version === 1) return normalizeBuilderState({ ...parsed, allowEmpty:true });
  } catch {}
  return normalizeBuilderState(defaultBuilderState());
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function toast(message) {
  const node = $('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
}

function setStatus(message = '', tone = '') {
  const node = $('generationStatus');
  node.textContent = message;
  node.className = `generation-status${tone ? ` ${tone}` : ''}`;
}

function setStep(next) {
  const step = Number(next);
  if (![1,2,3].includes(step)) return;
  if (step === 3 && state.selectedIds.length === 0) {
    setStatus('Select at least one badge before previewing or exporting.', 'error');
    toast('Choose at least one badge');
    return;
  }
  if (step === 3) {
    try {
      buildOutputs();
    } catch (error) {
      setStatus(error.message, 'error');
      toast('The selected set could not be generated');
      return;
    }
  }
  currentStep = step;
  document.querySelectorAll('.builder-step').forEach((section) => { section.hidden = Number(section.dataset.step) !== step; });
  document.querySelectorAll('[data-step-target]').forEach((button) => {
    if (Number(button.dataset.stepTarget) === step) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  window.scrollTo({ top:Math.max(0, document.querySelector('.stepper').offsetTop - 18), behavior:'smooth' });
  if (step === 2) renderCatalog();
  if (step === 3) renderPreview();
}

function applySelectionControls() {
  document.querySelectorAll('[data-mode]').forEach((button) => button.setAttribute('aria-checked', String(button.dataset.mode === state.mode)));
  document.querySelectorAll('[data-theme-choice]').forEach((button) => button.setAttribute('aria-checked', String(button.dataset.themeChoice === state.theme)));
  $('formatterDescription').textContent = state.mode === 'enhanced'
    ? 'Carries invisible exact markers plus a clean visible AIOStreams layout.'
    : 'Optional clean AIOStreams layout. Universal badge matching does not require it.';
}

function selectedSet() { return new Set(state.selectedIds); }

function visualFor(groupId) {
  const theme = THEMES[state.theme] || THEMES.neon;
  const hex = state.groupColors[groupId] || groupById.get(groupId)?.color || '#00D4FF';
  if (theme.tagColor) return { background:argbToCss(theme.tagColor), border:argbToCss(theme.borderColor) };
  return { background:argbToCss(`#${theme.tagAlpha}${hex.slice(1)}`), border:argbToCss(`#${theme.borderAlpha}${hex.slice(1)}`) };
}

function argbToCss(value) {
  const hex = String(value || '').replace('#','');
  if (hex.length === 8) {
    const a = parseInt(hex.slice(0,2),16) / 255;
    const r = parseInt(hex.slice(2,4),16);
    const g = parseInt(hex.slice(4,6),16);
    const b = parseInt(hex.slice(6,8),16);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return /^([0-9a-f]{6})$/i.test(hex) ? `#${hex}` : 'transparent';
}

function imageChip(badge) {
  const visual = visualFor(badge.groupId);
  return `<span class="image-chip" style="background:${visual.background};border-color:${visual.border}"><img src="./assets/${encodeURIComponent(badge.asset)}" alt="${escapeHtml(badge.name)}" loading="lazy"></span>`;
}

/* Category colour is Nuvio tag chrome, not the badge artwork.
 * Two things confused a tester and are now said out loud in the UI:
 *  - mono and contrast define a fixed tagColor, so the picker is disabled on
 *    them; previously it just went grey with no reason given.
 *  - even on Core Neon the colour sets tagColor/borderColor on the Nuvio
 *    filter. The badge image is a pre-rendered PNG and never changes colour,
 *    and AIOStreams renders only that image, so the colour is invisible there.
 */
function colorHint(theme) {
  return theme === 'neon'
    ? 'Tints the Nuvio tag and border. The badge image does not change colour, and AIOStreams shows only the image.'
    : 'This theme uses a fixed palette, so per-category colour is off. Switch to Core Neon to choose your own.';
}

function renderCatalog() {
  const selected = selectedSet();
  const root = $('catalog');
  const groups = state.groupOrder.map((id) => groupCatalog.find((entry) => entry.id === id)).filter(Boolean);
  root.innerHTML = groups.map((group, groupIndex) => {
    const orderedBadges = state.badgeOrder.map((id) => badgeById.get(id)).filter((badge) => badge?.groupId === group.id);
    const enabledCount = orderedBadges.filter((badge) => selected.has(badge.id)).length;
    const isOpen = openGroups.has(group.id);
    return `<article class="group-card" data-group-card="${group.id}">
      <div class="group-head">
        <input class="group-master" type="checkbox" data-group-master="${group.id}" aria-label="Toggle all ${escapeHtml(group.name)} badges" ${enabledCount === orderedBadges.length ? 'checked' : ''}>
        <button class="group-toggle" type="button" data-group-toggle="${group.id}" aria-expanded="${isOpen}">
          <strong>${escapeHtml(group.name)} ${group.essential ? '<span class="choice-kicker" style="display:inline;margin-left:6px">Essential</span>' : ''}</strong>
          <small>${escapeHtml(group.description)}</small>
        </button>
        <div class="order-buttons" aria-label="Move ${escapeHtml(group.name)}">
          <button type="button" data-group-move="up" data-group-id="${group.id}" aria-label="Move ${escapeHtml(group.name)} up" ${groupIndex === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-group-move="down" data-group-id="${group.id}" aria-label="Move ${escapeHtml(group.name)} down" ${groupIndex === groups.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
        <div class="group-meta">
          <span class="group-count">${enabledCount}/${orderedBadges.length} on</span>
          <label class="color-wrap" title="${escapeHtml(colorHint(state.theme))}"><span>Color</span><input class="group-color" type="color" data-group-color="${group.id}" value="${escapeHtml(state.groupColors[group.id])}" aria-label="${escapeHtml(group.name)} color — ${escapeHtml(colorHint(state.theme))}" ${state.theme === 'neon' ? '' : 'disabled'}></label>
          <span class="group-chevron" aria-hidden="true">${isOpen ? '−' : '+'}</span>
        </div>
      </div>
      <div class="group-body" ${isOpen ? '' : 'hidden'}>
        ${orderedBadges.map((badge, badgeIndex) => `<div class="badge-row">
          <input type="checkbox" data-badge-toggle="${badge.id}" aria-label="Use ${escapeHtml(badge.name)}" ${selected.has(badge.id) ? 'checked' : ''}>
          <span class="badge-name">${escapeHtml(badge.name)}</span>
          <span class="badge-swatch">${imageChip(badge)}</span>
          <span class="badge-order">
            <button type="button" data-badge-move="up" data-badge-id="${badge.id}" aria-label="Move ${escapeHtml(badge.name)} up" ${badgeIndex === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" data-badge-move="down" data-badge-id="${badge.id}" aria-label="Move ${escapeHtml(badge.name)} down" ${badgeIndex === orderedBadges.length - 1 ? 'disabled' : ''}>↓</button>
          </span>
        </div>`).join('')}
      </div>
    </article>`;
  }).join('');

  root.querySelectorAll('[data-group-master]').forEach((input) => {
    const badges = BADGES.filter((badge) => badge.groupId === input.dataset.groupMaster);
    const count = badges.filter((badge) => selected.has(badge.id)).length;
    input.indeterminate = count > 0 && count < badges.length;
  });
  $('selectedCount').textContent = `${state.selectedIds.length} badge${state.selectedIds.length === 1 ? '' : 's'} selected`;
  const advanced = state.selectedIds.filter((id) => !groupById.get(badgeById.get(id)?.groupId)?.essential).length;
  $('selectedHint').textContent = advanced ? `${advanced} optional advanced badges enabled` : 'Essentials are on';
  renderPreview();
}

function toggleGroup(groupId) {
  const ids = BADGES.filter((badge) => badge.groupId === groupId).map((badge) => badge.id);
  const selected = selectedSet();
  const all = ids.every((id) => selected.has(id));
  ids.forEach((id) => all ? selected.delete(id) : selected.add(id));
  state.selectedIds = state.badgeOrder.filter((id) => selected.has(id));
  saveState(); renderCatalog();
}

function moveInOrder(kind, id, direction) {
  const order = kind === 'group' ? state.groupOrder : state.badgeOrder;
  const index = order.indexOf(id);
  if (index < 0) return;
  let target = index + (direction === 'up' ? -1 : 1);
  if (kind === 'badge') {
    const groupId = badgeById.get(id)?.groupId;
    while (target >= 0 && target < order.length && badgeById.get(order[target])?.groupId !== groupId) target += direction === 'up' ? -1 : 1;
  }
  if (target < 0 || target >= order.length) return;
  [order[index],order[target]] = [order[target],order[index]];
  saveState(); renderCatalog();
}

function renderSamples() {
  $('samplePresets').innerHTML = SAMPLE_RELEASES.map((sample) => `<button type="button" data-sample="${sample.id}">${escapeHtml(sample.label)}</button>`).join('');
}

function renderPreview() {
  const root = $('badgePreview');
  if (!root) return;
  const matches = new Set(matchingBadges(state.sample, state.selectedIds, state.badgeOrder).map((badge) => badge.id));
  const ordered = [];
  for (const groupId of state.groupOrder) {
    for (const id of state.badgeOrder) {
      const badge = badgeById.get(id);
      if (badge?.groupId === groupId && matches.has(id)) ordered.push(badge);
    }
  }
  root.innerHTML = ordered.map(imageChip).join('');
  $('previewEmpty').hidden = ordered.length > 0;
  if ($('sampleInput') && $('sampleInput').value !== state.sample) $('sampleInput').value = state.sample;
  updateBuildDetails();
}

function buildOutputs() {
  const pack = buildBadgePack(state);
  const formatter = buildCompanionFormatter(state);
  return { pack, formatter };
}

function updateBuildDetails() {
  const details = $('buildDetails');
  if (!details || state.selectedIds.length === 0) return;
  try {
    const { pack, formatter } = buildOutputs();
    const jsonBytes = new TextEncoder().encode(serialiseJson(pack)).byteLength;
    const values = [
      ['Mode', state.mode === 'enhanced' ? 'AIO Enhanced' : 'Universal'],
      ['Badge theme', THEMES[state.theme].name],
      ['Selected badges', String(pack.filters.length)],
      ['Active groups', String(pack.groups.length)],
      ['Badge JSON', `${(jsonBytes / 1024).toFixed(1)} KB`],
      ['Formatter fields', `${formatter.name.length} / ${formatter.description.length} chars`],
      ['Safety limit', `${FORMATTER_FIELD_LIMIT} chars per field`],
      ['Builder version', BADGE_BUILDER_VERSION],
    ];
    details.innerHTML = values.map(([key,value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
    setStatus(`${pack.filters.length} badges ready · ${state.mode === 'enhanced' ? 'companion markers fit safely' : 'universal matching enabled'}`, 'good');
  } catch (error) {
    details.innerHTML = '';
    setStatus(error.message, 'error');
  }
}

function downloadText(text, name, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function downloadBadges() {
  const { pack } = buildOutputs();
  downloadText(serialiseJson(pack), badgeFileName(state));
  toast('Badge JSON downloaded');
}

function downloadFormatter() {
  const { formatter } = buildOutputs();
  downloadText(serialiseJson(formatter), formatterFileName(state));
  toast('Formatter JSON downloaded');
}

async function fetchWithTimeout(url, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal:controller.signal }); }
  finally { clearTimeout(timer); }
}

async function verifyReadable(url, attempts = 4) {
  let delay = 250;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetchWithTimeout(url, { method:'GET' }, 1600);
      if (response.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(Math.round(delay * 1.6), 1200);
  }
  return false;
}

async function uploadJson(json) {
  try {
    const response = await fetchWithTimeout(`${CORS_PROXY}/paste`, {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body:json,
    }, 6000);
    if (response.ok) {
      const data = await response.json();
      if (data.url && await verifyReadable(data.url)) return { url:data.url, provider:'Core Builds Worker', expiry:'30 days' };
    }
  } catch {}
  try {
    const response = await fetchWithTimeout('https://paste.rs/', {
      method:'POST', headers:{ 'Content-Type':'text/plain' }, body:json,
    }, 6000);
    if (response.ok) {
      const url = (await response.text()).trim();
      if (/^https:\/\//i.test(url)) return { url, provider:'paste.rs fallback', expiry:'provider-managed' };
    }
  } catch {}
  try {
    const response = await fetchWithTimeout('https://dpaste.com/api/v2/', {
      method:'POST', body:new URLSearchParams({ content:json, syntax:'json', expiry_days:'365' }),
    }, 6000);
    if (response.ok) {
      const raw = (await response.text()).trim().replace(/"/g,'');
      if (/^https:\/\//i.test(raw)) return { url:`${raw}.txt`, provider:'dpaste fallback', expiry:'up to 365 days' };
    }
  } catch {}
  return null;
}

async function createImportUrl() {
  const button = $('createImportUrl');
  let outputs;
  try { outputs = buildOutputs(); }
  catch (error) { setStatus(error.message,'error'); return; }

  // The local backup is deliberately created before any network request. Even when every
  // paste provider is blocked or down, the user leaves with the complete badge pack.
  downloadText(serialiseJson(outputs.pack), badgeFileName(state));
  button.disabled = true;
  const previous = button.textContent;
  button.textContent = 'Creating secure import URL…';
  $('importResult').hidden = true;
  setStatus('Backup downloaded. Creating a temporary import URL…');
  try {
    const result = await uploadJson(serialiseJson(outputs.pack));
    if (!result) throw new Error('Every import-link provider was unavailable. Your downloaded JSON backup is safe; try again later or host it as a raw GitHub/Gist file.');
    $('importUrl').value = result.url;
    $('importProvider').textContent = result.provider;
    const enhancedReminder = state.mode === 'enhanced' ? ' AIO Enhanced also requires the companion formatter—download it or use Open in Core Configurator before testing badges.' : '';
    $('importExpiry').textContent = `This URL is expected to remain available for ${result.expiry}. Nuvio stores the rules when you import them, so installed badges keep working after expiry. Keep the downloaded JSON for future changes or re-imports.${enhancedReminder}`;
    $('importResult').hidden = false;
    setStatus('Import URL ready. Copy it into Nuvio’s Fusion badge URLs setting.', 'good');
    try { await navigator.clipboard.writeText(result.url); toast('Import URL copied'); } catch { toast('Import URL ready'); }
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = previous;
  }
}

async function copyImportUrl() {
  const input = $('importUrl');
  if (!input.value) return;
  try { await navigator.clipboard.writeText(input.value); toast('Import URL copied'); }
  catch { input.focus(); input.select(); toast('URL selected for manual copy'); }
}

function openConfigurator() {
  try {
    const { formatter } = buildOutputs();
    const handoff = makeConfiguratorHandoff(formatter);
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
    saveState();
    window.location.href = '../../#advanced';
  } catch (error) {
    setStatus(`Could not prepare Configurator handoff: ${error.message}`, 'error');
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('themeToggle').textContent = theme === 'dark' ? '☀ Light' : '🌙 Dark';
  try { localStorage.setItem('cbTheme', theme); } catch {}
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.nextStep) return setStep(button.dataset.nextStep);
    if (button.dataset.stepTarget) return setStep(button.dataset.stepTarget);
    if (button.dataset.mode) {
      state.mode = button.dataset.mode;
      saveState(); applySelectionControls(); updateBuildDetails();
      return;
    }
    if (button.dataset.themeChoice) {
      state.theme = button.dataset.themeChoice;
      saveState(); applySelectionControls(); renderCatalog();
      return;
    }
    if (button.dataset.groupToggle) {
      const id = button.dataset.groupToggle;
      openGroups.has(id) ? openGroups.delete(id) : openGroups.add(id);
      renderCatalog(); return;
    }
    if (button.dataset.groupMove) return moveInOrder('group', button.dataset.groupId, button.dataset.groupMove);
    if (button.dataset.badgeMove) return moveInOrder('badge', button.dataset.badgeId, button.dataset.badgeMove);
    if (button.dataset.sample) {
      const sample = SAMPLE_RELEASES.find((item) => item.id === button.dataset.sample);
      if (sample) { state.sample = sample.text; saveState(); renderPreview(); }
      return;
    }
    if (button.dataset.catalogAction) {
      if (button.dataset.catalogAction === 'all') state.selectedIds = [...state.badgeOrder];
      if (button.dataset.catalogAction === 'none') state.selectedIds = [];
      if (button.dataset.catalogAction === 'essentials') {
        const essentialGroups = new Set(GROUPS.filter((group) => group.essential).map((group) => group.id));
        state.selectedIds = state.badgeOrder.filter((id) => essentialGroups.has(badgeById.get(id)?.groupId));
      }
      saveState(); renderCatalog(); return;
    }
  });

  $('catalog').addEventListener('change', (event) => {
    const target = event.target;
    if (target.dataset.groupMaster) return toggleGroup(target.dataset.groupMaster);
    if (target.dataset.badgeToggle) {
      const selected = selectedSet();
      target.checked ? selected.add(target.dataset.badgeToggle) : selected.delete(target.dataset.badgeToggle);
      state.selectedIds = state.badgeOrder.filter((id) => selected.has(id));
      saveState(); renderCatalog(); return;
    }
    if (target.dataset.groupColor) {
      state.groupColors[target.dataset.groupColor] = target.value.toUpperCase();
      saveState(); renderCatalog();
    }
  });

  $('sampleInput').addEventListener('input', (event) => {
    state.sample = event.target.value.slice(0,2000);
    saveState(); renderPreview();
  });
  $('downloadBadges').addEventListener('click', () => { try { downloadBadges(); } catch (error) { setStatus(error.message,'error'); } });
  $('downloadFormatter').addEventListener('click', () => { try { downloadFormatter(); } catch (error) { setStatus(error.message,'error'); } });
  $('createImportUrl').addEventListener('click', createImportUrl);
  $('copyImportUrl').addEventListener('click', copyImportUrl);
  $('openConfigurator').addEventListener('click', openConfigurator);
  $('resetBuilder').addEventListener('click', () => {
    if (!confirm('Reset every badge choice and color?')) return;
    state = normalizeBuilderState(defaultBuilderState());
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    openGroups = new Set(GROUPS.filter((group) => group.essential).map((group) => group.id));
    applySelectionControls(); renderCatalog(); setStep(1); toast('Badge Builder reset');
  });
  $('themeToggle').addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
}

function init() {
  let uiTheme = 'dark';
  try { uiTheme = localStorage.getItem('cbTheme') || (matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark'); } catch {}
  setTheme(uiTheme === 'light' ? 'light' : 'dark');
  $('sampleInput').value = state.sample;
  renderSamples();
  applySelectionControls();
  renderCatalog();
  bindEvents();
  setStep(1);
}

init();
