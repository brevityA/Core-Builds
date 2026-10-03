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
// then drop the configurator's caches, unregister, and reload onto the live network copy.
// Deleting the file instead is not enough: a 404 on update does not reliably
// evict an installed worker.
//
// caches.keys() is origin-wide, and the same Pages origin hosts other tools
// with their own workers (WuPlay Genie's 'wuplay-genie-v*'). Only the
// configurator's 'cb-*' caches are ours to delete.
const OWN_CACHE_PREFIX = 'cb-';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(OWN_CACHE_PREFIX)).map((key) => caches.delete(key)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    // Best effort: some browsers reject navigate() once the worker no longer
    // controls the client; the page-side cleanup still runs on its next load.
    await Promise.all(windows.map((client) => client.navigate(client.url).catch(() => {})));
  })());
});
