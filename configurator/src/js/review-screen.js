import { HOST_BASE_URLS, HOST_LABEL_MAP, HOST_META } from '../data/hosts.js';
import { HOST_CAPABILITY_OVERRIDES } from '../data/host-capabilities.js';

const TEMPLATES = [
  { id: 'stable', name: 'Core Stable 1080p', title: 'Reliable baseline', description: 'Fewest surprises. Strong quality filtering and predictable results.', recommended: true },
  { id: 'essential', name: 'Core Essential', title: 'Broad coverage', description: 'More sources while retaining sensible filtering.' },
  { id: 'speed', name: 'Core Speed', title: 'Fast startup', description: 'Optimised for quicker startup and lower overhead.' },
  { id: 'anime', name: 'Core Anime', title: 'Anime-focused', description: 'Tuned filtering and formatting for anime releases.' },
];

let selectedHost = 'elfhosted';
let selectedTemplate = 'stable';
let installState = 'idle';
let overlay;

function status(hostId) {
  const capability = HOST_CAPABILITY_OVERRIDES[hostId];
  if (capability.regexAccess === 'none' || capability.blockedStreamTypes.length) return 'warn';
  if (capability.requiresProbe) return 'probe';
  return 'ok';
}

function statusLabel(hostId) {
  const state = status(hostId);
  return state === 'warn' ? 'Limited configuration' : state === 'probe' ? 'Requires probe' : 'Fully compatible';
}

function hostCard(hostId) {
  const host = HOST_CAPABILITY_OVERRIDES[hostId];
  const state = status(hostId);
  return `
    <button class="cb-review-host ${hostId === selectedHost ? 'is-selected' : ''}" data-host="${hostId}">
      <strong>${HOST_LABEL_MAP[hostId] || host.label}</strong>
      <small>AIOStreams ${HOST_META[hostId]?.aiostreamsVersion || ''}</small>
      <span class="cb-review-tag cb-review-${state}">${statusLabel(hostId)}</span>
    </button>`;
}

function compatibilityPanel() {
  const capability = HOST_CAPABILITY_OVERRIDES[selectedHost];
  const changes = [];
  if (capability.disabledPresetIds.length) {
    changes.push(`Remove unavailable sources: ${capability.disabledPresetIds.join(', ')}`);
  }
  if (capability.regexAccess === 'none') changes.push('Use the host-approved regex source');
  if (capability.blockedStreamTypes.length) {
    changes.push(`Avoid blocked stream types: ${capability.blockedStreamTypes.join(', ')}`);
  }
  if (!changes.length) changes.push('No compatibility substitutions are required');

  const impact = capability.regexAccess === 'none'
    ? 'fewer sources and less fine-grained filtering.'
    : 'full template functionality is available.';

  return `
    <div class="cb-review-compat">
      <h3>⚠️ ${HOST_LABEL_MAP[selectedHost]} — ${statusLabel(selectedHost)}</h3>
      <p>${capability.reasons?.preset || capability.reasons?.regex || 'This host supports the selected configuration.'}</p>
      <div class="cb-review-changes">
        ${changes.map((change) => `<div class="cb-review-change"><span>✓</span><span>${change}</span></div>`).join('')}
      </div>
      <p class="cb-review-impact">Impact: ${impact}</p>
      <div class="cb-review-actions">
        <button class="cb-review-ghost" data-action="compatible-template">Use a compatible template</button>
        <button class="cb-review-ghost" data-action="explain">Why is this limited?</button>
      </div>
    </div>`;
}

function templateCards() {
  return TEMPLATES.map((template) => `
    <button class="cb-review-template ${template.id === selectedTemplate ? 'is-selected' : ''}" data-template="${template.id}">
      <strong>${template.title}</strong>
      <small>${template.name} — ${template.description}</small>
      ${template.recommended ? '<span class="cb-review-recommended">Recommended</span>' : ''}
    </button>`).join('');
}

function installPanel() {
  const rows = [
    ['Host reachable', 'done'],
    ['Template generated', 'done'],
    ['Previous configuration backed up', 'done'],
    [`Sending configuration to ${HOST_LABEL_MAP[selectedHost]}`, installState === 'sending' ? 'active' : 'pending'],
    ['Verifying saved configuration', installState === 'verifying' ? 'active' : 'pending'],
  ];

  const recovery = installState === 'failed' ? `
    <div class="cb-review-recovery">
      <strong>Installation could not be verified</strong>
      <p>${HOST_LABEL_MAP[selectedHost]} accepted the request, but Core Builds could not confirm the saved configuration. Your previous setup remains backed up.</p>
      <div class="cb-review-actions">
        <button class="cb-review-ghost" data-action="retry">Retry</button>
        <button class="cb-review-ghost" data-action="restore">Restore previous setup</button>
        <button class="cb-review-ghost" data-action="export">Export JSON</button>
      </div>
    </div>` : '';

  const template = TEMPLATES.find((item) => item.id === selectedTemplate);
  return `
    <div class="cb-review-install">
      <h3>${installState === 'failed' ? '⚠️ Installation could not be verified' : `Installing ${template.name}`}</h3>
      <div class="cb-review-progress">
        ${rows.map(([label, state]) => `<div class="cb-review-progress-item"><span class="cb-review-state cb-review-${state}">${state === 'done' ? '✓' : state === 'active' ? '●' : '○'}</span><span>${label}</span></div>`).join('')}
      </div>
      ${recovery}
    </div>`;
}

function render() {
  if (!overlay) return;
  overlay.querySelector('.cb-review-body').innerHTML = `
    <section><h2>Choose your AIOStreams host</h2><div class="cb-review-hosts">${Object.keys(HOST_BASE_URLS).map(hostCard).join('')}</div></section>
    <section><h2>Host compatibility</h2>${compatibilityPanel()}</section>
    <section><h2>Choose your playback priority</h2><div class="cb-review-templates">${templateCards()}</div></section>
    <section><h2>Installation</h2>${installPanel()}</section>`;
}

function openOverlay() {
  overlay.classList.add('is-open');
  render();
}

function closeOverlay() {
  overlay.classList.remove('is-open');
}

function simulateInstall() {
  installState = 'sending';
  render();
  setTimeout(() => {
    installState = 'verifying';
    render();
    setTimeout(() => {
      installState = 'failed';
      render();
    }, 1200);
  }, 1200);
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'cb-review-overlay';
  overlay.innerHTML = `
    <div class="cb-review-backdrop" data-action="close"></div>
    <div class="cb-review-panel">
      <header>
        <div><h1>Review before install</h1><p>Interactive prototype · no configuration is deployed</p></div>
        <button class="cb-review-close" data-action="close">✕</button>
      </header>
      <div class="cb-review-body"></div>
      <footer>
        <button class="cb-review-ghost" data-action="close">Back</button>
        <button class="cb-review-ghost" data-action="export">Export JSON</button>
        <button class="cb-review-primary" data-action="install">Install →</button>
      </footer>
    </div>`;

  overlay.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const host = event.target.closest('[data-host]')?.dataset.host;
    const template = event.target.closest('[data-template]')?.dataset.template;

    if (host) {
      selectedHost = host;
      installState = 'idle';
      render();
    }

    if (template) {
      selectedTemplate = template;
      installState = 'idle';
      render();
    }

    if (action === 'close') closeOverlay();
    if (action === 'compatible-template') {
      selectedTemplate = 'stable';
      render();
    }
    if (action === 'explain') alert('This host restricts certain sources and regex access to reduce liability and respect source-provider requests.');
    if (action === 'install') simulateInstall();
    if (action === 'retry') simulateInstall();
    if (action === 'restore') {
      installState = 'idle';
      render();
    }
    if (action === 'export') alert('In the real Configurator, this would export the generated JSON template.');
  });

  document.body.append(overlay);
}

function init() {
  const style = document.createElement('style');
  style.textContent = `
    .cb-review-toggle{position:fixed;right:20px;bottom:20px;z-index:9998;min-height:44px;padding:0 16px;border:0;border-radius:12px;background:linear-gradient(135deg,#00abd3,#35dfff);color:#04202b;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 8px 26px rgba(0,212,255,.25)}
    .cb-review-overlay{position:fixed;inset:0;z-index:9999;display:none}
    .cb-review-overlay.is-open{display:grid;place-items:center}
    .cb-review-backdrop{position:absolute;inset:0;background:rgba(2,5,8,.76);backdrop-filter:blur(8px)}
    .cb-review-panel{position:relative;z-index:1;width:min(980px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;background:linear-gradient(155deg,#131d29,#0c131c);border:1px solid rgba(0,212,255,.22);border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.58);padding:24px}
    .cb-review-panel header{display:flex;justify-content:space-between;gap:16px;margin-bottom:20px}.cb-review-panel h1{margin:0;font:700 22px/1.2 Georgia,serif}.cb-review-panel header p{margin:4px 0 0;color:#7d8999;font-size:12px}
    .cb-review-close{min-width:38px;min-height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#0d151f;color:#758396;cursor:pointer}
    .cb-review-body section{margin-bottom:22px}.cb-review-body h2{margin:0 0 10px;font:700 15px/1.3 Inter,system-ui,sans-serif;color:#dce5ec}
    .cb-review-hosts,.cb-review-templates{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
    .cb-review-host,.cb-review-template{background:#0e151f;border:1px solid rgba(255,255,255,.085);border-radius:12px;padding:14px;text-align:left;color:#edf4f8;font:inherit;cursor:pointer;transition:.16s}
    .cb-review-host:hover,.cb-review-template:hover{border-color:rgba(0,212,255,.24)}
    .cb-review-host.is-selected,.cb-review-template.is-selected{background:rgba(0,212,255,.07);border-color:rgba(0,212,255,.42);box-shadow:inset 3px 0 #00d4ff}
    .cb-review-host strong,.cb-review-template strong{display:block;font-size:14px}.cb-review-host small,.cb-review-template small{display:block;margin-top:5px;color:#7d8999;font-size:12px}
    .cb-review-tag,.cb-review-recommended{display:inline-block;margin-top:8px;padding:3px 8px;border-radius:99px;font-size:11px;font-weight:700}
    .cb-review-ok{background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.35);color:#86efac}.cb-review-warn{background:rgba(251,191,36,.09);border:1px solid rgba(251,191,36,.35);color:#fcd34d}.cb-review-probe{background:rgba(167,139,250,.09);border:1px solid rgba(167,139,250,.35);color:#c4b5fd}.cb-review-recommended{color:#67e8f9}
    .cb-review-compat,.cb-review-install{background:#0d151f;border:1px solid rgba(255,255,255,.085);border-radius:14px;padding:18px}
    .cb-review-compat{border-color:rgba(251,191,36,.35)}.cb-review-compat h3,.cb-review-install h3{margin:0 0 8px;font-size:16px}.cb-review-compat h3{color:#fcd34d}.cb-review-compat p{margin:0 0 14px;color:#8290a2}
    .cb-review-changes,.cb-review-progress{display:grid;gap:9px}.cb-review-change,.cb-review-progress-item{display:flex;gap:10px;align-items:center;color:#c8d3dd;font-size:13px}.cb-review-change span:first-child,.cb-review-state{width:22px;height:22px;flex:0 0 auto;border-radius:99px;display:grid;place-items:center;font-size:11px}.cb-review-change span:first-child{background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.3);color:#67e8f9}.cb-review-impact{margin:14px 0 0;padding-top:14px;border-top:1px solid rgba(255,255,255,.085);color:#7d8999}
    .cb-review-state.cb-review-done{background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.35);color:#86efac}.cb-review-state.cb-review-active{background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.4);color:#67e8f9}.cb-review-state.cb-review-pending{background:#0d151f;border:1px solid rgba(255,255,255,.085);color:#7d8999}
    .cb-review-recovery{margin-top:16px;padding:14px;border-radius:12px;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.25)}.cb-review-recovery strong{color:#fca5a5}.cb-review-recovery p{margin:6px 0 12px;color:#7d8999}
    .cb-review-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.cb-review-panel footer{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
    .cb-review-ghost{min-height:44px;padding:0 16px;border-radius:11px;border:1px solid rgba(255,255,255,.085);background:#0d151f;color:#758396;font:inherit;font-weight:650;cursor:pointer}.cb-review-primary{min-height:44px;padding:0 18px;border:0;border-radius:11px;background:linear-gradient(135deg,#00abd3,#35dfff);color:#04202b;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 8px 26px rgba(0,212,255,.2)}
  `;
  document.head.append(style);

  const toggle = document.createElement('button');
  toggle.className = 'cb-review-toggle';
  toggle.type = 'button';
  toggle.textContent = 'Review';
  toggle.addEventListener('click', openOverlay);
  document.body.append(toggle);

  createOverlay();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
