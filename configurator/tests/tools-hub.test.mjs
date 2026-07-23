import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const app=await readFile(new URL('../src/js/app.js',import.meta.url),'utf8');
const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');
test('Configurator links the read-only backup and Core Tools hub',()=>{
 assert.ok(app.includes('Back Up Addons'));
 assert.ok(app.includes('All Core Tools'));
 assert.ok(app.includes('Back up your current addons first'));
 assert.ok(app.includes('href="./account-tools/"'));
 assert.ok(app.includes('href="./tools/"'));
});
test('web build publishes both independent static utilities',()=>{
 assert.ok(build.includes("resolve(repoRoot, 'account-tools')"));
 assert.ok(build.includes("resolve(web, 'account-tools')"));
 assert.ok(build.includes("resolve(repoRoot, 'tools')"));
 assert.ok(build.includes("resolve(web, 'tools')"));
});
