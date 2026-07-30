import test from 'node:test';
import assert from 'node:assert/strict';
import { getSelPolicy } from '../src/core/sel-policy.js';
import { SEL_POLICY_DATA, APEX_MIXED_PSES } from '../src/core/sel-policy-data.js';

const LANG_PREFIX = [
  { enabled: true, expression: "/* Language Preference — English */ language(streams,'English')" },
  { enabled: true, expression: "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []" },
];

const DEFAULT_OPTS = { audio: 'limited', forceLimitedAudio: false, supportsAv1: false, dv: false };

const TARGETS = [
  { name: 'standard',       args: { architecture: 'standard', resolution: '1080p' } },
  { name: 'standard-4k',    args: { architecture: 'standard', resolution: '4k' } },
  { name: 'iqr',            args: { architecture: 'iqr',      resolution: '4k' } },
  { name: 'mixed-standard', args: { architecture: 'standard', resolution: 'mixed' } },
];

for (const { name, args } of TARGETS) {
  test(`baseline: getSelPolicy PSEs match SEL_POLICY_DATA["${name}"]`, () => {
    const sel = getSelPolicy({ ...args, ...DEFAULT_OPTS });
    const expected = SEL_POLICY_DATA[name].preferredStreamExpressions;
    const actual = [...LANG_PREFIX, ...sel.preferredStreamExpressions];
    assert.equal(actual.length, expected.length,
      `${name} PSE count: got ${actual.length}, want ${expected.length}`);
    for (let i = 0; i < actual.length; i++) {
      assert.equal(actual[i].expression, expected[i].expression,
        `${name} PSE #${i} expression mismatch`);
      assert.equal(actual[i].enabled, expected[i].enabled,
        `${name} PSE #${i} enabled mismatch`);
    }
  });
}

test('baseline: getSelPolicy apex-mixed returns APEX_MIXED_PSES (deep clone)', () => {
  const sel = getSelPolicy({ architecture: 'apex-mixed', resolution: '4k', ...DEFAULT_OPTS });
  assert.equal(sel.preferredStreamExpressions.length, APEX_MIXED_PSES.length);
  for (let i = 0; i < APEX_MIXED_PSES.length; i++) {
    assert.equal(sel.preferredStreamExpressions[i].expression, APEX_MIXED_PSES[i].expression);
    assert.notEqual(sel.preferredStreamExpressions[i], APEX_MIXED_PSES[i]);
  }
});

test('baseline: regeneration script reports no drift', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const exec = promisify(execFile);
  const { stdout } = await exec('node', ['scripts/generate-sel-policy-data.mjs', '--check'], { cwd: new URL('..', import.meta.url).pathname });
  assert.match(stdout, /up to date/i);
});
