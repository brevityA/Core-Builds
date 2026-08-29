#!/usr/bin/env node
/**
 * aios-regen CLI
 *
 *   node scripts/aios-regen/cli.mjs extract source [--pin]
 *   node scripts/aios-regen/cli.mjs extract host [url]
 *   node scripts/aios-regen/cli.mjs diff [--fail]
 *   node scripts/aios-regen/cli.mjs pin
 *   node scripts/aios-regen/cli.mjs generate [--recipe path] [--host url] [--source] [--out path]
 *   node scripts/aios-regen/cli.mjs heal <template.json> [--host url] [--out path]
 *   node scripts/aios-regen/cli.mjs serve
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  extractSource,
  extractHost,
  compact,
  diffContracts,
  loadSnapshot,
  saveSnapshot,
  mergeContracts,
  DEFAULT_HOST,
  SNAPSHOT_PATH,
  ROOT,
} from './contract.mjs';
import { generateTemplate, healTemplate, defaultRecipe } from './generate.mjs';

const args = process.argv.slice(2);
const cmd = args[0];
const flags = new Set(args.filter((a) => a.startsWith('--')));
function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return fallback;
}
function positional(n) {
  return args.filter((a) => !a.startsWith('--'))[n];
}

function printDiff(diff) {
  if (!diff.drifted) {
    console.log(`✓ in sync  fingerprint=${diff.liveFingerprint}`);
    return;
  }
  console.log(`✗ DRIFT  severity=${diff.severity}  ${diff.pinnedFingerprint} → ${diff.liveFingerprint}`);
  for (const c of diff.changes) {
    const items = Array.isArray(c.items) ? c.items : [c.items];
    console.log(`  ${c.change.padEnd(8)} ${c.surface}`);
    for (const item of items.slice(0, 20)) {
      const extra = c.detail ? `  (${JSON.stringify(c.detail)})` : '';
      console.log(`           ${c.change === 'added' ? '+' : c.change === 'removed' ? '-' : '~'} ${item}${extra}`);
    }
    if (items.length > 20) console.log(`           … +${items.length - 20} more`);
  }
}

async function main() {
  if (!cmd || cmd === 'help' || flags.has('--help')) {
    console.log('aios-regen — AIOStreams contract watcher for Core Builds');
    console.log('');
    console.log('Commands:');
    console.log('  extract source [--pin]          Fingerprint GitHub main, write snapshot');
    console.log('  extract host [url]              Live /api/v1/status');
    console.log('  diff [--fail]                   Exit 1 on drift');
    console.log('  pin                             Re-pin after review');
    console.log('  generate [--host url] [--out f] Generate template from recipe + contract');
    console.log('  heal <template.json> [--out f]  Patch existing template against contract');
    console.log('  serve                           UI on :3333');
    return;
  }

  if (cmd === 'serve') {
    await import('./serve.mjs');
    return;
  }

  if (cmd === 'extract' && positional(1) === 'source') {
    console.log('Extracting AIOStreams source contract from GitHub…');
    const contract = await extractSource();
    const small = compact(contract);
    console.log(JSON.stringify({
      fingerprint: small.fingerprint,
      commit: small.commit,
      counts: small.counts,
      requiredOptions: small.requiredOptions,
      hotspots: small.hotspots,
    }, null, 2));
    if (flags.has('--pin') || flags.has('--update')) {
      const path = saveSnapshot(contract);
      console.log(`Pinned snapshot → ${path}`);
    }
    return;
  }

  if (cmd === 'extract' && positional(1) === 'host') {
    const url = positional(2) || opt('host', DEFAULT_HOST);
    console.log(`Extracting live host contract from ${url} …`);
    const contract = await extractHost(url);
    const small = compact(contract);
    console.log(JSON.stringify({
      fingerprint: small.fingerprint,
      host: small.host,
      version: small.version,
      channel: small.channel,
      counts: small.counts,
      requiredOptions: small.requiredOptions,
      serviceIds: small.serviceIds,
    }, null, 2));
    return;
  }

  if (cmd === 'pin') {
    const contract = await extractSource();
    const path = saveSnapshot(contract);
    console.log(`Pinned ${contract.fingerprint} → ${path}`);
    return;
  }

  if (cmd === 'diff') {
    const pinned = loadSnapshot();
    if (!pinned) {
      console.error(`No snapshot at ${SNAPSHOT_PATH}. Run: node scripts/aios-regen/cli.mjs extract source --pin`);
      process.exit(2);
    }
    const live = compact(await extractSource());
    const diff = diffContracts(pinned, live);
    printDiff(diff);
    if (diff.drifted && (flags.has('--fail') || !flags.has('--no-fail'))) {
      process.exit(1);
    }
    return;
  }

  if (cmd === 'generate') {
    const recipePath = opt('recipe', resolve(ROOT, 'recipes/core-nexus.json'));
    let recipe = defaultRecipe();
    try {
      recipe = { ...recipe, ...JSON.parse(readFileSync(recipePath, 'utf8')) };
    } catch {
      console.warn(`Recipe ${recipePath} not read; using defaults.`);
    }
    if (opt('service')) recipe.service = opt('service');
    if (opt('resolution')) recipe.resolution = opt('resolution');
    if (opt('device')) recipe.device = opt('device');
    if (opt('profile')) recipe.profile = opt('profile');

    let source = loadSnapshot();
    let host = null;
    if (!source || flags.has('--source')) {
      try {
        source = compact(await extractSource());
      } catch (err) {
        console.warn(`Source extract failed: ${err.message}`);
      }
    }
    const hostUrl = opt('host', DEFAULT_HOST);
    try {
      host = await extractHost(hostUrl);
    } catch (err) {
      console.warn(`Host extract failed: ${err.message}`);
    }
    if (!source && !host) throw new Error('Need at least a source snapshot or a reachable host.');
    const contract = mergeContracts(source, host);
    const { template, warnings, notes } = generateTemplate(recipe, contract);
    for (const n of notes) console.log(`· ${n}`);
    for (const w of warnings) console.warn(`! ${w}`);
    const out = opt('out', resolve(process.cwd(), `${recipe.id || 'regen'}.json`));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(template, null, 2) + '\n');
    console.log(`Wrote ${out}  presets=${template.config.presets.length}`);
    return;
  }

  if (cmd === 'heal') {
    const file = positional(1);
    if (!file) throw new Error('heal requires a template json path');
    const input = JSON.parse(readFileSync(file, 'utf8'));
    let source = loadSnapshot();
    let host = null;
    try {
      host = await extractHost(opt('host', DEFAULT_HOST));
    } catch (err) {
      console.warn(`Host extract failed: ${err.message}`);
    }
    if (!source) {
      try { source = compact(await extractSource()); } catch { /* optional */ }
    }
    const contract = mergeContracts(source, host);
    const { template, warnings, notes } = healTemplate(input, contract);
    for (const n of notes) console.log(`· ${n}`);
    for (const w of warnings) console.warn(`! ${w}`);
    const out = opt('out', file.replace(/\.json$/, '.healed.json'));
    writeFileSync(out, JSON.stringify(template, null, 2) + '\n');
    console.log(`Wrote ${out}`);
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  process.exit(2);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
