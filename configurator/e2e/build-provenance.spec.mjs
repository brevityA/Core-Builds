/**
 * Prove the bundle the BROWSER loads matches this working tree.
 *
 * global-setup.mjs already compares dist/web on disk against the source fingerprint, and that
 * catches the common failure: switch branches, forget to rebuild, test the previous branch's
 * code. But a disk check has a hole. `reuseExistingServer` lets Playwright attach to a server
 * that is already listening on the port — including one started from a DIFFERENT checkout of
 * this repo. In that case the disk check validates an artifact the browser never loads, and
 * passes while the tests run against someone else's build entirely.
 *
 * So this asserts over HTTP, against the same baseURL every other spec uses. Whatever is
 * actually serving the tests has to hand back a stamp matching this tree, no matter which
 * directory or process it came from, or when it started.
 */
import { test, expect } from '@playwright/test';
import { sourceFingerprint } from '../scripts/source-fingerprint.mjs';

test('the served bundle was built from this working tree', async ({ request, baseURL }) => {
  const expected = await sourceFingerprint();

  const res = await request.get('/.cb-build-stamp.json');
  expect(
    res.ok(),
    `no build stamp served from ${baseURL} (HTTP ${res.status()}). The server on this port is ` +
    'not serving a current dist/web — it may belong to another checkout. Stop it and rerun, ' +
    'or run: npm run build --prefix configurator',
  ).toBe(true);

  const stamp = await res.json();
  expect(
    stamp.fingerprint,
    `the SERVED bundle does not match this working tree.\n` +
    `  served: ${String(stamp.fingerprint).slice(0, 12)} (built ${stamp.builtAt})\n` +
    `  source: ${expected.slice(0, 12)}\n` +
    'Every other result in this run describes code that is not in your tree.',
  ).toBe(expected);
});
