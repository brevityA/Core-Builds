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
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = [
  {
    label: 'ranked regex (elfhosted whitelist)',
    url: 'https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json',
    snapshot: resolve(root, 'Filtering/upstream/vidhin05-regexes.snapshot.json'),
    // Every generated config carries the regex consts in app.js, so an old pattern
    // found here is one that allowlisted hosts start refusing the moment upstream moves.
    shipped: resolve(root, 'configurator/src/js/app.js'),
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

// Upstream reuses one name for tier variants (two "Generated Dynamic HDR" entries). Keyed by
// name alone, the later entry overwrote the earlier in the maps below, so a change to the
// earlier one was never reported: #790 listed two changes and missed the one refusing saves.
// Repeats get " [B]", " [C]"…, the suffix Filtering/ranked-regex-patterns.json already uses.
export function occurrenceKeys(list, key) {
  const seen = new Map();
  return list.map(e => {
    const k = key(e);
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    return n > 1 ? `${k} [${String.fromCharCode(64 + n)}]` : k;
  });
}

export function diff(live, pinned, key) {
  const liveKeys = occurrenceKeys(live, key);
  const pinnedKeys = occurrenceKeys(pinned, key);
  const liveSet = new Set(liveKeys);
  const pinnedSet = new Set(pinnedKeys);
  const added = liveKeys.filter(k => !pinnedSet.has(k));
  const removed = pinnedKeys.filter(k => !liveSet.has(k));
  const liveByKey = new Map(live.map((e, i) => [liveKeys[i], e]));
  const pinnedByKey = new Map(pinned.map((e, i) => [pinnedKeys[i], e]));
  const changed = [...liveByKey].filter(([k, e]) =>
    pinnedByKey.has(k) && JSON.stringify(pinnedByKey.get(k)) !== JSON.stringify(e)).map(([k]) => k);
  const reordered = added.length === 0 && removed.length === 0 &&
    liveKeys.some((k, i) => pinnedKeys[i] !== k);
  return { added, removed, changed, reordered, pinnedByKey };
}

async function main() {
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
    const shippedSrc = t.shipped ? readFileSync(t.shipped, 'utf8') : '';
    const shipped = k => {
      const p = d.pinnedByKey.get(k)?.pattern;
      return p && shippedSrc.includes(JSON.stringify(p).slice(1, -1))
        ? '  ⚠ SHIPPED — allowlisted hosts refuse saves until re-synced' : '';
    };
    let breaking = 0;
    const line = (mark, k) => { const s = shipped(k); if (s) breaking++; console.log(`    ${mark} ${k}${s}`); };
    console.log(`✗ ${t.label}: DRIFT — upstream ${live.length} entries vs pinned ${pinned.length}`);
    for (const k of d.added.slice(0, 15)) console.log(`    + added:   ${k}`);
    if (d.added.length > 15) console.log(`    … +${d.added.length - 15} more added`);
    for (const k of d.removed.slice(0, 15)) line('- removed:', k);
    if (d.removed.length > 15) console.log(`    … +${d.removed.length - 15} more removed`);
    for (const k of d.changed.slice(0, 15)) line('~ changed:', k);
    if (d.changed.length > 15) console.log(`    … +${d.changed.length - 15} more changed`);
    if (d.reordered) console.log('    ⇅ entry order changed (scores unchanged)');
    if (breaking) console.log(`    ${breaking} shipped pattern(s) affected: generated configs are being refused on allowlisted hosts now.`);
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
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
