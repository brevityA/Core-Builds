import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAddonInstall } from '../src/core/install-transaction-policy.js';

const addon = transportUrl => ({ transportName:'http', transportUrl, flags:{} });

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

test('verification passes when every expected addon is present, duplicates ignored', () => {
  const result = verifyAddonInstall({
    actual: [addon('https://a/manifest.json'), addon('https://a/manifest.json'), addon('https://b/manifest.json')],
    expectedUrls: ['https://a/manifest.json', 'https://b/manifest.json'],
  });
  assert.equal(result.ok, true);
  assert.equal(result.expectedCount, 2);
  assert.equal(result.actualCount, 2);
});
