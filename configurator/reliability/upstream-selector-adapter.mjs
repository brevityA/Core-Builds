#!/usr/bin/env node
/**
 * Executes a selector fixture through a compiled, pinned AIOStreams core tree.
 *
 * This adapter intentionally uses only AIOStreams' StreamSelector parser
 * runtime. It never starts a server, fetches providers, reads credentials, or
 * uses real media. The parent runner supplies the upstream root and fixture.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [upstreamRootArg, fixturePathArg] = process.argv.slice(2);
if (!upstreamRootArg || !fixturePathArg) {
  throw new Error('Usage: upstream-selector-adapter.mjs <compiled-aiostreams-root> <fixture.json>');
}

const upstreamRoot = resolve(upstreamRootArg);
const fixturePath = resolve(fixturePathArg);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const packageJson = JSON.parse(readFileSync(resolve(upstreamRoot, 'package.json'), 'utf8'));
const selectorPath = resolve(upstreamRoot, 'packages/core/dist/parser/streamExpression.js');
const { StreamSelector } = await import(pathToFileURL(selectorPath).href);

const selector = new StreamSelector(fixture.context || {});
const results = [];

for (const selectorFixture of fixture.selectors || []) {
  try {
    const selected = await selector.select(fixture.streams || [], selectorFixture.expression);
    results.push({
      id: selectorFixture.id,
      status: 'ok',
      streamIds: selected.map(stream => stream.id),
    });
  } catch (error) {
    results.push({
      id: selectorFixture.id,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

process.stdout.write(`${JSON.stringify({
  version: packageJson.version,
  results,
})}\n`);
