import { test, expect } from '@playwright/test';

test('Nuvio import falls through to dpaste when the worker and paste.rs are unavailable', async ({ page }) => {
  const requests = [];
  let uploadedTemplate = '';

  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url.includes('core-builds-cors-proxy') && url.endsWith('/paste')) {
      requests.push('worker');
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) });
    }
    if (url.startsWith('https://paste.rs/')) {
      requests.push('paste.rs');
      return route.abort('failed');
    }
    if (url.startsWith('https://dpaste.com/api/v2/')) {
      requests.push('dpaste');
      uploadedTemplate = new URLSearchParams(route.request().postData() || '').get('content') || '';
      return route.fulfill({ status: 200, contentType: 'text/plain', body: 'https://dpaste.com/nuvio-fallback' });
    }
    return route.continue();
  });

  await page.goto('/?cb-e2e=1');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
  await page.waitForFunction(() => !!window.__coreBuilds);
  // Seed a token as if the visitor had configured TMDB before switching to the
  // Nuvio route. It must not be sent to the public import/paste endpoint.
  await page.evaluate(() => window.__coreBuilds.generate({
    service: 'p2p', multiServices: ['p2p'], device: 'generic', resolution: '1080p',
    content: 'all', tmdbToken: 'NUVIO_TMDB_TOKEN_MUST_NOT_LEAK', tmdbApiKey: '',
  }));

  await page.locator('[data-action="open-fast-lane"]').click();
  await page.locator('[data-fl-target="nuvio"]').click();
  await page.locator('#btnAutoCreate').click();

  await expect(page.locator('#aioResult')).toContainText('Tap a host to import your Nuvio template');
  await expect(page.locator('#aioResult')).toContainText('TMDB credential was removed from this public import link');
  await expect(page.locator('#aioResult')).toContainText('https://dpaste.com/nuvio-fallback.txt');
  expect(requests).toEqual(['worker', 'paste.rs', 'dpaste']);
  expect(uploadedTemplate).not.toContain('NUVIO_TMDB_TOKEN_MUST_NOT_LEAK');
});
