import { test, expect } from '@playwright/test';

// Fine-Tune → Stream Proxy. The build switches the proxy on only once AIOStreams
// would accept it (address + credential), and then emits the block its proxifier
// honours (enabled + url). The saved result was checked once against a real 2.36.0
// with a MediaFlow stand-in (v3.18): stored enabled, a wrong password refused with
// the public-IP error. This pins the UI → build path.
async function fresh(page) {
  await page.goto('/?cb-e2e=1'); // exposes window.__coreBuilds (the app's own build)
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('cb_tut_seen', '1'); });
  await page.reload();
}

const builtProxy = page => page.evaluate(() => window.__coreBuilds.generate().config.proxy);

test('the stream proxy switches on only when complete, and the build carries it', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await fresh(page);
  await page.locator('[data-action="custom-start"]').click();
  await page.locator('label[for="o_torbox-pro"]').click();
  await page.locator('[data-action="open-advanced"]').click();

  const status = page.locator('#proxyStatus');
  await expect(status).toContainText('Off.');
  await page.locator('#streamProxyCard [data-action="toggle-stream-proxy"]').click();
  await page.locator('#proxyUrl').fill('https://mfp.example.com/');
  await expect(status).toContainText('API password');
  expect((await builtProxy(page)).enabled, 'no credential yet: AIOStreams would refuse it').toBeFalsy();

  await page.locator('#proxyPassword').fill('demo4u');
  await page.locator('[data-action="toggle-proxy-service"][data-val="torbox"]').click();
  await expect(status).toContainText('TorBox through MediaFlow Proxy');
  expect(await builtProxy(page)).toEqual({
    enabled: true, id: 'mediaflow', url: 'https://mfp.example.com', credentials: 'demo4u', proxiedAddons: [], proxiedServices: ['torbox'],
  });

  await page.reload();
  expect((await builtProxy(page)).enabled, 'kept on this device').toBe(true);
  expect(errors).toEqual([]);
});
