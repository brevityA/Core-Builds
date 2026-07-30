#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const goldenDir = join(root, 'configurator/e2e/golden');
const outFile = join(root, 'configurator/data/sel-baseline.json');

const targets = [
  ['standard', 'torbox-1080p-standard.json'],
  ['standard-4k', 'torbox-4k-standard.json'],
  ['iqr', 'torbox-4k-iqr.json'],
  ['apex-mixed', 'torbox-4k-apex-mixed.json'],
  ['mixed-standard', 'torbox-mixed-standard.json'],
  ['mixed-apex-mixed', 'torbox-mixed-apex-mixed.json'],
];

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function expressions(config, key) {
  return Array.isArray(config?.[key]) ? config[key] : [];
}

const baseline = {
  generatedAt: new Date().toISOString(),
  source: 'configurator/e2e/golden',
  targets: {},
};

for (const [name, filename] of targets) {
  const path = join(goldenDir, filename);
  if (!existsSync(path)) throw new Error(`Missing golden fixture: ${relative(root, path)}`);
  const template = JSON.parse(await readFile(path, 'utf8'));
  const config = template.config || {};
  const policy = {
    preferredStreamExpressions: expressions(config, 'preferredStreamExpressions'),
    includedStreamExpressions: expressions(config, 'includedStreamExpressions'),
    excludedStreamExpressions: expressions(config, 'excludedStreamExpressions'),
    rankedStreamExpressions: expressions(config, 'rankedStreamExpressions'),
    resultLimits: config.resultLimits || null,
    dynamicAddonFetching: config.dynamicAddonFetching || null,
  };
  baseline.targets[name] = {
    fixture: relative(root, path),
    metadata: {
      id: template.metadata?.id || null,
      version: template.metadata?.version || null,
      coreBuildsVersion: template.metadata?.coreBuildsVersion || null,
    },
    counts: Object.fromEntries(Object.entries(policy).map(([key, value]) => [key, Array.isArray(value) ? value.length : value ? 1 : 0])),
    hash: hash(policy),
    policy,
  };
}

await (await import('node:fs/promises')).mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(baseline, null, 2) + '\n');
console.log(`Wrote ${relative(root, outFile)} (${Object.keys(baseline.targets).length} targets)`);
for (const [name, target] of Object.entries(baseline.targets)) console.log(`${name}: ${target.hash}`);
