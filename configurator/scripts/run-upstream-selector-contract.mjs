#!/usr/bin/env node
/**
 * Cross-version AIOStreams selector contract runner.
 *
 * Uses compiled upstream AIOStreams cores supplied by the caller. It performs
 * no network access and uses only synthetic, credential-free streams.
 *
 * Example:
 *   AIOSTREAMS_V231_ROOT=/work/AIOStreams-2.31.1 \
 *   AIOSTREAMS_V232_ROOT=/work/AIOStreams-2.32.0 \
 *   AIOSTREAMS_NODE=/path/to/node \
 *   node configurator/scripts/run-upstream-selector-contract.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const configuratorRoot = resolve(here, '..');
const defaultFixture = resolve(configuratorRoot, 'reliability/fixtures/selector-contract.v1.json');
const adapter = resolve(configuratorRoot, 'reliability/upstream-selector-adapter.mjs');

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const fixturePath = resolve(argument('--fixture') || defaultFixture);
const nodeExecutable = argument('--node') || process.env.AIOSTREAMS_NODE || process.execPath;
const targets = [
  {
    version: '2.31.1',
    root: argument('--v231-root') || process.env.AIOSTREAMS_V231_ROOT,
  },
  {
    version: '2.32.0',
    root: argument('--v232-root') || process.env.AIOSTREAMS_V232_ROOT,
  },
];

if (!existsSync(fixturePath)) throw new Error(`Fixture not found: ${fixturePath}`);
if (!existsSync(adapter)) throw new Error(`Adapter not found: ${adapter}`);

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const failures = [];
let checks = 0;

function parseAdapterOutput(stdout) {
  const lines = String(stdout || '').trim().split('\n').filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Adapter dependencies may emit a harmless log line before JSON.
    }
  }
  throw new Error(`Adapter did not emit JSON. Output:\n${stdout}`);
}

for (const target of targets) {
  if (!target.root) {
    failures.push(`${target.version}: missing upstream root. Set ${target.version === '2.31.1' ? 'AIOSTREAMS_V231_ROOT' : 'AIOSTREAMS_V232_ROOT'} or pass the matching CLI argument.`);
    continue;
  }

  const root = resolve(target.root);
  const selectorDist = resolve(root, 'packages/core/dist/parser/streamExpression.js');
  if (!existsSync(selectorDist)) {
    failures.push(`${target.version}: compiled selector runtime missing at ${selectorDist}. Build @aiostreams/core first.`);
    continue;
  }
  const expectedCommit = fixture.upstreamTargets?.[target.version]?.commit;
  const upstreamPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const requiredNodeMajor = Number(String(upstreamPackage.engines?.node || '').match(/>=\s*(\d+)/)?.[1] || 0);
  const nodeVersionRun = spawnSync(nodeExecutable, ['--version'], { encoding: 'utf8' });
  const actualNodeMajor = Number(String(nodeVersionRun.stdout || '').match(/v?(\d+)/)?.[1] || 0);
  if (requiredNodeMajor && actualNodeMajor < requiredNodeMajor) {
    failures.push(`${target.version}: ${nodeExecutable} reports Node ${actualNodeMajor}, but upstream requires ${upstreamPackage.engines.node}. Set AIOSTREAMS_NODE to a compatible runtime.`);
    continue;
  }
  const git = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const actualCommit = String(git.stdout || '').trim();
  if (!actualCommit || git.status !== 0 || (expectedCommit && !actualCommit.startsWith(expectedCommit))) {
    failures.push(`${target.version}: supplied source is not the pinned commit ${expectedCommit || '(missing fixture commit)'}. Got ${actualCommit || 'no git commit'}.`);
    continue;
  }

  const run = spawnSync(nodeExecutable, [adapter, root, fixturePath], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // Synthetic test-only value required by the upstream validator. Never a
      // user secret and never written into fixture output.
      SECRET_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
      BASE_URL: 'http://localhost:3000',
      LOG_LEVEL: 'error',
    },
  });

  if (run.status !== 0) {
    failures.push(`${target.version}: upstream adapter failed.\n${run.stderr || run.stdout}`);
    continue;
  }

  let actual;
  try {
    actual = parseAdapterOutput(run.stdout);
  } catch (error) {
    failures.push(`${target.version}: ${error.message}`);
    continue;
  }

  if (actual.version !== target.version) {
    failures.push(`${target.version}: supplied root reports upstream package ${actual.version}`);
    continue;
  }

  const actualById = new Map((actual.results || []).map(result => [result.id, result]));
  for (const selectorFixture of fixture.selectors || []) {
    checks += 1;
    const expected = selectorFixture.expected?.[target.version];
    const result = actualById.get(selectorFixture.id);
    if (!expected) {
      failures.push(`${target.version}/${selectorFixture.id}: fixture has no expected result`);
      continue;
    }
    if (!result) {
      failures.push(`${target.version}/${selectorFixture.id}: upstream adapter returned no result`);
      continue;
    }

    if (result.status !== expected.status) {
      failures.push(`${target.version}/${selectorFixture.id}: expected ${expected.status}, got ${result.status}${result.error ? ` (${result.error})` : ''}`);
      continue;
    }
    if (expected.status === 'ok') {
      const expectedIds = expected.streamIds || [];
      const actualIds = result.streamIds || [];
      if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
        failures.push(`${target.version}/${selectorFixture.id}: expected ${JSON.stringify(expectedIds)}, got ${JSON.stringify(actualIds)}`);
      }
    } else if (expected.errorIncludes && !String(result.error || '').includes(expected.errorIncludes)) {
      failures.push(`${target.version}/${selectorFixture.id}: expected error containing ${JSON.stringify(expected.errorIncludes)}, got ${JSON.stringify(result.error || '')}`);
    }
  }
}

if (failures.length) {
  console.error('Upstream selector contract: FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Upstream selector contract: ${checks} checks passed across ${targets.length} pinned versions.`);
}
