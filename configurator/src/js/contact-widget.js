/**
 * Core Builds — Live Contact Widget (Secure Version)
 * 
 * Routes messages through the existing CORS proxy worker.
 * Discord webhook URL is stored server-side (Worker env var), never in client JS.
 */

const CONTACT_ENDPOINT = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev/contact';

const RATE_LIMIT_MS = 60000;
const MAX_MESSAGE_LENGTH = 2000;
let _lastSendTime = 0;
let _widgetOpen = false;
let _previousFocus = null;
let _getSetupContext = null;
const DRAFT_KEY = 'cbContactDraft';
const DISCORD_URL = 'https://discord.gg/AwJ49yzbqT';
const ISSUES_URL = 'https://github.com/brevityA/Core-Builds/issues/new';

// What to say: one short prompt and a fill-in outline per kind of message (v3.33).
const KINDS = {
  Bug: { label: 'Problem', hint: 'Say what you did, what you expected, and what happened instead. The app and a title you tried help most.',
    placeholder: 'e.g. Quick install finished, but Stremio shows no streams for The Office S02E01 on my Google TV.',
    outline: 'What I did:\nWhat I expected:\nWhat happened instead:\nApp (Stremio, Nuvio, WuPlay…):\nA title I tried:' },
  Feature: { label: 'Idea', hint: 'Describe what you would like and the problem it solves for you.',
    placeholder: 'e.g. Let me pick a different formatter in Quick install without opening Custom build.',
    outline: 'I would like Core Builds to:\nIt would help because:' },
  Question: { label: 'Question', hint: 'Say what you are trying to do and what you have tried so far.',
    placeholder: 'e.g. Which template should I use for a Fire Stick 4K Max on a 50 Mbps connection?',
    outline: 'I am trying to:\nWhat I have tried:' },
  Feedback: { label: 'Thanks', hint: 'Tell Brevity what works for you, or what could be better.',
    placeholder: 'e.g. Setup took two minutes and everything plays. The new menu is easier to find things in.',
    outline: 'What I liked:\nWhat could be better:' },
};

export function initContactWidget(getSetupContext = null) {
  _getSetupContext = getSetupContext;
  if (document.getElementById('cbContactWidget')) return; // idempotent — safe if bootstrap runs twice
  const style = document.createElement('style');
  style.textContent = CONTACT_CSS;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.id = 'cbContactWidget';
  widget.innerHTML = CONTACT_HTML;
  document.body.appendChild(widget);

  document.getElementById('cbContactBtn').addEventListener('click', toggleWidget);
  document.getElementById('cbContactClose').addEventListener('click', closeWidget);
  document.getElementById('cbContactForm').addEventListener('submit', handleSubmit);
  document.getElementById('cbContactMessage').addEventListener('input', updateCharCount);
  document.getElementById('cbContactPanel').addEventListener('keydown', handlePanelKeydown);
  document.getElementById('cbContactKinds').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-kind]');
    if (chip) setKind(chip.dataset.kind);
  });
  document.getElementById('cbContactOutline').addEventListener('click', insertOutline);
  document.getElementById('cbContactCopy').addEventListener('click', copyMessage);
  document.getElementById('cbContactMessage').addEventListener('input', saveDraft);
  setKind('Feedback');
  restoreDraft();
  document.getElementById('cbContactOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'cbContactOverlay') closeWidget();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _widgetOpen) closeWidget();
  });
}

function toggleWidget() { _widgetOpen ? closeWidget() : openWidget(); }
function openWidget() {
  _previousFocus = document.activeElement;
  _widgetOpen = true;
  document.getElementById('cbContactOverlay').classList.add('open');
  document.getElementById('cbContactPanel').classList.add('open');
  document.getElementById('cbContactBtn').classList.add('active');
  renderSetupPreview();
  setTimeout(() => document.getElementById('cbContactMessage')?.focus(), 200);
}
function closeWidget() {
  _widgetOpen = false;
  document.getElementById('cbContactOverlay').classList.remove('open');
  document.getElementById('cbContactPanel').classList.remove('open');
  document.getElementById('cbContactBtn').classList.remove('active');
  if (_previousFocus && typeof _previousFocus.focus === 'function') _previousFocus.focus();
}

function handlePanelKeydown(e) {
  if (e.key !== 'Tab') return;
  const panel = e.currentTarget;
  const focusable = [...panel.querySelectorAll('button:not(:disabled), input:not([tabindex="-1"]), select, textarea, [href]')];
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function updateCharCount() {
  const input = document.getElementById('cbContactMessage');
  const counter = document.getElementById('cbContactCount');
  if (!input || !counter) return;
  const length = input.value.length;
  counter.textContent = `${length} / ${MAX_MESSAGE_LENGTH}`;
  counter.className = 'cb-contact-count' + (length > 1900 ? ' count-danger' : length > 1600 ? ' count-warn' : '');
}

function setKind(kind) {
  const k = KINDS[kind] ? kind : 'Feedback';
  document.getElementById('cbContactCategory').value = k;
  document.querySelectorAll('#cbContactKinds [data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === k)));
  document.getElementById('cbContactHint').textContent = KINDS[k].hint;
  document.getElementById('cbContactMessage').placeholder = KINDS[k].placeholder;
}
function insertOutline() {
  const input = document.getElementById('cbContactMessage');
  const outline = KINDS[document.getElementById('cbContactCategory').value]?.outline || '';
  if (!input.value.trim()) input.value = outline;
  else if (!input.value.includes(outline)) input.value = input.value.trimEnd() + '\n\n' + outline;
  input.focus(); input.setSelectionRange(input.value.indexOf(':') + 1, input.value.indexOf(':') + 1);
  updateCharCount(); saveDraft();
}
function saveDraft() {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ kind: document.getElementById('cbContactCategory').value, message: document.getElementById('cbContactMessage').value })); } catch (e) { /* storage blocked: the draft lives only in the field */ }
}
function restoreDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
    if (d && typeof d.message === 'string') { setKind(d.kind); document.getElementById('cbContactMessage').value = d.message.slice(0, MAX_MESSAGE_LENGTH); updateCharCount(); }
  } catch (e) { /* no draft */ }
}
function setupLine() {
  try {
    const state = typeof _getSetupContext === 'function'
      ? (_getSetupContext() || {})
      : JSON.parse(localStorage.getItem('coreBuild') || '{}');
    const labels = state.labels || {};
    return [
      state.service ? `Service: ${labels.service || state.service}` : '',
      state.device ? `Device: ${labels.device || state.device}` : '',
      state.resolution ? `Resolution: ${labels.resolution || state.resolution}` : '',
      state.pseArch ? `Architecture: ${labels.pseArch || state.pseArch}` : '',
      state.formatter ? `Formatter: ${labels.formatter || state.formatter}` : '',
      state.configuratorVersion ? `Configurator: ${state.configuratorVersion}` : '',
    ].filter(Boolean).join(' · ').slice(0, 1000);
  } catch (e) { return ''; }
}
function renderSetupPreview() {
  const line = setupLine();
  const row = document.getElementById('cbContactSetupRow');
  if (!row) return;
  row.hidden = !line;
  document.getElementById('cbContactSetupText').textContent = line || '';
}
function showFallback(show) {
  const el = document.getElementById('cbContactFallback');
  if (el) el.hidden = !show;
}
async function copyMessage() {
  const text = document.getElementById('cbContactMessage').value;
  try { await navigator.clipboard.writeText(text); showStatus('Copied. Paste it into Discord or a GitHub issue.', 'ok'); }
  catch (e) { const input = document.getElementById('cbContactMessage'); input.focus(); input.select(); showStatus('Select all and copy, then paste it into Discord or a GitHub issue.', 'warn'); }
}

async function handleSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('cbContactName').value.trim() || 'Anonymous';
  const email = document.getElementById('cbContactEmail').value.trim();
  const category = document.getElementById('cbContactCategory').value;
  const message = document.getElementById('cbContactMessage').value.trim();
  const honeypot = document.getElementById('cbContactHp').value;

  if (!message) { showStatus('Write a message first. "Start with a template" gives you an outline.', 'err'); return; }
  if (message.length > MAX_MESSAGE_LENGTH) { showStatus(`Message too long (${message.length}/${MAX_MESSAGE_LENGTH})`, 'err'); return; }
  if (honeypot) { showStatus('Message sent!', 'ok'); return; }

  const now = Date.now();
  if (now - _lastSendTime < RATE_LIMIT_MS) {
    const wait = Math.ceil((RATE_LIMIT_MS - (now - _lastSendTime)) / 1000);
    showStatus(`Please wait ${wait}s before sending again`, 'warn');
    return;
  }

  // Sanitized setup context (never keys), only when the person leaves it switched on.
  const setup = document.getElementById('cbContactSetup')?.checked === false ? '' : setupLine();

  const btn = document.getElementById('cbContactSubmit');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  showStatus('', '');

  try {
    const res = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.replace(/[<>]/g, '').slice(0, 100),
        email: email.replace(/[<>]/g, '').slice(0, 200),
        category,
        message: message.slice(0, MAX_MESSAGE_LENGTH),
        setup,
      }),
    });

    if (res.ok) {
      _lastSendTime = Date.now();
      showStatus('Sent. Brevity reads every message on Discord; add an email above if you want a reply.', 'ok');
      document.getElementById('cbContactForm').reset();
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* nothing stored */ }
      setKind('Feedback'); updateCharCount(); showFallback(false);
    } else {
      const why = res.status === 429 ? 'Too many messages from this connection in the last hour.'
        : res.status === 403 ? 'This copy of Core Builds cannot send messages.'
        : 'The message service did not accept it.';
      showStatus(`Not sent: ${why} Your message is kept below; copy it or post it on Discord.`, 'err');
      showFallback(true);
    }
  } catch (err) {
    showStatus('Not sent: no connection to the message service. Your message is kept; copy it or post it on Discord.', 'err');
    showFallback(true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send message';
  }
}

function showStatus(msg, type) {
  const el = document.getElementById('cbContactStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'cb-contact-status';
  el.setAttribute('role', type === 'err' ? 'alert' : 'status');
  if (type === 'ok') el.classList.add('status-ok');
  else if (type === 'err') el.classList.add('status-err');
  else if (type === 'warn') el.classList.add('status-warn');
}

const CONTACT_CSS = `
.cb-field-label{display:block;font-size:.72rem;font-weight:700;color:var(--th-tx2,#8b949e);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
.cb-kinds{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.cb-kind{min-height:38px;padding:6px 4px;border:1.5px solid var(--th-border,rgba(255,255,255,.1));border-radius:10px;background:var(--th-card-alt,#111720);color:var(--th-tx2,#8b949e);font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}
.cb-kind[aria-pressed='true']{border-color:var(--th-accent,#00d4ff);background:var(--th-accent-bg,rgba(0,212,255,.1));color:var(--th-tx,#e4e7ed)}
.cb-kind:focus-visible,.cb-outline:focus-visible,.cb-fallback>*:focus-visible{outline:2px solid var(--th-accent,#00d4ff);outline-offset:2px}
.cb-hint{margin:8px 2px 0;font-size:.74rem;line-height:1.45;color:var(--th-tx3,#6b7280)}
.cb-outline{margin-top:6px;padding:4px 0;border:0;background:none;color:var(--th-accent,#00d4ff);font:inherit;font-size:.74rem;font-weight:700;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.cb-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cb-opt{font-weight:400;text-transform:none;color:var(--th-tx4,#4b5563)}
.cb-setup{display:flex;gap:8px;align-items:flex-start;margin:0 0 12px;font-size:.7rem;line-height:1.45;color:var(--th-tx3,#6b7280);cursor:pointer}.cb-setup input{margin-top:2px;accent-color:var(--th-accent,#00d4ff)}
.cb-setup[hidden],.cb-fallback[hidden]{display:none}
.cb-fallback{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px}
.cb-fallback>*{padding:7px 12px;border:1px solid var(--th-border,rgba(255,255,255,.12));border-radius:99px;background:none;color:var(--th-tx,#e4e7ed);font:inherit;font-size:.74rem;font-weight:700;text-decoration:none;cursor:pointer}
@media(max-width:480px){.cb-two{grid-template-columns:1fr}.cb-kinds{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cb-contact-btn{position:fixed;bottom:20px;right:20px;z-index:9990;width:52px;height:52px;border-radius:50%;border:1.5px solid var(--th-accent-border,rgba(0,212,255,.3));background:var(--th-accent-bg,rgba(0,212,255,.1));color:var(--th-accent,#00d4ff);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 20px rgba(0,212,255,.2)}
.cb-contact-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,212,255,.35)}
.cb-contact-btn.active{background:var(--th-accent,#00d4ff);color:var(--th-bg,#0d1117);border-color:var(--th-accent,#00d4ff)}
.cb-contact-overlay{position:fixed;inset:0;z-index:9991;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .2s}
.cb-contact-overlay.open{opacity:1;pointer-events:auto}
.cb-contact-panel{position:fixed;bottom:80px;right:20px;z-index:9992;width:min(400px,90vw);max-height:80vh;overflow-y:auto;background:var(--th-card,#151923);border:1.5px solid var(--th-accent-border,rgba(0,212,255,.25));border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 0 1px rgba(0,212,255,.08);transform:translateY(20px) scale(.95);opacity:0;pointer-events:none;transition:all .25s cubic-bezier(.34,1.12,.64,1)}
.cb-contact-panel.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}
.cb-contact-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid var(--th-border,rgba(255,255,255,.06))}
.cb-contact-header h3{font-size:.88rem;font-weight:800;color:var(--th-tx,#e4e7ed);margin:0}
.cb-contact-close{background:none;border:none;color:var(--th-tx3,#6b7280);font-size:1.1rem;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all .15s}
.cb-contact-close:hover{color:var(--th-tx,#e4e7ed);background:rgba(255,255,255,.06)}
.cb-contact-body{padding:16px 20px 20px}
.cb-field{margin-bottom:12px}
.cb-field-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.cb-field label{display:block;font-size:.72rem;font-weight:700;color:var(--th-tx2,#8b949e);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}.cb-contact-count{font-size:.65rem;color:var(--th-tx4,#4b5563);margin-bottom:4px}.count-warn{color:var(--th-warn,#fbbf24)}.count-danger{color:var(--th-err,#f87171)}
.cb-field input,.cb-field select,.cb-field textarea{width:100%;box-sizing:border-box;padding:9px 12px;border-radius:8px;border:1.5px solid var(--th-border,rgba(255,255,255,.08));background:var(--th-card-alt,#111720);color:var(--th-tx,#e4e7ed);font-size:.82rem;font-family:inherit;outline:none;transition:border-color .15s}
.cb-field input:focus,.cb-field select:focus,.cb-field textarea:focus{border-color:var(--th-accent-border,rgba(0,212,255,.4))}
.cb-field input::placeholder,.cb-field textarea::placeholder{color:var(--th-tx4,#4b5563)}
.cb-field textarea{height:100px;resize:vertical}
.cb-field select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
.cb-hp{position:absolute;left:-9999px;opacity:0}
.cb-contact-submit{width:100%;padding:11px;border-radius:10px;border:none;background:linear-gradient(135deg,#0891b2,#00d4ff);color:#000;font-size:.88rem;font-weight:800;cursor:pointer;transition:all .15s;box-shadow:0 4px 16px rgba(0,212,255,.25)}
.cb-contact-submit:hover:not(:disabled){box-shadow:0 6px 24px rgba(0,212,255,.4);transform:translateY(-1px)}
.cb-contact-submit:disabled{opacity:.5;cursor:not-allowed}
.cb-contact-status{font-size:.72rem;margin-top:8px;min-height:1.2em;text-align:center;transition:color .15s}
.status-ok{color:var(--th-ok,#34d399)}.status-err{color:var(--th-err,#f87171)}.status-warn{color:var(--th-warn,#fbbf24)}
.cb-contact-info{font-size:.65rem;color:var(--th-tx4,#4b5563);text-align:center;margin-top:10px;line-height:1.4}
@media(max-width:480px){.cb-contact-panel{bottom:0;right:0;left:0;width:100%;max-height:85vh;border-radius:16px 16px 0 0}.cb-contact-panel:before{content:'';display:block;width:38px;height:4px;border-radius:99px;background:var(--th-border,rgba(255,255,255,.16));margin:8px auto 0}}@media(prefers-reduced-motion:reduce){.cb-contact-btn,.cb-contact-overlay,.cb-contact-panel,.cb-contact-submit{transition:none!important;animation:none!important}}
`;

const CONTACT_HTML = `
<button class="cb-contact-btn" id="cbContactBtn" aria-label="Contact Brevity" title="Message the creator">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
</button>
<div class="cb-contact-overlay" id="cbContactOverlay"></div>
<div class="cb-contact-panel" id="cbContactPanel" role="dialog" aria-modal="true" aria-labelledby="cbContactTitle">
  <div class="cb-contact-header">
    <h3 id="cbContactTitle">Message Brevity</h3>
    <button class="cb-contact-close" id="cbContactClose" aria-label="Close">✕</button>
  </div>
  <div class="cb-contact-body">
    <form id="cbContactForm">
      <div class="cb-field"><span class="cb-field-label" id="cbContactKindsLabel">What is it about?</span><div class="cb-kinds" id="cbContactKinds" role="group" aria-labelledby="cbContactKindsLabel">${Object.entries(KINDS).map(([k, v]) => `<button type="button" class="cb-kind" data-kind="${k}" aria-pressed="false">${v.label}</button>`).join('')}</div><input type="hidden" id="cbContactCategory" value="Feedback"><p class="cb-hint" id="cbContactHint"></p></div>
      <div class="cb-field"><div class="cb-field-row"><label for="cbContactMessage">Message</label><span id="cbContactCount" class="cb-contact-count" aria-live="polite">0 / 2000</span></div><textarea id="cbContactMessage" maxlength="2000" required></textarea><button type="button" class="cb-outline" id="cbContactOutline">Start with a template</button></div>
      <div class="cb-field cb-two"><div><label for="cbContactName">Name <span class="cb-opt">(optional)</span></label><input type="text" id="cbContactName" placeholder="Anonymous" autocomplete="name" maxlength="100"></div><div><label for="cbContactEmail">Email <span class="cb-opt">(for a reply)</span></label><input type="email" id="cbContactEmail" placeholder="you@example.com" autocomplete="email"></div></div>
      <label class="cb-setup" id="cbContactSetupRow" hidden><input type="checkbox" id="cbContactSetup" checked><span>Include my setup: <span id="cbContactSetupText"></span>. No keys or passwords.</span></label>
      <div class="cb-hp"><input type="text" id="cbContactHp" tabindex="-1" autocomplete="off"></div>
      <button type="submit" class="cb-contact-submit" id="cbContactSubmit">Send message</button>
      <div class="cb-contact-status" id="cbContactStatus"></div>
      <div class="cb-fallback" id="cbContactFallback" hidden><button type="button" id="cbContactCopy">Copy message</button><a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">Post on Discord</a><a href="${ISSUES_URL}" target="_blank" rel="noopener noreferrer">Open a GitHub issue</a></div>
      <div class="cb-contact-info">Goes straight to Brevity on Discord. A real person reads it.</div>
    </form>
  </div>
</div>
`;
