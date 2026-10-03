import test from 'node:test';
import assert from 'node:assert/strict';
import { diffConfigSections, configValuesEqual, migrationSelection } from '../src/core/config-diff.js';

function section(before, after, key) {
  const result = diffConfigSections(before, after).find(item => item.key === key);
  assert.ok(result, `missing ${key} change`);
  return result;
}

test('object property order is irrelevant; array order remains meaningful', () => {
  assert.equal(configValuesEqual({ enabled: true, count: 3 }, { count: 3, enabled: true }), true);
  assert.equal(configValuesEqual(['2160p', '1080p'], ['1080p', '2160p']), false);
  assert.deepEqual(diffConfigSections({ failover: { enabled: true, maxAttempts: 3 } }, { failover: { maxAttempts: 3, enabled: true } }), []);
});

test('configuration bookkeeping does not manufacture an upgrade', () => {
  assert.deepEqual(diffConfigSections({ uuid: 'before', showChanges: true }, { uuid: 'after', showChanges: false }), []);
  assert.deepEqual(diffConfigSections({}, {}), []);
});

for (const field of ['preferredStreamExpressions', 'excludedStreamExpressions', 'includedStreamExpressions', 'rankedStreamExpressions']) {
  test(`${field}: a changed body under the same label is visible`, () => {
    const before = { [field]: [{ enabled: true, expression: '/* Same label */ slice(streams, 0, 5)' }] };
    const after = { [field]: [{ enabled: true, expression: '/* Same label */ slice(streams, 0, 3)' }] };
    const result = diffConfigSections(before, after);
    assert.equal(result.length, 1);
    assert.equal(result[0].changed, 1);
    assert.equal(result[0].rows[0].text, 'Same label — updated');
  });
}

test('enabled state and score changes are not hidden by expression labels', () => {
  const before = { rankedStreamExpressions: [{ name: 'Quality', enabled: true, expression: 'streams', score: 10 }] };
  const after = { rankedStreamExpressions: [{ name: 'Quality', enabled: false, expression: 'streams', score: 20 }] };
  assert.equal(section(before, after, 'pses').changed, 1);
});

for (const field of ['rankedRegexPatterns', 'preferredRegexPatterns', 'excludedRegexPatterns']) {
  test(`${field}: regex content changes are visible even with an unchanged name/score`, () => {
    assert.equal(diffConfigSections(
      { [field]: [{ name: 'Tier 3', pattern: '/old/i', score: 100 }] },
      { [field]: [{ name: 'Tier 3', pattern: '/new/i', score: 100 }] },
    )[0].changed, 1);
  });
}

test('duplicate rule labels do not collapse into one Map entry', () => {
  const before = { rankedRegexPatterns: [{ name: 'Tier', pattern: '/one/' }, { name: 'Tier', pattern: '/two/' }] };
  const after = { rankedRegexPatterns: [{ name: 'Tier', pattern: '/changed/' }, { name: 'Tier', pattern: '/two/' }] };
  assert.equal(section(before, after, 'ranked_regex').changed, 1);
});

for (const scope of ['global', 'movies', 'series', 'cachedAnime', 'uncachedSeries']) {
  test(`sort direction-only changes are visible in ${scope}`, () => {
    const before = { sortCriteria: { [scope]: [{ key: 'size', direction: 'asc' }] } };
    const after = { sortCriteria: { [scope]: [{ key: 'size', direction: 'desc' }] } };
    const change = section(before, after, 'sort');
    assert.equal(change.changed, 1);
    assert.ok(change.rows[0].text.includes(scope));
  });
}

test('formatter descriptions and native result limits are diffed', () => {
  const before = { formatter: { id: 'tamtaro', definitions: { overrides: { tamtaro: { name: 'Same', description: 'Old' } } } }, resultLimits: { global: 20 } };
  const after = structuredClone(before);
  after.formatter.definitions.overrides.tamtaro.description = 'New';
  after.resultLimits.global = 12;
  assert.equal(section(before, after, 'formatter').changed, 1);
  assert.equal(section(before, after, 'settings').changed, 1);
});

test('source option/credential changes are counted without returning their values', () => {
  const before = { presets: [{ type: 'newznab', instanceId: 'one', options: { name: 'Indexer', api: { url: 'https://private.invalid/api', apiKey: 'OLD-PRIVATE-KEY' } } }] };
  const after = structuredClone(before);
  after.presets[0].options.api.apiKey = 'NEW-PRIVATE-KEY';
  const change = section(before, after, 'sources');
  assert.equal(change.changed, 1);
  assert.doesNotMatch(JSON.stringify(change), /OLD-PRIVATE-KEY|NEW-PRIVATE-KEY|private\.invalid/);
});

test('source order and preference-list changes affect the diff', () => {
  assert.equal(section({ services: [{ id: 'torbox' }, { id: 'realdebrid' }] }, { services: [{ id: 'realdebrid' }, { id: 'torbox' }] }, 'sources').changed, 1);
  assert.equal(section({ preferredResolutions: ['2160p', '1080p'] }, { preferredResolutions: ['1080p', '2160p'] }, 'sort').changed, 1);
});

test('declining a section preserves values and explicitly removes newly-added fields', () => {
  const before = { sortCriteria: { global: [{ key: 'size', direction: 'asc' }] } };
  const after = { sortCriteria: { global: [{ key: 'resolution', direction: 'desc' }] }, preferredResolutions: ['2160p', '1080p'] };
  const choice = migrationSelection(before, after, new Set(), new Set(['sort']));
  assert.deepEqual(choice.keep.sortCriteria, before.sortCriteria);
  assert.ok(choice.remove.includes('preferredResolutions'));
  choice.keep.sortCriteria.global[0].direction = 'desc';
  assert.equal(before.sortCriteria.global[0].direction, 'asc', 'keep must be an independent clone');
  assert.deepEqual(migrationSelection(before, after, new Set(['sort']), new Set(['sort'])), { keep: {}, remove: [] });
});
