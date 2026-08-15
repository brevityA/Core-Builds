// Field-report regressions, 2026-08-14.
//
// Two live bugs from the same screenshot pair:
//   A) Debridio configs were rejected by AIOStreams ("Option debridioApiKey is required,
//      got undefined") even when the user HAD entered a key — we emitted a bare `apiKey`,
//      an option the preset never reads. The v2.90 "omit until a key is entered" change
//      masked this: with no key the preset vanishes, so the reject only surfaced for
//      users who actually supplied one.
//   B) `.import-success strong` used a descendant selector, so the inline <strong> used
//      for step numbers and mid-sentence emphasis inherited display:block and each
//      fragment landed on its own line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const core = await readFile(new URL('../src/styles/01-core.css', import.meta.url), 'utf8');

/** Pull the single-line preset literal for a given AIOStreams preset type. */
function presetLine(type) {
  const line = app.split('\n').find(l => l.includes(`type:'${type}'`) && l.includes('instanceId'));
  assert.ok(line, `no preset emission found for type '${type}'`);
  return line;
}

test('Debridio emits the preset-specific debridioApiKey option', () => {
  const line = presetLine('debridio');
  assert.match(line, /debridioApiKey:S\.creds\.debridio/,
    'Debridio must set debridioApiKey — AIOStreams rejects the config otherwise');
  assert.doesNotMatch(line, /[^o]apiKey:S\.creds\.debridio/,
    'Debridio must not fall back to a bare apiKey option');
});

test('Debrider is documented as an unresolvable preset type, not silently renamed', () => {
  // Verified against AIOStreams source on 2026-08-15: PresetManager.fromId() accepts 76
  // preset ids and `debrider` is not one of them (only debridio, debridio-watchtower,
  // debridio-tv, debridio-tmdb, debridio-tvdb, debridio-ic4a); no debrider preset file
  // exists. `debrider` is a SERVICE id. Renaming its option key would imply the emission is
  // valid when the host cannot resolve the type at all — so the code carries an explicit
  // note instead. This test pins the note so the finding cannot be quietly dropped.
  const line = presetLine('debrider');
  assert.match(line, /apiKey:S\.creds\.debrider/, 'left unrenamed pending an owner decision');
  assert.match(app, /`debrider` is NOT in PresetManager\.fromId/,
    'the unresolvable-preset finding must stay documented at the emission site');
});

test('Debridio does not emit a bare apiKey at options top level', () => {
  // Nested `api:{ url, apiKey }` is the correct v2.32 shape for newznab/nzbhydra and is
  // deliberately excluded here; this guards the flat-option preset only.
  const line = presetLine('debridio');
  const flat = line.match(/options:\{[^}]*\}/)?.[0] || '';
  assert.doesNotMatch(flat, /\bapiKey:/,
    'debridio still emits a bare apiKey — AIOStreams requires debridioApiKey');
});

test('SubDL keeps its own prefixed key name (convention anchor)', () => {
  // Proves the per-preset convention is real and already honoured elsewhere, so the
  // Debridio/Debrider change is consistent rather than a one-off guess.
  assert.match(app, /subDlApiKey:S\.creds\.subdl/);
});

test('import-success block styling targets only the panel heading', () => {
  assert.match(core, /\.import-success>strong\{[^}]*display:block/,
    'must use the direct-child combinator');
  assert.doesNotMatch(core, /\.import-success strong\{[^}]*display:block/,
    'a descendant selector re-breaks inline <strong> inside the panel copy');
});
