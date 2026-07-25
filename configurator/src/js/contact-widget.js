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

export function initContactWidget() {
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
  document.getElementById('cbContactOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'cbContactOverlay') closeWidget();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _widgetOpen) closeWidget();
    if (e.key === 'Tab' && _widgetOpen) {
      const panel = document.getElementById('cbContactPanel');
      const focusable = panel.querySelectorAll('input:not([tabindex="-1"]),select,textarea,button');
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

function toggleWidget() { _widgetOpen ? closeWidget() : openWidget(); }
function openWidget() {
  _widgetOpen = true;
  document.getElementById('cbContactOverlay').classList.add('open');
  const panel = document.getElementById('cbContactPanel');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  document.getElementById('cbContactBtn').classList.add('active');
  setTimeout(() => document.getElementById('cbContactName')?.focus(), 200);
}
function closeWidget() {
  _widgetOpen = false;
  document.getElementById('cbContactOverlay').classList.remove('open');
  const panel = document.getElementById('cbContactPanel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  document.getElementById('cbContactBtn').classList.remove('active');
  document.getElementById('cbContactBtn').focus();
}

async function handleSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('cbContactName').value.trim();
  const email = document.getElementById('cbContactEmail').value.trim();
  const category = document.getElementById('cbContactCategory').value;
  const message = document.getElementById('cbContactMessage').value.trim();
  const honeypot = document.getElementById('cbContactHp').value;

  if (!name) { showStatus('Please enter your name', 'err'); return; }
  if (!message) { showStatus('Please enter a message', 'err'); return; }
  if (message.length > MAX_MESSAGE_LENGTH) { showStatus(`Message too long (${message.length}/${MAX_MESSAGE_LENGTH})`, 'err'); return; }
  if (honeypot) { showStatus('Message sent!', 'ok'); return; }

  const now = Date.now();
  if (now - _lastSendTime < RATE_LIMIT_MS) {
    const wait = Math.ceil((RATE_LIMIT_MS - (now - _lastSendTime)) / 1000);
    showStatus(`Please wait ${wait}s before sending again`, 'warn');
    return;
  }

  // Build setup context
  let setup = '';
  try {
    const state = JSON.parse(localStorage.getItem('coreBuild') || '{}');
    setup = [
      state.service ? `Service: ${state.service}` : '',
      state.device ? `Device: ${state.device}` : '',
      state.resolution ? `Res: ${state.resolution}` : '',
      state.formatter ? `Fmt: ${state.formatter}` : '',
    ].filter(Boolean).join(' · ');
  } catch(e) {}

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
      showStatus('Message sent! Brevity will see it on Discord.', 'ok');
      document.getElementById('cbContactForm').reset();
      setTimeout(closeWidget, 2000);
    } else {
      showStatus('Failed to send — try again later', 'err');
    }
  } catch (err) {
    showStatus('Network error — check your connection', 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Message';
  }
}

function showStatus(msg, type) {
  const el = document.getElementById('cbContactStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'cb-contact-status';
  if (type === 'ok') el.classList.add('status-ok');
  else if (type === 'err') el.classList.add('status-err');
  else if (type === 'warn') el.classList.add('status-warn');
}

const CONTACT_CSS = `
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
.cb-field label{display:block;font-size:.72rem;font-weight:700;color:var(--th-tx2,#8b949e);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
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
@media(max-width:480px){.cb-contact-panel{bottom:0;right:0;left:0;width:100%;max-height:85vh;border-radius:16px 16px 0 0}}
`;

const CONTACT_HTML = `
<button class="cb-contact-btn" id="cbContactBtn" aria-label="Contact Brevity" title="Message the creator">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
</button>
<div class="cb-contact-overlay" id="cbContactOverlay"></div>
<div class="cb-contact-panel" id="cbContactPanel" role="dialog" aria-modal="true" aria-labelledby="cbContactTitle" aria-hidden="true">
  <div class="cb-contact-header">
    <h3 id="cbContactTitle">💬 Message Brevity</h3>
    <button class="cb-contact-close" id="cbContactClose" aria-label="Close">✕</button>
  </div>
  <div class="cb-contact-body">
    <form id="cbContactForm">
      <div class="cb-field"><label for="cbContactName">Name</label><input type="text" id="cbContactName" placeholder="Your name" autocomplete="name" required></div>
      <div class="cb-field"><label for="cbContactEmail">Email <span style="font-weight:400;text-transform:none;color:var(--th-tx4,#4b5563)">(optional — for reply)</span></label><input type="email" id="cbContactEmail" placeholder="you@example.com" autocomplete="email"></div>
      <div class="cb-field"><label for="cbContactCategory">Category</label><select id="cbContactCategory"><option value="Bug">🐛 Bug Report</option><option value="Feature">💡 Feature Request</option><option value="Question">❓ Question</option><option value="Feedback" selected>💬 Feedback</option></select></div>
      <div class="cb-field"><label for="cbContactMessage">Message</label><textarea id="cbContactMessage" placeholder="What's on your mind?" required></textarea></div>
      <div class="cb-hp"><input type="text" id="cbContactHp" tabindex="-1" autocomplete="off"></div>
      <button type="submit" class="cb-contact-submit" id="cbContactSubmit">Send Message</button>
      <div class="cb-contact-status" id="cbContactStatus"></div>
      <div class="cb-contact-info">Message goes directly to Brevity on Discord.<br>Your setup info is included automatically for context.</div>
    </form>
  </div>
</div>
`;
