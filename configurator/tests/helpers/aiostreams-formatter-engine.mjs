/**
 * AIOStreams' own formatter engine, for tests and preview generation only.
 *
 * The engine is AGPL, so it is never copied into this MIT repository. This
 * helper fetches packages/core/src/formatters/engine/* at the commit pinned in
 * configurator/UPSTREAM.pin into a temporary folder, bundles it with the
 * esbuild the build already uses, and imports it. Nothing it downloads is
 * written inside the repository.
 *
 * `render()` reproduces the thin wrapper AIOStreams puts around the engine
 * (packages/core/src/formatters/base.ts, `compileTemplate` and
 * `compileWithEngine`): how variables are read, the comparators, the removal
 * of blank and removed lines, and the {tools.newLine} pass. The template
 * language itself (parser, modifiers, conditionals) is the real engine, so a
 * template that renders here renders the same way in AIOStreams. What this
 * cannot show is the client: fonts, emoji and line wrapping are the player's.
 *
 * The only module not fetched is utils/constants.ts, which pulls in AIOStreams'
 * database and config layers; it is replaced by its own LANGUAGES list, the one
 * export the engine reads from it.
 */

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const PIN = JSON.parse(readFileSync(join(here, '..', '..', 'UPSTREAM.pin'), 'utf8'));

const ENTRY_MODULES = ['compile', 'fields', 'sentinels', 'comparators'];
const STUBBED = 'utils/constants.js';

let enginePromise = null;

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

async function download(out) {
  const base = `${PIN.rawBase}/${PIN.sha}/packages/core/src/`;
  const seen = new Set();
  const visit = async (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const source = await fetchText(base + rel.replace(/\.js$/, '.ts'));
    const file = join(out, rel.replace(/\.js$/, '.ts'));
    mkdirSync(dirname(file), { recursive: true });
    if (rel === STUBBED) {
      const languages = source.match(/const LANGUAGES = \[[\s\S]*?\](?: as const)?;/);
      if (!languages) throw new Error('utils/constants.ts no longer defines LANGUAGES; update the formatter engine helper');
      writeFileSync(file, `export ${languages[0]}\n`);
      return;
    }
    writeFileSync(file, source);
    for (const match of source.matchAll(/(?:from|import)\s*'(\.[^']+)'/g)) {
      await visit(posix.normalize(posix.join(posix.dirname(rel), match[1])));
    }
  };
  for (const name of ENTRY_MODULES) await visit(`formatters/engine/${name}.js`);
  return seen.size;
}

/** Load the pinned engine once per process. Rejects when it cannot be fetched. */
export function loadFormatterEngine() {
  enginePromise ??= (async () => {
    const out = mkdtempSync(join(tmpdir(), 'aio-formatter-engine-'));
    await download(out);
    const entry = join(out, 'entry.ts');
    writeFileSync(entry, ENTRY_MODULES.map(name => `export * as ${name} from './formatters/engine/${name}.ts';`).join('\n'));
    const { build } = await import('esbuild');
    const outfile = join(out, 'engine.mjs');
    await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error' });
    const engine = await import(pathToFileURL(outfile).href);
    return createRenderer(engine);
  })();
  return enginePromise;
}

function createRenderer({ compile, fields, sentinels, comparators }) {
  const read = (source, parseValue) => {
    const [section, property] = String(source).trim().split('.');
    if (!section || !property) return undefined;
    const canonical = fields.canonicaliseField(section, property);
    return canonical ? parseValue?.[canonical[0]]?.[canonical[1]] : undefined;
  };
  const hooks = {
    resolveVariable: (source, parseValue) => {
      const value = read(source, parseValue);
      return value == null ? undefined : String(value);
    },
    resolveValues: (source, parseValue) => {
      const value = read(source, parseValue);
      if (value == null) return undefined;
      return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [String(value)];
    },
    comparators: comparators.comparatorFunctions,
  };
  const cache = new Map();
  /** Render one formatter template for one parse value, as AIOStreams would. */
  function render(template, parseValue) {
    if (!cache.has(template)) cache.set(template, compile.compileTemplate(template, hooks));
    return cache.get(template)(parseValue)
      .split('\n')
      .filter(line => line.trim() !== '' && !line.includes(sentinels.REMOVE_LINE_SENTINEL))
      .join('\n')
      .replaceAll(sentinels.NEW_LINE_SENTINEL, '\n');
  }
  // AIOStreams always sets every registered field (base.ts
  // convertStreamToParseValue): null when unknown, false for flags. A fixture
  // that leaves a field undefined renders "{unknown_propertyName(...)}" where
  // the real thing renders nothing, so fixtures start from this.
  const FLAGS = new Set(['library', 'subbed', 'dubbed', 'remastered', 'regraded', 'repack', 'proper', 'uncensored',
    'unrated', 'upscaled', 'hasChapters', 'seasonPack', 'private', 'proxied', 'seadex', 'seadexBest', 'preloading', 'idMatched']);
  function parseValue(partial = {}) {
    const value = {};
    for (const [section, names] of Object.entries(fields.FIELD_REGISTRY)) {
      value[section] = Object.fromEntries(names.map(name => [name, section === 'stream' && FLAGS.has(name) ? false : null]));
      Object.assign(value[section], partial[section] || {});
    }
    return value;
  }
  return { render, parseValue, version: PIN.version };
}
