/**
 * Refuse to run e2e against a stale bundle.
 *
 * The Playwright webServer serves `dist/web` directly. `dist/` is gitignored, so it is not
 * branch-tracked: it survives `git checkout` and keeps whatever was built last. Combined with
 * `reuseExistingServer`, that means an e2e run started right after a branch switch can execute
 * a completely different branch's JavaScript while reporting confidently about this one.
 *
 * This is not hypothetical. On 2026-08-15 a probe reported that structured Stremio errors
 * rendered as "[object Object]". The source was correct; `dist/web` still held the previous
 * branch's build. Time went into chasing a defect that did not exist, and — worse — any run
 * that had happened to pass in that state would have been meaningless.
 *
 * So: compare a fingerprint of the source tree against the stamp written by `npm run build`.
 * Mismatch fails the whole run with an actionable message rather than producing a result about
 * the wrong code. Set CB_E2E_AUTOBUILD=1 to rebuild automatically instead of failing.
 */
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { sourceFingerprint, CONFIGURATOR_ROOT, STAMP_RELATIVE } from '../scripts/source-fingerprint.mjs';

const run = promisify(execFile);
const stampPath = resolve(CONFIGURATOR_ROOT, STAMP_RELATIVE);

async function readStamp() {
  try {
    return JSON.parse(await readFile(stampPath, 'utf8'));
  } catch {
    return null;
  }
}

function fail(reason) {
  throw new Error(
    `\n\n  e2e aborted: the built bundle does not match the working tree.\n` +
    `  ${reason}\n\n` +
    `  dist/ is gitignored, so it survives a branch switch and the webServer will happily\n` +
    `  serve another branch's JavaScript. Any result from this run would describe code that\n` +
    `  is not in your working tree.\n\n` +
    `  Fix:  npm run build --prefix configurator\n` +
    `  Or:   CB_E2E_AUTOBUILD=1 npx playwright test   (rebuilds automatically)\n`,
  );
}

export default async function globalSetup() {
  const expected = await sourceFingerprint();
  let stamp = await readStamp();

  const stale = !stamp || stamp.fingerprint !== expected;

  if (stale && process.env.CB_E2E_AUTOBUILD === '1') {
    await run('npm', ['run', 'build'], { cwd: CONFIGURATOR_ROOT });
    stamp = await readStamp();
    if (!stamp || stamp.fingerprint !== expected) {
      fail('a rebuild was attempted but the stamp still does not match.');
    }
    return;
  }

  if (!stamp) fail('no build stamp found in dist/web — the bundle has never been built here.');
  if (stamp.fingerprint !== expected) {
    fail(`stamp ${stamp.fingerprint.slice(0, 12)} (built ${stamp.builtAt}) != source ${expected.slice(0, 12)}.`);
  }
}
