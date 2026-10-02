import { fileURLToPath } from 'node:url';

/**
 * Serve checked-in splash previews and stub the non-essential visit counter.
 * These interaction/contract tests must not fail because an image CDN is offline.
 * Match only those images and counter paths: AIOStreams, update, paste and credential transports are
 * left to each spec's own mocks, and console/page errors are still asserted.
 */
export async function mockSplashRequests(page) {
  await page.route(url =>
    url.hostname === 'core-builds-cors-proxy.tlorenzato26.workers.dev'
      && /^\/api\/(stats|visit|generate)$/.test(url.pathname),
    route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ visits: 4211, generates: 987 }) }));
  const names = new Set(['family-v4', 'apex-v2', 'ultra', 'minimal', 'tv', 'core-syntax-v3']);
  await page.route('https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/Formatters/*-preview.svg', route => {
    const filename = new URL(route.request().url()).pathname.split('/').pop();
    const name = filename.replace(/-preview\.svg$/, '');
    if (!names.has(name) || route.request().resourceType() !== 'image') return route.fallback();
    return route.fulfill({
      path: fileURLToPath(new URL(`../../../Assets/Formatters/${filename}`, import.meta.url)),
      contentType: 'image/svg+xml',
    });
  });
}
