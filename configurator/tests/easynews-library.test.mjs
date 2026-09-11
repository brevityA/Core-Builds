/**
 * EasyNews × Library — the fixture half of audit defect 2.
 *
 * AIOStreams generates the Library addon from the enabled services and rejects
 * the entire save when none can back it ("Library requires at least one usable
 * service"). e2e/golden/easynews-1080p.json is the regenerated golden for the
 * audited failing config; these tests keep it — and every other golden —
 * honest against the host's own rule.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { hasLibraryCapableService } from '../src/core/install-policy.js';
import { AIO_PRESET_ID_SET } from '../src/data/generated/aiostreams-presets.js';
import { validateConfigOptions } from '../e2e/lib/aiostreams-contract.mjs';

const GOLDEN_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'e2e', 'golden');
const golden = name => JSON.parse(readFileSync(join(GOLDEN_DIR, name), 'utf8'));

/** The host's own acceptance rule: a library preset requires a usable service. */
function libraryPresetIsAcceptable(config) {
  const hasLibrary = (config.presets || []).some(p => p?.type === 'library' && p?.enabled !== false);
  return !hasLibrary || hasLibraryCapableService(config.services || []);
}

test('EasyNews-only fixture: no library preset, and the config validates against the option contract', () => {
  const tpl = golden('easynews-1080p.json');
  const types = tpl.config.presets.map(p => p.type);
  assert.equal(
    hasLibraryCapableService(tpl.config.services || []), false,
    'fixture guard: this golden must remain the EasyNews-only case',
  );
  assert.ok(!types.includes('library'), 'EasyNews-only must not carry a Library preset — the host rejects the whole save');
  // ...and what it does carry is acceptable to the pinned upstream contract
  assert.deepEqual(validateConfigOptions(tpl.config), { ok: true });
  for (const preset of tpl.config.presets) {
    assert.ok(AIO_PRESET_ID_SET.has(preset.type), `preset "${preset.type}" is not resolvable at the pin`);
  }
});

test('the host rule holds for every golden in the matrix', () => {
  for (const file of readdirSync(GOLDEN_DIR).filter(f => f.endsWith('.json'))) {
    const tpl = golden(file);
    assert.ok(
      libraryPresetIsAcceptable(tpl.config),
      `${file}: library preset present without a library-capable enabled service — the host would reject this save`,
    );
  }
});

test('debrid-backed fixtures keep their Library preset (the fix must not over-remove)', () => {
  for (const file of ['torbox-1080p-standard.json', 'alldebrid-1080p.json', 'core-stable-torbox-4k.json']) {
    const tpl = golden(file);
    assert.ok(
      (tpl.config.presets || []).some(p => p?.type === 'library' && p?.enabled !== false),
      `${file}: a debrid-backed config keeps the Library addon`,
    );
  }
});

test('free fixtures (p2p/http) stay library-free', () => {
  for (const file of ['p2p-1080p.json', 'http-1080p.json']) {
    const tpl = golden(file);
    assert.ok(!(tpl.config.presets || []).some(p => p?.type === 'library'), file);
  }
});

test('EasyNews + a debrid service keeps the library (rule, not route)', () => {
  const services = [
    { id: 'easynews', enabled: true, credentials: {} },
    { id: 'realdebrid', enabled: true, credentials: {} },
  ];
  assert.ok(hasLibraryCapableService(services));
  // and the EasyNews-only shape the gate exists for
  assert.ok(!hasLibraryCapableService([{ id: 'easynews', enabled: true, credentials: {} }]));
});
