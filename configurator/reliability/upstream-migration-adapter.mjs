#!/usr/bin/env node
/**
 * Runs a credential-free config migration fixture through compiled upstream
 * AIOStreams applyMigrations(). No server, provider, or account is used.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [upstreamRootArg, fixturePathArg] = process.argv.slice(2);
if (!upstreamRootArg || !fixturePathArg) {
  throw new Error('Usage: upstream-migration-adapter.mjs <compiled-aiostreams-root> <fixture.json>');
}

const upstreamRoot = resolve(upstreamRootArg);
const fixture = JSON.parse(readFileSync(resolve(fixturePathArg), 'utf8'));
const packageJson = JSON.parse(readFileSync(resolve(upstreamRoot, 'package.json'), 'utf8'));
const { applyMigrations } = await import(pathToFileURL(
  resolve(upstreamRoot, 'packages/core/dist/utils/config.js')
).href);

const migrated = applyMigrations(JSON.parse(JSON.stringify(fixture.input)));
const preset = migrated?.presets?.find(item => item.instanceId === fixture.expected.instanceId);
const legacyPreset = migrated?.presets?.find(
  item => item.instanceId === fixture.expected.legacyTorboxSearch?.instanceId
);

process.stdout.write(`${JSON.stringify({
  version: packageJson.version,
  preset: preset ? {
    type: preset.type,
    instanceId: preset.instanceId,
    options: preset.options,
  } : null,
  legacyPreset: legacyPreset ? {
    type: legacyPreset.type,
    instanceId: legacyPreset.instanceId,
    options: legacyPreset.options,
  } : null,
})}\n`);
