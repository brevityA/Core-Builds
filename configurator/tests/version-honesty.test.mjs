/**
 * Version honesty (2026-09-06 audit, defect 1).
 *
 * The badge said v3.1, package.json said 3.1.0, and the release tag was
 * v3.7.0. CONFIGURATOR_VERSION in app.js is the single source of truth (the
 * version-sync workflow propagates it); these tests fail the suite the moment
 * any coupled surface disagrees with it again.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';

const repoRoot = new URL('../../', import.meta.url);

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const versions = JSON.parse(await readFile(new URL('versions.json', repoRoot), 'utf8'));
const cliPkg = JSON.parse(await readFile(new URL('cli/package.json', repoRoot), 'utf8'));
const corePkg = JSON.parse(await readFile(new URL('packages/core/package.json', repoRoot), 'utf8'));

// Repo convention (see .github/workflows/version-sync.yml): CONFIGURATOR_VERSION
// is raw "x.y"; semver is "x.y.0"; the built badge drops the trailing ".0".
const raw = app.match(/const CONFIGURATOR_VERSION = '([^']+)'/)?.[1];
const semverFromRaw = raw && /^\d+\.\d+$/.test(raw) ? `${raw}.0` : raw;

test('CONFIGURATOR_VERSION exists in the raw x.y convention the release workflow expects', () => {
  assert.ok(raw, 'CONFIGURATOR_VERSION not found in app.js');
  assert.match(raw, /^\d+\.\d+$/, `expected raw x.y, got "${raw}" — version-sync.yml appends ".0"`);
});

test('package.json, versions.json and sibling packages all carry the app version', () => {
  assert.equal(pkg.version, semverFromRaw, 'configurator/package.json drifted from CONFIGURATOR_VERSION');
  assert.equal(versions.configurator, semverFromRaw, 'versions.json drifted from CONFIGURATOR_VERSION');
  assert.equal(cliPkg.version, semverFromRaw, 'cli/package.json drifted from CONFIGURATOR_VERSION');
  assert.equal(corePkg.version, semverFromRaw, 'packages/core/package.json drifted from CONFIGURATOR_VERSION');
});

test('the built header badge reports the same version as package.json', async () => {
  const built = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const display = pkg.version.replace(/\.0$/, '');
  assert.ok(
    built.includes(`title="View changelog">v${display}</span>`),
    `built badge should read v${display} (CONFIGURATOR_VERSION ${raw}, package.json ${pkg.version})`,
  );
});

test('every golden template stamps the current app version', () => {
  const dir = new URL('../e2e/golden/', import.meta.url);
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const golden = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    assert.equal(
      golden.metadata?.coreBuildsVersion,
      raw,
      `${file} stamps v${golden.metadata?.coreBuildsVersion} — regenerate goldens with UPDATE_GOLDEN=1 when the version changes`,
    );
  }
});

test('the changelog leads with the current version', async () => {
  const { CHANGELOG } = await import('../src/data/changelog.js');
  assert.equal(CHANGELOG[0].v, raw, `the What's new modal would offer v${CHANGELOG[0].v} under a v${raw} badge`);
});
