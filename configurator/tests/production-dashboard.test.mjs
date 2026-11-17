import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
test('production UI leaves saveState byte-for-byte unchanged from the approved persistence implementation', () => {
  const start = app.indexOf('function saveState()');
  const end = app.indexOf('\n}\n', start) + 2;
  assert.equal(createHash('sha256').update(app.slice(start, end)).digest('hex'), 'c10abdd6cd98caa4d533d099ac1a81baeb12b81e6b11f34a99f0c067d0a1ce27');
});
test('deployment diagnostics are driven by operation results, not timers', () => {
  const start = app.indexOf('function showDeploymentProgress(');
  const end = app.indexOf('async function simpleInstall(', start);
  assert.doesNotMatch(app.slice(start, end), /setTimeout|setInterval/);
  assert.match(app, /await resolveInstallHost\(4000\);\s*deployment.advance\(2/);
  assert.match(app, /if \(rgx.status === 'skip'\) deployment.skip/);
});
