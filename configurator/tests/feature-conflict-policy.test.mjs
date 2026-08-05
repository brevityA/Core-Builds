import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTPUT_PROFILE_BUDGETS,
  findFeatureConflicts,
  inspectTemplateComplexity,
  validateOutputProfileBudget,
} from '../src/core/feature-conflict-policy.js';

function ids(config) {
  return findFeatureConflicts({ config }).map(item => item.id);
}

test('complexity inspection reports counts without exposing configuration URLs or credentials', () => {
  const result = inspectTemplateComplexity({
    config: {
      excludedStreamExpressions: [{ enabled:true, expression:'/* Test */ type(streams,\'external\')' }],
      rankedRegexPatterns: [{ name:'Local', pattern:'/test/', score:1 }],
      syncedRankedRegexUrls: ['https://example.invalid/private-looking-url'],
      presets: [{ instanceId:'one', enabled:true, options:{} }],
      groups: { enabled:false },
      dynamicAddonFetching: { enabled:false },
      credentials: { apiKey:'must not be returned' },
    },
  });

  assert.deepEqual(result.expressions, { excluded:1, included:0, required:0, preferred:0, ranked:0, total:1, characters:35 });
  assert.equal(result.regex.ranked, 1);
  assert.equal(result.remoteDependencies.syncedRegexUrls, 1);
  assert.equal(JSON.stringify(result).includes('example.invalid'), false);
  assert.equal(JSON.stringify(result).includes('must not be returned'), false);
});

test('flags stacked native and SEL result caps', () => {
  assert.ok(ids({
    resultLimits:{ global:12, mode:'independent' },
    excludedStreamExpressions:[{ enabled:true, expression:'/* Final Limit (All) */ []' }],
  }).includes('C01_RESULT_CAP_STACK'));
});

test('flags two early fetch exit mechanisms', () => {
  assert.ok(ids({
    groups:{ enabled:true, groupings:[] },
    dynamicAddonFetching:{ enabled:true, condition:'true' },
  }).includes('C02_FETCH_EXIT_STACK'));
});

test('flags synced expressions as prohibited, plus remote score conflicts', () => {
  const result = ids({
    syncedRankedStreamExpressionUrls:['https://example.invalid/rse.json'],
    excludedStreamExpressions:[{ enabled:true, expression:'/* Adaptive Score Floor */ []' }],
    sortCriteria:{ global:[{ key:'quality', direction:'desc' }] },
  });
  assert.ok(result.includes('C17_SYNCED_EXPRESSIONS_PROHIBITED'));
  assert.ok(result.includes('C03_REMOTE_SCORE_WITH_LOCAL_CULL'));
  assert.ok(result.includes('C15_REMOTE_SCORE_NOT_IN_SORT'));
});

test('flags duplicate cached/uncached and size hard filters', () => {
  const result = ids({
    excludeUncached:true,
    excludeCached:true,
    size:{ global:{ movies:[0, 1] } },
    excludedStreamExpressions:[
      { enabled:true, expression:'/* Cached Only — hard kill uncached */ uncached(streams)' },
      { enabled:true, expression:'/* Uncached Only — hard kill cached */ cached(streams)' },
      { enabled:true, expression:'/* Size Limit — max 10GB */ size(streams,\'1B\',\'10GB\')' },
    ],
  });
  assert.ok(result.includes('C05_DUPLICATE_CACHED_ONLY'));
  assert.ok(result.includes('C06_DUPLICATE_UNCACHED_ONLY'));
  assert.ok(result.includes('C07_DUPLICATE_SIZE_CAP'));
});

test('flags stacked language filters and native contradictions', () => {
  const result = ids({
    requiredLanguages:['English'],
    excludedLanguages:['English'],
    excludedResolutions:['2160p'],
    requiredResolutions:['2160p'],
    excludedStreamExpressions:[{ enabled:true, expression:'/* CB | Foreign Language Kill */ []' }],
    includedStreamExpressions:[{ enabled:true, expression:'/* Language Exclusive — only English */ []' }],
  });
  assert.ok(result.includes('C08_LANGUAGE_HARD_FILTER_STACK'));
  assert.ok(result.includes('C09_LANGUAGES_CONTRADICTION'));
  assert.ok(result.includes('C09_RESOLUTIONS_CONTRADICTION'));
});

test('flags legacy pack kills combined with late pack fallback', () => {
  assert.ok(ids({
    excludedStreamExpressions:[
      { enabled:true, expression:'/* Hard Season Pack Kill */ seasonPack(streams)' },
      { enabled:true, expression:'/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ []' },
    ],
  }).includes('C11_LEGACY_AND_LATE_PACK_RULES'));
});

test('flags unknown group preset ids', () => {
  assert.ok(ids({
    presets:[{ instanceId:'primary', enabled:true, options:{} }],
    groups:{ enabled:true, groupings:[{ name:'Primary', addons:['primary','missing'], condition:'true' }] },
  }).includes('C16_GROUP_REFERENCES_UNKNOWN_PRESET'));
});

test('stable profile budget accepts a deliberately minimal configuration', () => {
  const result = validateOutputProfileBudget({
    config:{
      excludedStreamExpressions:[{ enabled:true, expression:'/* Stable External Kill */ type(streams,\'external\')' }],
      groups:{ enabled:false, groupings:[] },
      dynamicAddonFetching:{ enabled:false },
    },
  }, 'stable');
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('stable profile budget rejects remote dependencies and runtime complexity', () => {
  const result = validateOutputProfileBudget({
    config:{
      excludedStreamExpressions:Array.from({ length:3 }, (_, i) => ({ enabled:true, expression:`/* E${i} */ []` })),
      rankedRegexPatterns:[{ name:'Local', pattern:'/x/', score:1 }],
      syncedRankedRegexUrls:['https://example.invalid/regex.json'],
      groups:{ enabled:true, groupings:[] },
      dynamicAddonFetching:{ enabled:true, condition:'true' },
    },
  }, 'stable');
  assert.equal(result.ok, false);
  assert.ok(result.violations.some(v => v.key === 'excludedExpressions'));
  assert.ok(result.violations.some(v => v.key === 'inlineRankedRegex'));
  assert.ok(result.violations.some(v => v.key === 'syncedRegexUrls'));
  assert.ok(result.violations.some(v => v.key === 'groups'));
  assert.ok(result.violations.some(v => v.key === 'dynamicFetching'));
});

test('published output profile budgets are immutable and include the planned profiles', () => {
  assert.deepEqual(Object.keys(OUTPUT_PROFILE_BUDGETS), ['stable','balanced','advanced','labs']);
  assert.equal(OUTPUT_PROFILE_BUDGETS.stable.syncedSelUrls, 0);
  assert.equal(OUTPUT_PROFILE_BUDGETS.advanced.syncedSelUrls, 0);
  assert.equal(OUTPUT_PROFILE_BUDGETS.labs.syncedSelUrls, 0);
  assert.equal(OUTPUT_PROFILE_BUDGETS.stable.dynamicFetching, false);
  assert.throws(() => { OUTPUT_PROFILE_BUDGETS.stable.syncedSelUrls = 1; }, TypeError);
});
