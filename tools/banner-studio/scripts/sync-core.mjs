#!/usr/bin/env node
/**
 * Keep the inline `<script id="core">` fence in index.html byte-identical to core.mjs.
 *
 * Why this exists
 * ---------------
 * Banner Studio ships as ONE self-contained HTML file. That is a real product
 * property: the tool renders entirely client-side, and a single file can be
 * saved and opened from disk. Turning the page into an ES module
 * (`<script type="module" src="core.mjs">`) would break that in two concrete
 * ways:
 *
 *   1. `file://` module loads are blocked by CORS in every major browser, so a
 *      saved copy would boot to a blank canvas.
 *   2. Module scope is not global scope. The classic script that follows the
 *      fence reads 22 core symbols as globals (BRANDS, DEF, sanitize, rgba,
 *      makeSpec, ...), and the markup carries an inline
 *      `onclick="st.accentOverride='#FFFFFF';render()"` handler, which can only
 *      resolve against globals.
 *
 * The alternative — the precedent in `tools/badges/` — is to extract core.mjs
 * for tests and leave the HTML with its own inline copy. That has already
 * drifted there: `HANDOFF_MAX_AGE_MS` and `BADGE_BUILDER_VERSION` exist only in
 * the module, so the tested code is not the shipped code.
 *
 * So: core.mjs is the single source of truth, and the fence is generated from
 * it. `--check` fails when they diverge, which is what CI runs. Because every
 * export in core.mjs is a plain `export const` / `export function`, stripping
 * the keyword yields valid classic-script source with identical semantics.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CORE = join(here, '..', 'core.mjs');
const HTML = join(here, '..', 'index.html');

const START = '/*CORE-START*/';
const END = '/*CORE-END*/';

const BANNER = `/* AUTO-GENERATED FROM core.mjs — DO NOT EDIT THIS BLOCK BY HAND.
   Edit tools/banner-studio/core.mjs, then run:
     node tools/banner-studio/scripts/sync-core.mjs
   CI runs this with --check and fails if the two drift apart. */`;

/** Strip ES module syntax so the source can run as a classic script. */
export function toClassicScript(moduleSource) {
  const unexported = moduleSource.replace(/^export\s+(?=(const|function|class|let|var)\s)/gm, '');

  // Guard: any surviving module syntax would be a silent SyntaxError in the page.
  const leftovers = unexported.match(/^\s*(export|import)\s/gm);
  if (leftovers) {
    throw new Error(
      `core.mjs uses module syntax that cannot be inlined (${leftovers.length} occurrence(s): ` +
      `${[...new Set(leftovers.map(s => s.trim()))].join(', ')}). ` +
      `The fence only supports plain 'export const' / 'export function' declarations.`,
    );
  }
  return `${BANNER}\n${unexported.trim()}\n`;
}

function buildHtml(html, fenceBody) {
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a === -1 || b === -1 || b < a) throw new Error('CORE-START/CORE-END fence not found in index.html');
  return html.slice(0, a + START.length) + '\n' + fenceBody + html.slice(b);
}

function main(argv) {
  const check = argv.includes('--check');
  const core = readFileSync(CORE, 'utf8');
  const html = readFileSync(HTML, 'utf8');
  const next = buildHtml(html, toClassicScript(core));

  if (next === html) {
    console.log('core fence is in sync with core.mjs');
    return 0;
  }
  if (check) {
    console.error(
      'core fence is OUT OF SYNC with core.mjs.\n' +
      'The shipped inline code no longer matches the tested module.\n' +
      'Fix: node tools/banner-studio/scripts/sync-core.mjs',
    );
    return 1;
  }
  writeFileSync(HTML, next);
  console.log('index.html core fence regenerated from core.mjs');
  return 0;
}

// Only act when invoked as a CLI. `tests/inline-fence.test.mjs` imports
// `toClassicScript` from this file; running main() on import would print to the
// log and call process.exit(), which silently truncates the test run.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
