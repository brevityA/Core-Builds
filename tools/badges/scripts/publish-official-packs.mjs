#!/usr/bin/env node
/**
 * Emit the three official Core badge packs from the live catalog.
 * Do not hand-edit the JSON this writes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BADGES, GROUPS } from '../catalog.mjs';
import { buildBadgePack, serialiseJson, validateBadgePack } from '../core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'published');
mkdirSync(outDir, { recursive: true });

const essentialIds = BADGES.filter((badge) => badge.defaultEnabled).map((badge) => badge.id);
const noDvIds = essentialIds.filter((id) => id !== 'vis-dv');

const packs = [
  {
    file: 'core-neon-universal.json',
    label: 'Core Neon · Universal',
    state: { mode: 'universal', theme: 'neon', selectedIds: essentialIds },
  },
  {
    file: 'core-neon-enhanced.json',
    label: 'Core Neon · AIO Enhanced',
    state: { mode: 'enhanced', theme: 'neon', selectedIds: essentialIds },
  },
  {
    file: 'core-nodv-universal.json',
    label: 'Core Neon · No Dolby Vision · Universal',
    state: { mode: 'universal', theme: 'neon', selectedIds: noDvIds },
  },
];

for (const pack of packs) {
  const json = buildBadgePack(pack.state);
  validateBadgePack(json);
  const path = join(outDir, pack.file);
  writeFileSync(path, serialiseJson(json));
  console.log(
    `wrote ${pack.file} · ${json.filters.length} badges · ${json.groups.length} groups · ${pack.label}`,
  );
}

console.log(`essential groups: ${GROUPS.filter((g) => g.essential).map((g) => g.id).join(', ')}`);
