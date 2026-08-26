#!/usr/bin/env node
/**
 * Overlay AllDebrid 1080p/4K → Premiumize and EasyDebrid named templates.
 *
 * Does not invent Stream clones. Reads AllDebrid if it is in this repo.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyStoreService, PRESETS } from './service-presets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dry = process.argv.includes('--dry-run');

const JOBS = [
  { src: 'Templates/Torbox/AllDebrid/core-nexus-alldebrid.json', service: 'premiumize', dest: 'Templates/Torbox/Premiumize/core-nexus-premiumize.json' },
  { src: 'Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid.json', service: 'premiumize', dest: 'Templates/Torbox/Premiumize/core-nexus-4k-premiumize.json' },
  { src: 'Templates/Torbox/AllDebrid/core-nexus-alldebrid.json', service: 'easydebrid', dest: 'Templates/Torbox/EasyDebrid/core-nexus-easydebrid.json' },
  { src: 'Templates/Torbox/AllDebrid/core-nexus-4k-alldebrid.json', service: 'easydebrid', dest: 'Templates/Torbox/EasyDebrid/core-nexus-4k-easydebrid.json' },
];

for (const job of JOBS) {
  const srcPath = resolve(root, job.src);
  const destPath = resolve(root, job.dest);
  const raw = await readFile(srcPath, 'utf8');
  const out = applyStoreService(JSON.parse(raw), job.service);
  const json = `${JSON.stringify(out, null, 2)}\n`;
  if (dry) {
    console.log(`would write ${job.dest} · ${json.length} bytes · ${out.metadata.name}`);
    continue;
  }
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, json);
  console.log(`wrote ${job.dest} · ${out.metadata.name}`);
}

if (dry) {
  console.log(`ok · ${JOBS.length} overlays · ${PRESETS.premiumize.storeLabel} / ${PRESETS.easydebrid.storeLabel}`);
}
