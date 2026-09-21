// Core Builds — minimal offline SW (cache-first for same-origin assets, network-first for APIs)
// v3_10-2 bumps cache to invalidate old SW that cached index.html without e2e bypass
const CACHE = 'cb-v3_10-2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './styles/01-core.css',
  './styles/02-brand-theme.css',
  './styles/03-enhancements.css',
  './styles/04-landing.css',
  './styles/05-unified-ui.css',
  './styles/06-features.css',
  './styles/07-menu-parity.css',
  './vendor/qrcode.min.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // E2E bypass — never intercept when cb-e2e=1 or e2e=1 in URL (Playwright)
  if (url.searchParams.get('cb-e2e') === '1' || url.searchParams.get('e2e') === '1') return;
  // Never cache AIOStreams host probes or Stremio API or paste services
  // Use endsWith check to avoid incomplete substring sanitization (CodeQL)
  const host = url.hostname;
  const isBlockedHost = host === 'strem.io' || host.endsWith('.strem.io')
    || host === 'paste.rs' || host.endsWith('.paste.rs')
    || host === 'elfhosted.com' || host.endsWith('.elfhosted.com')
    || host === 'viren070.me' || host.endsWith('.viren070.me')
    || host === 'fortheweak.cloud' || host.endsWith('.fortheweak.cloud')
    || host === 'midnightignite.me' || host.endsWith('.midnightignite.me');
  if (url.pathname.startsWith('/api/') || isBlockedHost) {
    return;
  }
  // Never cache the SW itself or any URL with query (e2e uses ?cb-e2e=1)
  if (url.pathname.endsWith('sw.js') || url.search) return;
  // Same-origin: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
  }
});
