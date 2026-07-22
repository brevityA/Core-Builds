import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const coreCss = await readFile(new URL('../src/styles/01-core.css', import.meta.url), 'utf8');
const featuresCss = await readFile(new URL('../src/styles/06-features.css', import.meta.url), 'utf8');

test('Quick Install password prompt renders above the Fast Lane overlay', () => {
  const passwordZ = Number(coreCss.match(/#pwdPrompt\{[^}]*z-index:(\d+)/)?.[1]);
  const fastLaneZ = Number(featuresCss.match(/\.fastlane-overlay\{[^}]*z-index:(\d+)/)?.[1]);
  assert.ok(passwordZ > fastLaneZ, `password prompt z-index ${passwordZ} must exceed Fast Lane ${fastLaneZ}`);
});

test('Other app target keeps and displays the raw manifest URL', () => {
  assert.ok(app.includes("{ key:'manifest',label:'Manifest URL', getUrl: u => u, action:'copy' }"));
  assert.ok(app.includes("showManifestModal(manifestUrl, pwd, hostLbl, target)"));
  assert.ok(!app.includes("if (state.target==='manifest') installTarget='app'"));
});

test('successful Quick Install closes its overlay before opening the result modal', () => {
  assert.ok(app.includes("document.getElementById('fastLaneModal')?.remove();\n      showManifestModal(manifestUrl, pwd, hostLbl, target);"));
});

test('mutating host requests are never raced through direct and proxy paths', () => {
  assert.ok(app.includes('function writeHostFetch'));
  assert.ok(app.includes("writeHostFetch(fastest, '/api/v1/user'"));
  assert.ok(!app.includes("raceHostFetch(fastest, '/api/v1/user', { method:'POST'"));
});
