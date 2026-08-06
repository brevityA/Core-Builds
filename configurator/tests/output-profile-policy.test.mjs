import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTPUT_PROFILES,
  applyOutputProfile,
  resolveOutputProfile,
} from '../src/core/output-profile-policy.js';
import {
  findFeatureConflicts,
  validateOutputProfileBudget,
} from '../src/core/feature-conflict-policy.js';

function richTemplate() {
  return {
    metadata: { id:'test', name:'Test' },
    config: {
      excludedResolutions:['144p'],
      requiredResolutions:['1080p'],
      preferredResolutions:['1080p'],
      requiredLanguages:['English', 'Original'],
      preferredLanguages:['English', 'Original'],
      preferredVisualTags:['HDR10', 'SDR'],
      preferredEncodes:['HEVC', 'AVC'],
      excludedStreamExpressions:[
        { enabled:true, expression:'/* Final Limit (All) */ []' },
        { enabled:true, expression:'/* Cached Only — hard kill uncached */ uncached(streams)' },
      ],
      includedStreamExpressions:[
        { enabled:true, expression:'/* Protect Library & SeaDex */ []' },
        { enabled:true, expression:'/* Smart Play Pin */ []' },
        { enabled:true, expression:'/* 0Cached */ []' },
      ],
      preferredStreamExpressions:[
        { enabled:true, expression:'/* Language Preference — English */ language(streams,\'English\')' },
        { enabled:true, expression:'/* S-Tier 1080p WEB-DL */ []' },
        { enabled:true, expression:'/* A-Tier 720p fallback */ []' },
        { enabled:true, expression:'/* QR Balance — HQ */ []' },
      ],
      rankedStreamExpressions:[{ enabled:true, expression:'[]', score:1 }],
      rankedRegexPatterns:[{ name:'Local', pattern:'/x/', score:1 }],
      preferredRegexPatterns:[{ name:'Preferred', pattern:'/y/' }],
      excludedRegexPatterns:['/z/'],
      syncedRankedRegexUrls:['https://example.invalid/regex.json'],
      syncedRankedStreamExpressionUrls:['https://example.invalid/sel.json'],
      regexOverrides:[{ name:'A' }],
      selOverrides:[{ name:'B' }],
      groups:{ enabled:true, behaviour:'sequential', groupings:[{ name:'Primary', addons:['bridge'], condition:'true' }] },
      dynamicAddonFetching:{ enabled:true, condition:'true' },
      resultLimits:{ global:35, resolution:15, mode:'conjunctive' },
      maxResults:35,
      maxResultsPerResolution:15,
      size:{ global:{ movies:[0, 100] } },
      bitrate:{ global:{ movies:[0, 100] } },
      excludeUncached:true,
      preloadStreams:{ enabled:true, selector:'[]' },
      precacheNextEpisode:true,
      precacheSelector:'uncached(streams)',
      precacheSingleStream:true,
      cacheAndPlay:{ enabled:true, streamTypes:['torrent'] },
      autoPlay:{ enabled:true, method:'matchingFile' },
      hideErrors:true,
      posterService:'rpdb',
      rpdbApiKey:'public-looking-but-must-not-be-copied',
      presets:[
        { type:'library', instanceId:'library', enabled:true, resources:['stream'] },
        { type:'torbox-search', instanceId:'legacy-search', enabled:true, resources:['stream'] },
        { type:'stremthruTorz', instanceId:'bridge', enabled:true, resources:['stream'] },
        { type:'meteor', instanceId:'meteor', enabled:true, resources:['stream'] },
        { type:'comet', instanceId:'comet', enabled:true, resources:['stream'] },
        { type:'mediafusion', instanceId:'mediafusion', enabled:true, resources:['stream'] },
        { type:'knaben', instanceId:'knaben', enabled:true, resources:['stream'] },
        { type:'tmdb-addon', instanceId:'catalog', enabled:true, resources:['catalog', 'meta'] },
      ],
    },
  };
}

test('auto profile makes Simple Mode and Quick Install stable', () => {
  assert.equal(resolveOutputProfile({ simpleMode:true }), 'stable');
  assert.equal(resolveOutputProfile({ quickStart:true }), 'stable');
  assert.equal(resolveOutputProfile({ simpleMode:false, quickStart:false }), 'balanced');
  assert.equal(resolveOutputProfile({ pseArch:'iqr' }), 'advanced');
  assert.equal(resolveOutputProfile({ pseArch:'apex-mixed' }), 'labs');
  assert.equal(resolveOutputProfile({ outputProfile:'balanced', simpleMode:true }), 'balanced');
});

test('Core Stable reduces output to a local, deterministic policy', () => {
  const source = richTemplate();
  const stable = applyOutputProfile(source, 'stable', {
    service:'torbox-pro', resolution:'1080p', langs:['English'],
    langExclusive:false, sizeLimit:'unlimited', bandwidthMbps:0,
    multiServices:['torbox-pro'], optionalScrapers:[], cacheMode:'cached',
  });
  const config = stable.config;

  assert.notEqual(stable, source);
  assert.equal(source.config.groups.enabled, true, 'source remains immutable');
  assert.equal(stable.metadata.coreBuildsProfile, 'stable');
  assert.equal(stable.metadata.coreBuildsProfileVersion, '1');
  assert.deepEqual(config.syncedRankedRegexUrls, []);
  assert.deepEqual(config.syncedRankedStreamExpressionUrls, []);
  assert.equal(JSON.stringify(config.formatter).includes('rseMatched'), false);
  assert.equal(JSON.stringify(config.formatter).includes('nSeScore'), false);
  assert.deepEqual(config.rankedRegexPatterns, []);
  assert.deepEqual(config.preferredRegexPatterns, []);
  assert.deepEqual(config.excludedRegexPatterns, []);
  assert.equal(config.excludedStreamExpressions.length, 1);
  assert.equal(config.includedStreamExpressions.length, 0);
  assert.equal(config.preferredStreamExpressions.length, 0);
  assert.equal(config.rankedStreamExpressions.length, 0);
  assert.equal(config.groups.enabled, false);
  assert.equal(config.dynamicAddonFetching.enabled, false);
  assert.equal(config.preloadStreams.enabled, false);
  assert.equal(config.precacheNextEpisode, false);
  assert.equal(config.cacheAndPlay.enabled, false);
  assert.equal(config.autoPlay.enabled, false);
  assert.equal(config.hideErrors, false);
  assert.equal(config.posterService, 'none');
  assert.equal('rpdbApiKey' in config, false);
  assert.equal('size' in config, false);
  assert.equal('bitrate' in config, false);
  assert.deepEqual(config.requiredResolutions, []);
  assert.ok(config.excludedResolutions.includes('2160p'));
  assert.ok(config.excludedResolutions.includes('1440p'));
  assert.deepEqual(config.requiredLanguages, []);
  assert.deepEqual(config.resultLimits, { global:10, resolution:3, mode:'independent' });
  assert.deepEqual(config.presets.map(p => p.type), ['library','stremthruTorz','meteor','comet','tmdb-addon']);
  assert.equal(config.presets.some(preset => preset.type === 'newznab'), false);
  assert.equal(validateOutputProfileBudget(stable, 'stable').ok, true);
  assert.equal(findFeatureConflicts(stable).some(item => item.severity === 'error'), false);
});

test('Core Stable preserves an explicit strict-language decision and explicit cap', () => {
  const stable = applyOutputProfile(richTemplate(), 'stable', {
    service:'torbox-pro', resolution:'4k', langs:['French'], langExclusive:true,
    sizeLimit:'20', bandwidthMbps:50, multiServices:['torbox-pro'], optionalScrapers:[],
  });
  assert.deepEqual(stable.config.requiredLanguages, ['French']);
  assert.deepEqual(stable.config.preferredLanguages, ['French']);
  assert.ok(stable.config.size);
  assert.ok(stable.config.bitrate);
  assert.equal(stable.config.resultLimits.global, 12);
});

test('Balanced keeps a bounded quality stack and availability-aware pack fallback', () => {
  const balanced = applyOutputProfile(richTemplate(), 'balanced', {
    service:'torbox-pro', resolution:'4k', langs:['English'], langExclusive:false,
    sizeLimit:'unlimited', bandwidthMbps:0, multiServices:['torbox-pro'], optionalScrapers:[],
  });
  const c = balanced.config;
  assert.equal(balanced.metadata.coreBuildsProfile, 'balanced');
  assert.equal(c.excludedStreamExpressions.length, 3);
  assert.equal(c.includedStreamExpressions.length, 2);
  assert.ok(c.preferredStreamExpressions.length <= 8);
  assert.equal(c.syncedRankedRegexUrls.length, 0);
  assert.equal(c.syncedRankedStreamExpressionUrls.length, 0);
  assert.equal(c.groups.enabled, false);
  assert.equal(c.dynamicAddonFetching.enabled, false);
  assert.deepEqual(c.resultLimits, { global:20, resolution:5, mode:'independent' });
  assert.equal(validateOutputProfileBudget(balanced, 'balanced').ok, true);
});

test('Advanced and Labs retain their local advanced policy but never stack fetch exits', () => {
  for (const profile of ['advanced', 'labs']) {
    const output = applyOutputProfile(richTemplate(), profile, { service:'torbox-pro' });
    assert.equal(output.metadata.coreBuildsProfile, profile);
    assert.equal(output.config.groups.enabled, false);
    assert.equal(output.config.dynamicAddonFetching.enabled, true);
    assert.equal(output.config.rankedRegexPatterns.length, 1);
    assert.deepEqual(output.config.syncedRankedStreamExpressionUrls, []);
    assert.equal(findFeatureConflicts(output).some(item => item.id === 'C02_FETCH_EXIT_STACK'), false);
  }
});

test('legacy TorBox Search is retained only by the explicit v2.31 advanced compatibility lane', () => {
  const v231 = applyOutputProfile(richTemplate(), 'advanced', { service:'torbox-pro', aiostreamsVersion:'2.31.1' });
  assert.equal(v231.config.presets.some(preset => preset.type === 'torbox-search'), true);
  assert.equal(v231.metadata.coreBuildsAIOStreamsTarget, '2.31.1');
  assert.equal(v231.metadata.coreBuildsLegacyTorboxSearch, true);

  for (const target of ['2.32.0', 'unknown']) {
    const output = applyOutputProfile(richTemplate(), 'advanced', { service:'torbox-pro', aiostreamsVersion:target });
    assert.equal(output.config.presets.some(preset => preset.type === 'torbox-search'), false, target);
    assert.equal(output.metadata.coreBuildsAIOStreamsTarget, target);
    assert.equal('coreBuildsLegacyTorboxSearch' in output.metadata, false);
  }

  const stable = applyOutputProfile(richTemplate(), 'stable', { service:'torbox-pro', aiostreamsVersion:'2.31.1' });
  assert.equal(stable.config.presets.some(preset => preset.type === 'torbox-search'), false);
});

test('every profile strips synced expression URLs and unusable remote-score rules', () => {
  for (const profile of ['stable', 'balanced', 'advanced', 'labs']) {
    const output = applyOutputProfile(richTemplate(), profile, { service:'torbox-pro', resolution:'1080p' });
    const config = output.config;
    for (const key of [
      'syncedExcludedStreamExpressionUrls',
      'syncedIncludedStreamExpressionUrls',
      'syncedPreferredStreamExpressionUrls',
      'syncedRankedStreamExpressionUrls',
    ]) {
      assert.deepEqual(config[key] || [], [], `${profile} must not emit ${key}`);
    }
    const expressions = [
      ...(config.excludedStreamExpressions || []),
      ...(config.includedStreamExpressions || []),
      ...(config.preferredStreamExpressions || []),
    ].map(entry => String(entry.expression || entry));
    assert.equal(expressions.some(expression => /\b(?:streamExpressionScore|rseMatched)\s*\(/.test(expression)), false);
    for (const sort of Object.values(config.sortCriteria || {})) {
      if (Array.isArray(sort)) assert.equal(sort.some(entry => entry.key === 'streamExpressionScore'), false);
    }
  }
});

test('published profile names remain stable', () => {
  assert.deepEqual(OUTPUT_PROFILES, ['stable','balanced','advanced','labs']);
});
