#!/usr/bin/env node
/**
 * Emit the three official Core badge packs from the live catalog.
 * Do not hand-edit the JSON this writes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BADGE_ASSET_BASE, BADGES, GROUPS } from '../catalog.mjs';
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

// The artwork index: every badge image, for formatter and pack authors who
// want the art without the Badge Builder. Generated from the catalog; the
// licence and attribution travel with it.
const index = {
  name: 'Core Builds badge artwork',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'Badge artwork: Core Builds (brevityA/Core-Builds), CC BY 4.0',
  source: 'https://github.com/brevityA/Core-Builds/tree/main/tools/badges/assets',
  groups: GROUPS.map(({ id, name, description }) => ({ id, name, description })),
  badges: BADGES.map(({ id, name, groupId, assetLabel }) => ({
    id,
    name,
    group: groupId,
    label: assetLabel,
    png: `${BADGE_ASSET_BASE}/${id}.png`,
    svg: `${BADGE_ASSET_BASE}/${id}.svg`,
  })),
};
writeFileSync(join(outDir, 'badges.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(`wrote badges.json · ${index.badges.length} badges · ${index.groups.length} groups`);
