/* CI: syntax-check the inline <script> of the shipped speedtest page.
 * Lives next to index.html in the repo (tools/speedtest/check-syntax.mjs).
 * Usage: node check-syntax.mjs [path-to-index.html]
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const target = process.argv[2] || new URL('./index.html', import.meta.url);
const html = readFileSync(target, 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) {
  console.error('FAIL: no <script> block found in', target);
  process.exit(1);
}
try {
  // vm.Script compiles (throws on syntax error) without executing.
  new vm.Script(m[1], { filename: 'speedtest-inline.js' });
} catch (e) {
  console.error('FAIL: inline script has a syntax error:\n' + e.message);
  process.exit(1);
}
console.log(`OK: inline script compiles (${m[1].length} chars, ${target.pathname || target})`);
