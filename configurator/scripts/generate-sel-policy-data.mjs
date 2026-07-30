#!/usr/bin/env node

/**
 * Regenerate the PSE arrays in sel-policy-data.js from the composed builders.
 *
 * Static fields (ISEs, ESEs, RSEs, resultLimits, dynamicAddonFetching) are
 * preserved from the existing file. Only preferredStreamExpressions are
 * regenerated.
 *
 * Usage:
 *   node scripts/generate-sel-policy-data.mjs            # overwrite in place
 *   node scripts/generate-sel-policy-data.mjs --dry-run   # print diff only
 *   node scripts/generate-sel-policy-data.mjs --check     # exit 1 if stale
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'src', 'core', 'sel-policy-data.js');

const LANGUAGE_PREFIX = [
  { enabled: true, expression: "/* Language Preference — English */ language(streams,'English')" },
  { enabled: true, expression: "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []" },
];

const DEFAULT_OPTS = { audio: 'limited', forceLimitedAudio: false, supportsAv1: false, dv: false };

async function loadBuilders() {
  const { buildStandard1080Pses, buildStandard4kPses, buildMixedPses, buildDefaultPses } =
    await import('../src/core/standard-policy.js');
  const { buildApexIqr4kPses } =
    await import('../src/core/apex-policy.js');
  return { buildStandard1080Pses, buildStandard4kPses, buildMixedPses, buildDefaultPses, buildApexIqr4kPses };
}

async function loadCurrentData() {
  const { SEL_POLICY_DATA, APEX_MIXED_PSES } = await import('../src/core/sel-policy-data.js');
  return { SEL_POLICY_DATA, APEX_MIXED_PSES };
}

function buildTarget(name, builders) {
  const { buildStandard1080Pses, buildStandard4kPses, buildMixedPses, buildDefaultPses, buildApexIqr4kPses } = builders;
  switch (name) {
    case 'standard':       return [...LANGUAGE_PREFIX, ...buildStandard1080Pses(DEFAULT_OPTS)];
    case 'standard-4k':    return [...LANGUAGE_PREFIX, ...buildStandard4kPses(DEFAULT_OPTS)];
    case 'iqr':            return [...LANGUAGE_PREFIX, ...buildApexIqr4kPses(DEFAULT_OPTS)];
    case 'mixed-standard': return [...LANGUAGE_PREFIX, ...buildMixedPses(DEFAULT_OPTS)];
    case 'mixed-apex-mixed':
    case 'apex-mixed':     return null;
    default:               throw new Error(`Unknown target: ${name}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const check = args.includes('--check');

  const builders = await loadBuilders();
  const { SEL_POLICY_DATA, APEX_MIXED_PSES } = await loadCurrentData();

  const updated = {};
  let changed = false;

  for (const [name, data] of Object.entries(SEL_POLICY_DATA)) {
    const newPses = buildTarget(name, builders);
    if (newPses === null) {
      updated[name] = data;
      continue;
    }

    const oldJson = JSON.stringify(data.preferredStreamExpressions);
    const newJson = JSON.stringify(newPses);
    if (oldJson !== newJson) {
      changed = true;
      console.log(`${name}: PSE count ${data.preferredStreamExpressions.length} → ${newPses.length}`);
    }
    updated[name] = {
      preferredStreamExpressions: newPses,
      includedStreamExpressions: data.includedStreamExpressions,
      excludedStreamExpressions: data.excludedStreamExpressions,
      rankedStreamExpressions: data.rankedStreamExpressions,
      resultLimits: data.resultLimits,
      dynamicAddonFetching: data.dynamicAddonFetching,
    };
  }

  if (!changed) {
    console.log('SEL_POLICY_DATA PSEs are up to date.');
    process.exit(0);
  }

  if (check) {
    console.error('SEL_POLICY_DATA PSEs are stale — run: node scripts/generate-sel-policy-data.mjs');
    process.exit(1);
  }

  const output = formatModule(APEX_MIXED_PSES, updated);

  if (dryRun) {
    console.log('\n--- dry-run: would write to sel-policy-data.js ---');
    console.log(`Total length: ${output.length} chars`);
    for (const [name, data] of Object.entries(updated)) {
      console.log(`  ${name}: ${data.preferredStreamExpressions.length} PSEs`);
    }
    process.exit(0);
  }

  await writeFile(DATA_PATH, output, 'utf8');
  console.log(`Wrote ${DATA_PATH} (${output.length} bytes)`);
}

function formatModule(apexMixedPses, policyData) {
  let out = `/**
 * Shared SEL policy data — authoritative expression sets for each architecture.
 *
 * Extracted from golden E2E fixtures. Do not edit by hand; regenerate with
 * scripts/generate-sel-policy-data.mjs or update via the baseline workflow.
 *
 * No browser globals, no credentials, no UI state.
 */

/** Apex Mixed PSE stack — extracted from the 4K Apex Mixed nightly template. */
export const APEX_MIXED_PSES = ${JSON.stringify(apexMixedPses, null, 2)};

export const SEL_POLICY_DATA = ${JSON.stringify(policyData, null, 2)};
`;
  return out;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
