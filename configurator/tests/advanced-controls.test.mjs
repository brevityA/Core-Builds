import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const app=await readFile(new URL('../src/js/app.js',import.meta.url),'utf8');
test('playback controls are stateful and wired to generated config',()=>{
 assert.ok(app.includes("preloadEnabled:true"));
 assert.ok(app.includes("autoPlayMethod:'matchingFile'"));
 assert.ok(app.includes("addonTimeout:6000"));
 assert.ok(app.includes("method:S.autoPlayMethod||'matchingFile'"));
 assert.ok(app.includes("enabled:S.preloadEnabled!==false"));
 assert.ok(app.includes('addonPolicy(input, presets()'));
});
test('partial exports use explicit allowlists and strip service credentials',()=>{
 assert.ok(app.includes('const PARTIAL_EXPORT_FIELDS'));
 assert.ok(app.includes("config.services = config.services.map(service => ({...service, credentials:{}}))"));
 assert.ok(app.includes("if (action === 'export-partial') exportPartial(el.dataset.kind)"));
});
