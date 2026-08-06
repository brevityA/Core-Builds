#!/usr/bin/env node
/**
 * Verify the upstream v2.32 Newznab apiPath -> options.api migration against
 * a compiled, pinned AIOStreams v2.32 core tree. No credentials or network.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const configuratorRoot = resolve(here, '..');
const fixturePath = resolve(
  process.argv.includes('--fixture')
    ? process.argv[process.argv.indexOf('--fixture') + 1]
    : resolve(configuratorRoot, 'reliability/fixtures/v232-nab-migration-contract.v1.json')
);
const root = resolve(
  process.argv.includes('--root')
    ? process.argv[process.argv.indexOf('--root') + 1]
    : process.env.AIOSTREAMS_V232_ROOT || ''
);
const nodeExecutable = process.argv.includes('--node')
  ? process.argv[process.argv.indexOf('--node') + 1]
  : process.env.AIOSTREAMS_NODE || process.execPath;
const adapter = resolve(configuratorRoot, 'reliability/upstream-migration-adapter.mjs');

if (!root || root === resolve('.')) {
  throw new Error('Set AIOSTREAMS_V232_ROOT or pass --root <compiled-v2.32-checkout>.');
}
if (!existsSync(fixturePath)) throw new Error(`Fixture not found: ${fixturePath}`);
if (!existsSync(resolve(root, 'packages/core/dist/utils/config.js'))) {
  throw new Error(`Compiled v2.32 config utility missing in ${root}. Build @aiostreams/core first.`);
}

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const upstreamPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const requiredNodeMajor = Number(String(upstreamPackage.engines?.node || '').match(/>=\s*(\d+)/)?.[1] || 0);
const nodeVersionRun = spawnSync(nodeExecutable, ['--version'], { encoding: 'utf8' });
const actualNodeMajor = Number(String(nodeVersionRun.stdout || '').match(/v?(\d+)/)?.[1] || 0);
if (requiredNodeMajor && actualNodeMajor < requiredNodeMajor) {
  throw new Error(`${nodeExecutable} reports Node ${actualNodeMajor}, but upstream requires ${upstreamPackage.engines.node}. Set AIOSTREAMS_NODE to a compatible runtime.`);
}
const git = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
const actualCommit = String(git.stdout || '').trim();
if (!actualCommit || git.status !== 0 || !actualCommit.startsWith(fixture.upstreamTarget.commit)) {
  throw new Error(`Supplied source is not pinned ${fixture.upstreamTarget.commit}. Got ${actualCommit || 'no git commit'}.`);
}
const run = spawnSync(nodeExecutable, [adapter, root, fixturePath], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    SECRET_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
    BASE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'error',
  },
});

if (run.status !== 0) {
  throw new Error(`v2.32 migration adapter failed:\n${run.stderr || run.stdout}`);
}

const lines = String(run.stdout || '').trim().split('\n').filter(Boolean);
const actual = JSON.parse(lines.at(-1));
if (actual.version !== fixture.upstreamTarget.version) {
  throw new Error(`Expected upstream ${fixture.upstreamTarget.version}; supplied root reports ${actual.version}.`);
}
if (!actual.preset) throw new Error('Migrated fixture preset was not found.');
if (actual.preset.type !== fixture.expected.type || actual.preset.instanceId !== fixture.expected.instanceId) {
  throw new Error(`Migrated preset identity mismatch: ${JSON.stringify(actual.preset)}`);
}
if (JSON.stringify(actual.preset.options?.api) !== JSON.stringify(fixture.expected.options.api)) {
  throw new Error(`Migrated api object mismatch: ${JSON.stringify(actual.preset.options?.api)}`);
}
if (actual.preset.options?.seasonEpisodeStrategy !== fixture.expected.options.seasonEpisodeStrategy) {
  throw new Error(`Migrated season strategy mismatch: ${actual.preset.options?.seasonEpisodeStrategy}`);
}
for (const key of fixture.expected.removedOptionKeys || []) {
  if (Object.hasOwn(actual.preset.options || {}, key)) {
    throw new Error(`Legacy option ${key} remains after migration.`);
  }
}
const legacy = fixture.expected.legacyTorboxSearch;
if (legacy) {
  if (!actual.legacyPreset) throw new Error('Legacy torbox-search fixture preset was not found after migration.');
  if (actual.legacyPreset.type !== legacy.type || actual.legacyPreset.instanceId !== legacy.instanceId) {
    throw new Error(`Legacy preset unexpectedly changed: ${JSON.stringify(actual.legacyPreset)}`);
  }
  if (legacy.manualMigrationRequired && actual.legacyPreset.type !== 'torbox-search') {
    throw new Error('Legacy torbox-search was unexpectedly auto-renamed.');
  }
}

console.log('Upstream v2.32 Newznab migration contract: passed.');
