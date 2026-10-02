// Core Builds — service worker kill switch.
//
// The previous worker served every same-origin file cache-first and never
// revalidated, under a cache name ('cb-v3_10-2') that was not bumped after
// v3.10. Anyone it installed for kept running that build indefinitely. Pages
// never served it for /configurator/ itself, but it was live under
// /configurator/dist/ and /configurator/dist/web/.
//
// The page no longer registers a worker. This file stays deployed so browsers
// that still hold the old one pick up these new bytes on their next visit,
// then drop every cache, unregister, and reload onto the live network copy.
// Deleting the file instead is not enough: a 404 on update does not reliably
// evict an installed worker.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    for (const client of windows) client.navigate(client.url);
  })());
});
