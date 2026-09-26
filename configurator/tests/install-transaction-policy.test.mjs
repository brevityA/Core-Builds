import test from 'node:test';
import assert from 'node:assert/strict';
import { planAddonInstall, verifyAddonInstall, createInstallReceipt } from '../src/core/install-transaction-policy.js';

const addon = transportUrl => ({ transportName:'http', transportUrl, flags:{} });

test('install plan preserves order, removes selected addons, and avoids duplicates', () => {
  const plan = planAddonInstall({
    existing: [addon('https://one/manifest.json'), addon('https://old/stremio/x/manifest.json'), addon('https://one/manifest.json')],
    desiredUrls: ['https://new/stremio/y/manifest.json', 'https://one/manifest.json'],
    removeWhen: a => a.transportUrl.startsWith('https://old/'),
  });
  assert.deepEqual(plan.after.map(a => a.transportUrl), ['https://one/manifest.json', 'https://new/stremio/y/manifest.json']);
  assert.equal(plan.removed.length, 1);
  assert.equal(plan.added.length, 1);
});

test('verification reports missing and unexpectedly retained addons', () => {
  const result = verifyAddonInstall({
    actual: [addon('https://kept/manifest.json'), addon('https://old/manifest.json')],
    expectedUrls: ['https://kept/manifest.json', 'https://missing/manifest.json'],
    absentUrls: ['https://old/manifest.json'],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ['https://missing/manifest.json']);
  assert.deepEqual(result.unexpectedlyPresent, ['https://old/manifest.json']);
});

test('receipt contains counts and reason state but no addon URLs or credentials', () => {
  const receipt = createInstallReceipt({
    status:'verified', operation:'full-stack', beforeCount:4, afterCount:5,
    verification:{ ok:true, missing:[], unexpectedlyPresent:[] }, repaired:true,
  });
  assert.equal(receipt.verification.ok, true);
  assert.equal(receipt.repaired, true);
  assert.equal(JSON.stringify(receipt).includes('https://'), false);
  assert.equal(JSON.stringify(receipt).includes('authKey'), false);
});
