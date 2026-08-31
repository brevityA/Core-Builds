#!/usr/bin/env node
/**
 * Regenerate the configurator's schema data from pinned AIOStreams source.
 *
 *   node scripts/sync-upstream.mjs                # fetch the pinned ref, report drift, exit 1 on drift
 *   node scripts/sync-upstream.mjs --accept       # fetch, write generated files, exit 0
 *   node scripts/sync-upstream.mjs --check        # no writes; fail if generated files are stale
 *   node scripts/sync-upstream.mjs --offline      # rebuild generated files from the committed snapshot
 *   node scripts/sync-upstream.mjs --sha <sha>    # override the pin for a one-off drift preview
 *   node scripts/sync-upstream.mjs --from <dir>   # read the pinned files from a local AIOStreams checkout
 *
 * Generated files carry a "DO NOT EDIT" header and must never be hand-edited;
 * hand-written overrides live in src/data/host-capabilities.js and friends.
 *
 * Nothing here reads, logs, or writes credentials: it only touches public
 * AIOStreams source files.
 */

import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  REQUIRED_SOURCES,
  extractContract,
  emitFiles,
  diffContracts,
  formatDriftReport,
} from './lib/upstream-extract.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PIN_PATH = join(ROOT, 'UPSTREAM.pin');
const SNAPSHOT_PATH = join(ROOT, 'src/config/generated/upstream-snapshot.json');

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

async function readPin() {
  const pin = JSON.parse(await readFile(PIN_PATH, 'utf8'));
  const sha = value('--sha', pin.sha);
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error(`UPSTREAM.pin sha must be a full 40-char commit sha, got: ${sha}`);
  return { ...pin, sha };
}

async function readSnapshot() {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  try { return JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8')); } catch { return null; }
}

async function fetchOverHttp(pin) {
  const sources = {};
  for (const path of REQUIRED_SOURCES) {
    const url = `${pin.rawBase}/${pin.sha}/${path}`;
    const res = await fetch(url, { headers: { 'user-agent': 'Core-Builds-sync-upstream' } });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
    sources[path] = await res.text();
  }
  return sources;
}

/** Fallback for networks where raw.githubusercontent.com is unreachable but git is not. */
async function fetchOverGit(pin) {
  const dir = await mkdtemp(join(tmpdir(), 'aios-pin-'));
  const run = (args) => new Promise((resolve, reject) => {
    execFile('git', args, { cwd: dir, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(new Error(`git ${args.join(' ')}: ${err.message}`));
      else resolve(stdout);
    });
  });
  await run(['init', '--quiet']);
  await run(['remote', 'add', 'origin', `https://github.com/${pin.repo}.git`]);
  await run(['fetch', '--quiet', '--depth', '1', 'origin', pin.sha]);
  const sources = {};
  for (const path of REQUIRED_SOURCES) sources[path] = await run(['show', `FETCH_HEAD:${path}`]);
  await rm(dir, { recursive: true, force: true });
  return sources;
}

/** Read the pinned files out of an existing local AIOStreams checkout. */
async function fetchFromDir(root) {
  const sources = {};
  for (const path of REQUIRED_SOURCES) sources[path] = await readFile(join(root, path), 'utf8');
  return sources;
}

async function fetchSources(pin) {
  const local = value('--from', null);
  if (local) {
    process.stderr.write(`reading pinned sources from ${local}\n`);
    return fetchFromDir(local);
  }
  process.stderr.write(`fetching ${REQUIRED_SOURCES.length} sources at ${pin.sha.slice(0, 12)}\n`);
  try {
    return await fetchOverHttp(pin);
  } catch (error) {
    process.stderr.write(`raw HTTP fetch unavailable (${error.message}); falling back to git\n`);
    return fetchOverGit(pin);
  }
}

/** Rebuild the exact source-free contract stored in the committed snapshot. */
async function offlineContract() {
  const snapshot = await readSnapshot();
  if (!snapshot) throw new Error('--offline needs src/config/generated/upstream-snapshot.json; run a networked sync first');
  return snapshot;
}

async function writeFiles(files) {
  const written = [];
  for (const [relative, contents] of Object.entries(files)) {
    const target = join(ROOT, relative);
    await mkdir(dirname(target), { recursive: true });
    const before = existsSync(target) ? await readFile(target, 'utf8') : null;
    if (before === contents) continue;
    await writeFile(target, contents, 'utf8');
    written.push(relative);
  }
  return written;
}

async function staleFiles(files) {
  const stale = [];
  for (const [relative, contents] of Object.entries(files)) {
    const target = join(ROOT, relative);
    const before = existsSync(target) ? await readFile(target, 'utf8') : null;
    if (before !== contents) stale.push(relative);
  }
  return stale;
}

async function main() {
  const pin = await readPin();
  const previous = await readSnapshot();

  const contract = has('--offline')
    ? await offlineContract()
    : extractContract(await fetchSources(pin), pin);

  const files = emitFiles(contract);
  const diff = diffContracts(previous, contract);
  const drifted = diff.added.length + diff.removed.length + diff.changed.length > 0;

  process.stdout.write(formatDriftReport(diff, contract, previous?.upstream?.sha) + '\n');

  if (has('--check')) {
    const stale = await staleFiles(files);
    if (stale.length) {
      process.stderr.write(`\nGenerated files are stale:\n  ${stale.join('\n  ')}\n`);
      process.stderr.write('Run `npm run sync:upstream -- --accept` and review the diff.\n');
      process.exitCode = 1;
      return;
    }
    process.stdout.write('\nGenerated files match the pinned contract.\n');
    return;
  }

  const written = await writeFiles(files);
  if (written.length) process.stdout.write(`\nWrote:\n  ${written.join('\n  ')}\n`);
  else process.stdout.write('\nGenerated files already byte-identical — nothing written.\n');

  if (drifted && !has('--accept')) {
    process.stderr.write(
      '\nUpstream contains schema changes that have not been reviewed.\n' +
      'Read the drift report above, update the affected policies, then re-run with --accept.\n'
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`sync-upstream failed: ${error.message}\n`);
  process.exitCode = 2;
});
