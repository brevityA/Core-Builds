// Core Builds — minimal offline SW (cache-first for same-origin assets, network-first for APIs)
const CACHE = 'cb-v3_10-1';
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
  // Never cache AIOStreams host probes or Stremio API or paste services
  if (url.pathname.startsWith('/api/') || url.hostname.includes('strem.io') || url.hostname.includes('paste.rs') || url.hostname.includes('elfhosted.com') || url.hostname.includes('viren070.me')) {
    return;
  }
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
