/**
 * The AIOStreams option contract must cover every preset the generator can emit.
 *
 * The e2e drift alarm (`assertKnownPresetTypes`) only sees the types one fixture happens to
 * generate. `torrent-galaxy` and `torrents-db` were emitted by app.js but present in neither
 * contract set, and the fixture did not exercise them — so the alarm stayed quiet and would
 * have fired later, in CI, on some unrelated config.
 *
 * This closes that: it reads every `type:'…', instanceId:` emission out of app.js statically,
 * so coverage is checked against the whole generator rather than one code path. Same lesson as
 * audit C4 — a hand-maintained table needs an alarm wired to the source of truth, not to a
 * sample of it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PRESET_OPTION_IDS,
  UNMODELLED_PRESET_TYPES,
} from '../e2e/lib/aiostreams-contract.mjs';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

/** Every preset type app.js emits, read from the source rather than from a generated config. */
function emittedPresetTypes() {
  return [...new Set([...app.matchAll(/type:'([a-zA-Z0-9-]+)',\s*instanceId/g)].map(m => m[1]))].sort();
}

test('every emitted preset type is modelled or explicitly skipped', () => {
  const covered = new Set([...Object.keys(PRESET_OPTION_IDS), ...UNMODELLED_PRESET_TYPES]);
  const uncovered = emittedPresetTypes().filter(t => !covered.has(t));
  assert.deepEqual(
    uncovered,
    [],
    `preset type(s) emitted by app.js but absent from the contract: ${uncovered.join(', ')}.\n` +
    'Add verified option ids to PRESET_OPTION_IDS (read them from the AIOStreams preset source —\n' +
    'do not guess), or list the type in UNMODELLED_PRESET_TYPES to skip it knowingly.',
  );
});

test('the generator emits a plausible number of preset types', () => {
  // Guards the guard: if the regex above stopped matching, the coverage test would pass
  // vacuously against an empty list.
  assert.ok(emittedPresetTypes().length > 20, 'preset-type extraction returned suspiciously few matches');
});

test('modelled presets carry no bare apiKey in their option ids', () => {
  // The bug class this contract exists for: a bare `apiKey` where the preset declares a
  // prefixed one. No modelled preset should legitimately accept `apiKey` at the top level.
  for (const [type, ids] of Object.entries(PRESET_OPTION_IDS)) {
    assert.ok(
      !ids.includes('apiKey'),
      `${type} lists a bare apiKey — verify against AIOStreams source; the prefixed form is expected`,
    );
  }
});
