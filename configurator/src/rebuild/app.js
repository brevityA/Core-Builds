import {
  REBUILD_VERSION,
  SERVICES,
  DEVICES,
  SUPPORTED_AIOSTREAMS_VERSIONS,
  AIOSTREAMS_CAPABILITY_MANIFEST,
  aiostreamsCapability,
  defaultState,
  normalizeState,
  buildReliableTemplate,
  inspectReliableTemplate,
  redactTemplate,
  safeDiagnostics,
} from './core.js';

let state = defaultState();
let view = 'builder';

const root = document.getElementById('app');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function activeTemplate() {
  return buildReliableTemplate(state);
}

function activeReport() {
  return inspectReliableTemplate(activeTemplate(), state);
}

function setState(patch) {
  state = normalizeState({ ...state, ...patch });
  render();
}

function pill(active, text, action, value, tone = 'cyan') {
  return `<button class="choice ${active ? `selected ${tone}` : ''}" data-action="${action}" data-value="${escapeHtml(value)}" aria-pressed="${active}">${text}</button>`;
}

function card(title, subtitle, body) {
  return `<section class="card"><div class="card-heading"><h2>${title}</h2><p>${subtitle}</p></div>${body}</section>`;
}

function serviceCard(id, service) {
  const selected = state.service === id;
  const kind = service.kind === 'p2p' ? 'No account key' : 'Debrid service';
  return `<button class="service-card ${selected ? 'selected' : ''}" data-action="service" data-value="${id}" aria-pressed="${selected}">
    <span class="service-dot"></span>
    <span class="service-copy"><b>${escapeHtml(service.label)}</b><small>${kind} · local JSON only</small></span>
    <span class="service-check">${selected ? '✓' : ''}</span>
  </button>`;
}

function deviceCard(id, device) {
  const selected = state.device === id;
  return `<button class="device-card ${selected ? 'selected' : ''}" data-action="device" data-value="${id}" aria-pressed="${selected}">
    <b>${escapeHtml(device.label)}</b><small>${escapeHtml(device.description)}</small><span>${selected ? 'Selected' : ''}</span>
  </button>`;
}

function checkRow(check) {
  return `<li class="check ${check.pass ? 'pass' : 'warn'}"><span>${check.pass ? '✓' : '!'}</span><div><b>${escapeHtml(check.label)}</b><small>${escapeHtml(check.detail)}</small></div></li>`;
}

function builderHtml() {
  const service = SERVICES[state.service];
  const report = activeReport();
  const capability = aiostreamsCapability(state.aiostreamsVersion);
  const template = activeTemplate();
  const redacted = redactTemplate(template);
  const serviceCredential = service.credentialLabel ? `
    <div class="credential-block">
      <label for="credential">${escapeHtml(service.credentialLabel)}</label>
      <input id="credential" type="password" autocomplete="off" spellcheck="false" placeholder="Optional — only used in this browser session" value="${escapeHtml(state.credential)}">
      <label class="inline-check"><input id="includeCredential" type="checkbox" ${state.includeCredentialInDownload ? 'checked' : ''}> Include this credential only in the downloaded JSON</label>
      <p>It is never saved to browser storage, displayed in preview, uploaded, or sent to a paste service.</p>
    </div>` : `
    <div class="notice neutral"><b>No account credential needed for this profile.</b><span>P2P availability depends on the selected AIOStreams host and installed add-ons.</span></div>`;

  return `
    <header class="topbar">
      <div class="brand"><span class="mark">◆</span><div><strong>CORE BUILDS</strong><small>Reliable Configurator · candidate</small></div></div>
      <div class="local-badge">LOCAL ONLY · NO REMOTE SEL</div>
    </header>

    <main>
      <section class="hero">
        <div>
          <p class="eyebrow">REBUILD / ${REBUILD_VERSION}</p>
          <h1>A configuration you can explain.</h1>
          <p class="lead">Build a small local AIOStreams configuration. No synced stream expressions, no hidden scoring stack, no direct-install upload path, and no background profile drift.</p>
        </div>
        <div class="contract">
          <b>Stable contract</b>
          <span>0 synced SEL URLs · 0 Groups · 0 Dynamic exits · 0 RSE score dependencies</span>
        </div>
      </section>

      ${card('1 / Service', 'Choose one verified V1 service path. Multi-service stacking is intentionally not in the first reliable product.', `
        <div class="service-grid">${Object.entries(SERVICES).map(([id, value]) => serviceCard(id, value)).join('')}</div>
        ${serviceCredential}
      `)}

      ${card('2 / Playback device', 'The device profile only controls native preferences and hard capability exclusions.', `
        <div class="device-grid">${Object.entries(DEVICES).map(([id, value]) => deviceCard(id, value)).join('')}</div>
      `)}

      ${card('3 / Playback policy', 'Use native AIOStreams fields before any expression. Stable does not use an expression to duplicate these choices.', `
        <div class="setting-grid">
          <div class="setting"><label>Resolution</label><div class="pill-row">${pill(state.resolution === '1080p', '1080p + 720p fallback', 'resolution', '1080p')}${pill(state.resolution === '4k', '4K + 1080p fallback', 'resolution', '4k')}</div></div>
          <div class="setting"><label>Availability</label><div class="pill-row">${pill(state.cacheMode === 'mixed', 'Mixed', 'cache', 'mixed')}${pill(state.cacheMode === 'cached', 'Cached only', 'cache', 'cached', 'green')}</div></div>
          <div class="setting"><label>Content</label><div class="pill-row">${pill(state.content === 'all', 'Movies, series + anime', 'content', 'all')}${pill(state.content === 'anime', 'Anime focused', 'content', 'anime', 'purple')}</div></div>
          <div class="setting"><label for="language">Preferred language</label><select id="language"><option ${state.language === 'English' ? 'selected' : ''}>English</option><option ${state.language === 'French' ? 'selected' : ''}>French</option><option ${state.language === 'Spanish' ? 'selected' : ''}>Spanish</option><option ${state.language === 'German' ? 'selected' : ''}>German</option><option ${state.language === 'Japanese' ? 'selected' : ''}>Japanese</option></select></div>
          <div class="setting full"><label class="inline-check"><input id="excludeDolbyVision" type="checkbox" ${state.excludeDolbyVision ? 'checked' : ''}> Exclude Dolby Vision files because this playback device does not support them</label><small>This is explicit. The device selector alone does not silently remove Dolby Vision.</small></div>
        </div>
      `)}

      ${card('4 / Compatibility target', 'V1 is verified against 2.31.1. AIOStreams 2.32 is a new review lane, not an automatic support claim.', `
        <div class="target-row">
          <label for="version">AIOStreams version</label>
          <select id="version">${Object.entries(AIOSTREAMS_CAPABILITY_MANIFEST).map(([version, entry]) => `<option value="${version}" ${state.aiostreamsVersion === version ? 'selected' : ''}>${escapeHtml(entry.label)}</option>`).join('')}</select>
          <span class="version-status ${capability.status === 'verified' ? 'ok' : 'warn'}">${escapeHtml(capability.detail)}</span>
        </div>
      `)}

      ${card('5 / Review', 'The preview always redacts credentials. Download is the only V1 delivery path.', `
        <div class="review-summary">
          <div><span>Profile</span><b>Core Stable</b></div>
          <div><span>Enabled stream sources</span><b>${report.summary.presets}</b></div>
          <div><span>Local expressions</span><b>${report.summary.expressions}</b></div>
          <div><span>Result limit</span><b>${report.summary.resultLimit}</b></div>
        </div>
        <ul class="checks">${report.checks.map(checkRow).join('')}</ul>
        <div class="actions">
          <button class="primary" data-action="download">Download JSON</button>
          <button class="secondary" data-action="diagnostics">Copy sanitized diagnostics</button>
          <button class="secondary" data-action="preview">Show redacted JSON</button>
        </div>
        <p class="delivery-note">V1 intentionally has no Direct Install, no paste service, and no generated import URL. Download the JSON, then import it directly in AIOStreams. This removes an entire network/privacy failure path while the import matrix is being proven.</p>
        <pre id="preview" class="preview ${view === 'preview' ? 'visible' : ''}">${escapeHtml(JSON.stringify(redacted, null, 2))}</pre>
      `)}
    </main>

    <footer>Candidate product — local browser state only. No API keys are persisted, logged, or transmitted by this page.</footer>
  `;
}

function downloadTemplate() {
  const template = activeTemplate();
  const json = JSON.stringify(template, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `core-builds-stable-${state.service}-${state.resolution}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  announce('Downloaded local JSON. Import it directly in AIOStreams.');
}

function announce(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

async function copyDiagnostics() {
  const diagnostics = safeDiagnostics(activeTemplate(), state);
  try {
    await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    announce('Sanitized diagnostics copied.');
  } catch {
    announce('Clipboard is unavailable. Use the redacted JSON preview instead.');
  }
}

function render() {
  root.innerHTML = builderHtml();
  bind();
}

function bind() {
  root.querySelectorAll('[data-action="service"]').forEach(button => button.addEventListener('click', () => setState({ service: button.dataset.value, credential: '', includeCredentialInDownload: false })));
  root.querySelectorAll('[data-action="device"]').forEach(button => button.addEventListener('click', () => {
    const device = button.dataset.value;
    setState({ device, resolution: DEVICES[device].defaultResolution });
  }));
  root.querySelectorAll('[data-action="resolution"]').forEach(button => button.addEventListener('click', () => setState({ resolution: button.dataset.value })));
  root.querySelectorAll('[data-action="cache"]').forEach(button => button.addEventListener('click', () => setState({ cacheMode: button.dataset.value })));
  root.querySelectorAll('[data-action="content"]').forEach(button => button.addEventListener('click', () => setState({ content: button.dataset.value })));
  root.querySelector('[data-action="download"]')?.addEventListener('click', downloadTemplate);
  root.querySelector('[data-action="diagnostics"]')?.addEventListener('click', copyDiagnostics);
  root.querySelector('[data-action="preview"]')?.addEventListener('click', () => { view = view === 'preview' ? 'builder' : 'preview'; render(); });
  root.querySelector('#credential')?.addEventListener('input', event => { state = normalizeState({ ...state, credential: event.target.value }); });
  root.querySelector('#includeCredential')?.addEventListener('change', event => setState({ includeCredentialInDownload: event.target.checked }));
  root.querySelector('#excludeDolbyVision')?.addEventListener('change', event => setState({ excludeDolbyVision: event.target.checked }));
  root.querySelector('#language')?.addEventListener('change', event => setState({ language: event.target.value }));
  root.querySelector('#version')?.addEventListener('change', event => setState({ aiostreamsVersion: event.target.value }));
}

render();
