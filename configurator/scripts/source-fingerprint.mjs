/**
 * Fingerprint of every source input the build reads.
 *
 * Why this exists: `configurator/dist/` is gitignored, so it is NOT branch-tracked. It
 * survives `git checkout`, and the Playwright webServer serves it directly
 * (`python3 -m http.server -d dist/web`). Switch branches, run e2e without rebuilding, and
 * the browser silently executes the bundle from whichever branch was built last — the suite
 * reports green (or red) about code that is not the code under test.
 *
 * That happened on 2026-08-15: a probe reported a rendering defect that turned out to be a
 * stale artifact from another branch, not the source. The build now stamps this fingerprint
 * into dist/, and the e2e global setup refuses to run when the stamp does not match.
 *
 * Both sides import THIS module so the two fingerprints cannot drift apart.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const CONFIGURATOR_ROOT = resolve(here, '..');
export const STAMP_RELATIVE = 'dist/web/.cb-build-stamp.json';

// Everything esbuild bundles or the shell template interpolates. package.json is included
// because the version string is baked into the built shell. The build also publishes the
// sibling tools trees verbatim; they must be fingerprinted or Playwright can silently serve
// a stale Badge Builder / Account Manager after a branch switch.
const SOURCE_DIRS = ['src', '../tools', '../account-tools'];
const SOURCE_FILES = ['package.json'];
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'test-results', 'playwright-report']);

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out; // a missing optional directory is not a fingerprint input
  }
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/**
 * @returns {Promise<string>} stable sha256 over the sorted (path, content) pairs of every
 * build input. Content-based, not mtime-based, so a checkout that rewrites timestamps
 * without changing bytes does not produce a false mismatch.
 */
export async function sourceFingerprint(root = CONFIGURATOR_ROOT) {
  const files = [];
  for (const dir of SOURCE_DIRS) await walk(resolve(root, dir), files);
  for (const file of SOURCE_FILES) {
    const full = resolve(root, file);
    try {
      if ((await stat(full)).isFile()) files.push(full);
    } catch { /* absent — skip */ }
  }

  // Sort by POSIX-normalised relative path so the digest is platform-stable.
  const rows = files
    .map(full => [relative(root, full).split(sep).join('/'), full])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const hash = createHash('sha256');
  for (const [rel, full] of rows) {
    hash.update(rel);
    hash.update('\0');
    hash.update(await readFile(full));
    hash.update('\0');
  }
  return hash.digest('hex');
}
