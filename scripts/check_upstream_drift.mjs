#!/usr/bin/env node
// Vidhin05 upstream regex drift watch.
//
// Core Builds uses a reviewed regex snapshot for host compatibility. It does
// not use synced stream expressions; expression URLs are intentionally absent
// from every generated and maintained template.
//
// This script compares the live upstream regex file against the pinned snapshot
// in Filtering/upstream/ and reports drift.
//
//   node scripts/check_upstream_drift.mjs            — check, exit 1 on drift
//   node scripts/check_upstream_drift.mjs --update   — re-pin snapshots after review
//
// Exit codes: 0 = in sync (or upstream unreachable — soft pass, warns only),
//             1 = drift detected, 2 = usage error.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = [
  {
    label: 'ranked regex (elfhosted whitelist)',
    url: 'https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json',
    snapshot: resolve(root, 'Filtering/upstream/vidhin05-regexes.snapshot.json'),
    key: entry => entry.name || entry.pattern?.slice(0, 80) || JSON.stringify(entry).slice(0, 80),
  },
];

const update = process.argv.includes('--update');

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'core-builds-drift-watch' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function diff(live, pinned, key) {
  const keyOf = e => key(e);
  const liveKeys = live.map(keyOf);
  const pinnedKeys = pinned.map(keyOf);
  const liveSet = new Set(liveKeys);
  const pinnedSet = new Set(pinnedKeys);
  const added = liveKeys.filter(k => !pinnedSet.has(k));
  const removed = pinnedKeys.filter(k => !liveSet.has(k));
  const liveByKey = new Map(live.map(e => [keyOf(e), e]));
  const pinnedByKey = new Map(pinned.map(e => [keyOf(e), e]));
  const changed = [...liveByKey].filter(([k, e]) =>
    pinnedByKey.has(k) && JSON.stringify(pinnedByKey.get(k)) !== JSON.stringify(e)).map(([k]) => k);
  const reordered = added.length === 0 && removed.length === 0 &&
    liveKeys.some((k, i) => pinnedKeys[i] !== k);
  return { added, removed, changed, reordered };
}

let drifted = false;
let unreachable = false;

for (const t of TARGETS) {
  let live;
  try {
    live = await fetchJson(t.url);
  } catch (err) {
    console.warn(`⚠ ${t.label}: upstream unreachable (${err.message}) — skipping (soft pass)`);
    unreachable = true;
    continue;
  }
  if (!Array.isArray(live)) {
    console.warn(`⚠ ${t.label}: upstream is no longer a JSON array — manual review required`);
    drifted = true;
    continue;
  }

  if (update) {
    writeFileSync(t.snapshot, JSON.stringify(live, null, 2) + '\n');
    console.log(`✓ ${t.label}: snapshot updated (${live.length} entries)`);
    continue;
  }

  const pinned = JSON.parse(readFileSync(t.snapshot, 'utf8'));
  if (JSON.stringify(pinned) === JSON.stringify(live)) {
    console.log(`✓ ${t.label}: in sync (${live.length} entries)`);
    continue;
  }

  drifted = true;
  const d = diff(live, pinned, t.key);
  console.log(`✗ ${t.label}: DRIFT — upstream ${live.length} entries vs pinned ${pinned.length}`);
  for (const k of d.added.slice(0, 15)) console.log(`    + added:   ${k}`);
  if (d.added.length > 15) console.log(`    … +${d.added.length - 15} more added`);
  for (const k of d.removed.slice(0, 15)) console.log(`    - removed: ${k}`);
  if (d.removed.length > 15) console.log(`    … +${d.removed.length - 15} more removed`);
  for (const k of d.changed.slice(0, 15)) console.log(`    ~ changed: ${k}`);
  if (d.changed.length > 15) console.log(`    … +${d.changed.length - 15} more changed`);
  if (d.reordered) console.log('    ⇅ entry order changed (scores unchanged)');
}

if (update) {
  console.log('\nSnapshots re-pinned. Review `git diff Filtering/upstream/` before committing.');
  process.exit(0);
}
if (drifted) {
  console.log('\nDrift detected. Review, then re-pin with: node scripts/check_upstream_drift.mjs --update');
  console.log('Review the regex snapshot before it is used in a Core Builds release.');
  console.log('Synced stream expressions remain prohibited regardless of regex snapshot status.');
  process.exit(1);
}
if (unreachable) {
  console.log('\nCould not reach upstream — no drift conclusion this run.');
}
process.exit(0);
