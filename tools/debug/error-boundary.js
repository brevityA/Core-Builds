/**
 * Global error boundary — catches unhandled errors and rejections,
 * shows a user-friendly recovery toast instead of a silent blank page.
 * Add to app.js: import and call initErrorBoundary() at startup.
 */

let _errorCount = 0;
const MAX_ERRORS = 5;

export function initErrorBoundary() {
  window.addEventListener('error', (e) => {
    _errorCount++;
    if (_errorCount > MAX_ERRORS) return; // stop spamming
    console.error('[CoreBuilds] Uncaught error:', e.message, '\n  at', e.filename, ':', e.lineno);
    showErrorToast('Something went wrong — your settings are saved. Refresh if the page looks broken.');
  });

  window.addEventListener('unhandledrejection', (e) => {
    _errorCount++;
    if (_errorCount > MAX_ERRORS) return;
    console.error('[CoreBuilds] Unhandled promise rejection:', e.reason);
    showErrorToast('A network request failed. Check your connection and try again.');
  });
}

function showErrorToast(msg) {
  let t = document.getElementById('cbErrorToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'cbErrorToast';
    t.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;max-width:420px;padding:12px 18px;border-radius:10px;background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:#f87171;font-size:.82rem;font-weight:600;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,.3);display:flex;align-items:center;gap:10px;transition:opacity .3s';
    t.innerHTML = `<span style="font-size:1.1rem">⚠</span><span id="cbErrorToastMsg"></span><button onclick="this.parentElement.style.opacity='0'" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:1rem;padding:0 4px">×</button>`;
    document.body.appendChild(t);
  }
  document.getElementById('cbErrorToastMsg').textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 6000);
}
