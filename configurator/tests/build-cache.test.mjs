import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const buildScript = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
const sourceFingerprint = await readFile(new URL('../scripts/source-fingerprint.mjs', import.meta.url), 'utf8');

test('web build versions JavaScript and CSS URLs from content hashes', () => {
  assert.match(buildScript, /createHash\('sha256'\)/);
  assert.ok(buildScript.includes('app.js?v=${assetVersions.js}'));
  assert.ok(buildScript.includes('app.css?v=${assetVersions.css}'));
});

test('web build fails when versioned asset references are missing', () => {
  assert.ok(buildScript.includes("throw new Error('Web build is missing content-versioned asset URLs')"));
});

test('build provenance includes independently published tools trees', () => {
  assert.ok(sourceFingerprint.includes("'../tools'"));
  assert.ok(sourceFingerprint.includes("'../account-tools'"));
  assert.ok(sourceFingerprint.includes("'node_modules'"));
});
