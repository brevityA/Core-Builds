#!/usr/bin/env node
import { parseArgs as parseNodeArgs } from 'node:util';
import {
  BENCHMARK_CASES,
  readManifestUrl,
  runBenchmark,
  selectBenchmarkCases,
} from './core-streams-benchmark.mjs';

let values;
try {
  ({ values } = parseNodeArgs({
    args: process.argv.slice(2),
    options: {
      json: { type: 'boolean' },
      limit: { type: 'string' },
      'delay-ms': { type: 'string' },
    },
    allowPositionals: false,
  }));
} catch (error) {
  console.error(`Invalid benchmark arguments: ${error.message}`);
  process.exit(2);
}

function integerOption(raw, name, fallback, minimum, maximum) {
  if (raw === undefined) return fallback;
  if (!/^\\d+$/.test(raw)) throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

const jsonOutput = values.json || false;
let limit;
let delayMs;
try {
  limit = integerOption(values.limit, '--limit', BENCHMARK_CASES.length, 1, BENCHMARK_CASES.length);
  delayMs = integerOption(values['delay-ms'], '--delay-ms', 1000, 0, 60_000);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

let providers;
try {
  providers = [{
    name: 'Core Streams',
    manifestUrl: readManifestUrl(process.env.CORE_STREAMS_BENCHMARK_MANIFEST_URL, 'CORE_STREAMS_BENCHMARK_MANIFEST_URL'),
  }];
  if (process.env.PENGUPLAY_BENCHMARK_MANIFEST_URL?.trim()) {
    providers.push({
      name: 'PenguPlay',
      manifestUrl: readManifestUrl(process.env.PENGUPLAY_BENCHMARK_MANIFEST_URL, 'PENGUPLAY_BENCHMARK_MANIFEST_URL'),
    });
  }
  if (process.env.HDHUB_BENCHMARK_MANIFEST_URL?.trim()) {
    providers.push({
      name: 'HDHub',
      manifestUrl: readManifestUrl(process.env.HDHUB_BENCHMARK_MANIFEST_URL, 'HDHUB_BENCHMARK_MANIFEST_URL'),
    });
  }
  if (providers.length < 2) throw new Error('Set at least one authorized comparator manifest URL (PenguPlay or HDHub)');
} catch (error) {
  console.error(error.message);
  console.error('Enter authorized Stremio manifest URLs in environment variables; values are never printed or saved.');
  process.exit(2);
}

const report = await runBenchmark(providers, selectBenchmarkCases(limit), { delayMs });
if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Core Streams add-on comparison — stream-list benchmark');
  console.log('Only result-list responses are measured; playback is not verified.');
  for (const summary of report.summaries) {
    console.log(`\n${summary.provider}`);
    console.log(`  coverage: ${summary.nonEmpty}/${summary.attempted} cases (${summary.coveragePct ?? 'n/a'}%)`);
    console.log(`  median response: ${summary.medianLatencyMs ?? 'n/a'} ms`);
    console.log(`  median result count: ${summary.medianResultCount ?? 'n/a'}`);
    console.log(`  cases with a 1080p+ hint in top five: ${summary.topFive1080pHintCases}`);
    for (const row of summary.cases) {
      const latency = row.latencyMs === null ? 'n/a' : `${row.latencyMs} ms`;
      const detail = row.metrics
        ? `${row.metrics.resultCount} results; first 1080p+ hint: ${row.metrics.first1080pPosition ?? 'none'}; max label: ${row.metrics.maxAdvertisedResolution ?? 'unknown'}`
        : row.status;
      console.log(`  ${row.title} [${row.type}] — ${row.status}, ${latency}; ${detail}`);
    }
  }
  if (report.manifestErrors.length) {
    console.log('\nManifest errors:');
    for (const item of report.manifestErrors) console.log(`  ${item.provider}: ${item.error}`);
  }
  console.log('\nCaveats: labels and counts are self-reported by the add-ons; an advertised result is not proof of playback, rights, or availability.');
}

if (report.manifestErrors.length) process.exitCode = 1;
