#!/usr/bin/env node
// One-click "Import on <host>" links for every template in the docs, generated
// from configurator/src/data/hosts.js so the host list has one source of truth.
//
// For each import block (a CardGroup of "Import on …" cards followed by the raw
// template URL) this rewrites two buttons and an "Also on" line that links every
// other host, all built from the raw URL. A host is listed only if it runs the pinned AIOStreams
// release or newer (configurator/UPSTREAM.pin): older hosts cannot load the
// templates (Anime ones need anime-tosho-new, added in 2.36.0).
//
//   node scripts/sync_import_links.mjs           rewrite the pages
//   node scripts/sync_import_links.mjs --check   exit 1 if a page is out of date
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PAGES = ['docs/template-directory.mdx', 'docs/nightly-and-labs.mdx'];
const PRIMARY = ['elfhosted', 'fortheweak'];
const TEMPLATE_URL_RE = /^https:\/\/raw\.githubusercontent\.com\/brevityA\/Core-Builds\/refs\/heads\/main\/[A-Za-z0-9_./-]+\.json$/;

const versionParts = v => String(v || '').split('.').map(n => Number.parseInt(n, 10) || 0);
export function atLeast(version, floor) {
  const a = versionParts(version), b = versionParts(floor);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
}

/** Hosts to link, primary ones first, then by the registry's own priority. */
export function eligibleHosts({ HOST_BASE_URLS, HOST_LABEL_MAP, HOST_META }, pinVersion) {
  return Object.keys(HOST_BASE_URLS)
    .filter(id => atLeast(HOST_META[id]?.aiostreamsVersion, pinVersion))
    .sort((a, b) => {
      const pa = PRIMARY.indexOf(a), pb = PRIMARY.indexOf(b);
      if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      return (HOST_META[a]?.priority ?? 99) - (HOST_META[b]?.priority ?? 99);
    })
    .map(id => ({ id, base: HOST_BASE_URLS[id], label: HOST_LABEL_MAP[id] || id }));
}

/** AIOStreams opens the template from ?template= on its About menu. */
export function importUrl(base, templateUrl) {
  return `${base}/stremio/configure?menu=about&template=${templateUrl}`;
}

function block(templateUrl, hosts, indent) {
  // The two named hosts are the buttons; if either is ever below the floor, the
  // next eligible hosts take its place so a block always keeps two buttons.
  const primary = hosts.filter(h => PRIMARY.includes(h.id));
  const buttons = [...primary, ...hosts.filter(h => !PRIMARY.includes(h.id))].slice(0, 2);
  const others = hosts.filter(h => !buttons.includes(h));
  const cards = buttons.map(h =>
    `${indent}  <Card title="Import on ${h.label}" icon="arrow-up-right" href="${importUrl(h.base, templateUrl)}" />`);
  const lines = [`${indent}<CardGroup cols={2}>`, ...cards, `${indent}</CardGroup>`];
  if (others.length) {
    lines.push(`${indent}Also on: ${others.map(h => `[${h.label}](${importUrl(h.base, templateUrl)})`).join(' · ')}`);
  }
  return lines.join('\n');
}

// An import block: a CardGroup of "Import on …" cards (possibly none), an
// optional generated "Also on:" line, then the fenced raw template URL. The raw
// URL is what people copy, so it is the source the links are rebuilt from.
const BLOCK_RE = /^([ \t]*)<CardGroup cols=\{2\}>\n(?:[ \t]*<Card title="Import on [^"]*" icon="arrow-up-right" href="[^"]*" \/>\n)*[ \t]*<\/CardGroup>(?:\n[ \t]*Also on: [^\n]*)?(\n(?:[ \t]*\n)*[ \t]*```\n[ \t]*(\S+)\n[ \t]*```)/gm;

export function rewrite(text, hosts) {
  if (!hosts.length) throw new Error('No host runs the pinned AIOStreams release; refusing to remove every import link');
  let count = 0;
  const out = text.replace(BLOCK_RE, (whole, indent, fence, templateUrl) => {
    if (!TEMPLATE_URL_RE.test(templateUrl)) {
      throw new Error(`Import block's raw URL is not a Core Builds template: ${templateUrl}`);
    }
    count++;
    return block(templateUrl, hosts, indent) + fence;
  });
  return { text: out, count };
}

async function main() {
  const check = process.argv.includes('--check');
  const hostsModule = await import(resolve(ROOT, 'configurator/src/data/hosts.js'));
  const pin = JSON.parse(readFileSync(resolve(ROOT, 'configurator/UPSTREAM.pin'), 'utf8'));
  const hosts = eligibleHosts(hostsModule, pin.version);
  let stale = false;
  for (const page of PAGES) {
    const path = resolve(ROOT, page);
    const before = readFileSync(path, 'utf8');
    const { text, count } = rewrite(before, hosts);
    if (text === before) { console.log(`${page}: ${count} import blocks, up to date`); continue; }
    if (check) { stale = true; console.log(`${page}: out of date — run node scripts/sync_import_links.mjs`); continue; }
    writeFileSync(path, text);
    console.log(`${page}: rewrote ${count} import blocks`);
  }
  if (stale) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
