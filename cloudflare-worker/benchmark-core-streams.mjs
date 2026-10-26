#!/usr/bin/env node
import {
  BENCHMARK_CASES,
  readManifestUrl,
  runBenchmark,
} from './core-streams-benchmark.mjs';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const delayArg = args.find((arg) => arg.startsWith('--delay-ms='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : BENCHMARK_CASES.length;
const delayMs = delayArg ? Number(delayArg.slice('--delay-ms='.length)) : 1000;

if (!Number.isInteger(limit) || limit < 1 || limit > BENCHMARK_CASES.length) {
  console.error(`--limit must be an integer from 1 to ${BENCHMARK_CASES.length}`);
  process.exit(2);
}
if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 60_000) {
  console.error('--delay-ms must be an integer from 0 to 60000');
  process.exit(2);
}

let providers;
try {
  providers = [
    {
      name: 'Core Streams',
      manifestUrl: readManifestUrl(process.env.CORE_STREAMS_BENCHMARK_MANIFEST_URL, 'CORE_STREAMS_BENCHMARK_MANIFEST_URL'),
    },
    {
      name: 'PenguPlay',
      manifestUrl: readManifestUrl(process.env.PENGUPLAY_BENCHMARK_MANIFEST_URL, 'PENGUPLAY_BENCHMARK_MANIFEST_URL'),
    },
  ];
} catch (error) {
  console.error(error.message);
  console.error('Set both variables to your authorized Stremio manifest URLs. Values are never printed or saved.');
  process.exit(2);
}

const report = await runBenchmark(providers, BENCHMARK_CASES.slice(0, limit), { delayMs });
if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Core Streams vs PenguPlay — stream-list benchmark');
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
