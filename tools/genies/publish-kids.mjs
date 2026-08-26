#!/usr/bin/env node
/**
 * Overlay Core Nexus Stream → Templates/Torbox/Kids/core-nexus-kids.json
 *
 * Does not invent a template. Reads Stream if it is in this repo.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyKidsToTemplate, KIDS_TEMPLATE_URL } from './kids.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const srcPath = resolve(root, 'Templates/Torbox/Single/core-nexus-stream.json');
const destPath = resolve(root, 'Templates/Torbox/Kids/core-nexus-kids.json');
const dry = process.argv.includes('--dry-run');

const raw = await readFile(srcPath, 'utf8');
const stream = JSON.parse(raw);
const kids = applyKidsToTemplate(stream, { sourceUrl: KIDS_TEMPLATE_URL });
const json = `${JSON.stringify(kids, null, 2)}\n`;

if (dry) {
  console.log(`would write ${destPath} · ${json.length} bytes · ${kids.metadata.name}`);
  process.exit(0);
}

await mkdir(dirname(destPath), { recursive: true });
await writeFile(destPath, json);
console.log(`wrote Templates/Torbox/Kids/core-nexus-kids.json · ${kids.metadata.name}`);
