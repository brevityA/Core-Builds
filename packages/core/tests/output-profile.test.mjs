import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/generate-template.js';

test('shared generator emits a genuine Core Stable profile on explicit selection', () => {
  const template = generateTemplate({
    service:'torbox-pro', device:'generic', resolution:'1080p', architecture:'standard',
    outputProfile:'stable', langs:['English'], cacheMode:'mixed',
  });
  const config = template.config;
  assert.equal(template.metadata.coreBuildsProfile, 'stable');
  assert.deepEqual(config.syncedRankedRegexUrls, []);
  assert.deepEqual(config.syncedRankedStreamExpressionUrls, []);
  assert.deepEqual(config.rankedRegexPatterns, []);
  assert.equal(config.groups.enabled, false);
  assert.equal(config.dynamicAddonFetching.enabled, false);
  assert.equal(config.excludedStreamExpressions.length, 1);
  assert.equal(config.hideErrors, false);
  assert.equal(config.resultLimits.mode, 'independent');
  assert.ok(config.excludedResolutions.includes('2160p'));
  assert.ok(config.excludedResolutions.includes('1440p'));
});

test('shared generator maps Simple and Quick flows to Core Stable', () => {
  for (const extra of [{ simpleMode:true }, { quickStart:true }]) {
    const template = generateTemplate({
      service:'torbox-pro', device:'generic', resolution:'4k', architecture:'standard', ...extra,
    });
    assert.equal(template.metadata.coreBuildsProfile, 'stable');
  }
});


test('shared generator maps the ordinary auto flow to Balanced', () => {
  const template = generateTemplate({
    service:'torbox-pro', device:'generic', resolution:'1080p', architecture:'standard',
  });
  assert.equal(template.metadata.coreBuildsProfile, 'balanced');
  assert.equal(template.config.groups.enabled, false);
  assert.equal(template.config.dynamicAddonFetching.enabled, false);
  assert.equal(template.config.syncedRankedRegexUrls.length, 0);
  assert.equal(template.config.presets.some(preset => preset.type === 'torbox-search'), false);
});

test('shared generator keeps an advanced local policy without synced expressions or stacked fetch exits', () => {
  const template = generateTemplate({
    service:'torbox-pro', device:'generic', resolution:'1080p', architecture:'standard', outputProfile:'advanced',
  });
  assert.equal(template.metadata.coreBuildsProfile, 'advanced');
  assert.equal(template.config.groups.enabled, false);
  assert.equal(template.config.dynamicAddonFetching.enabled, true);
  assert.equal(template.config.presets.some(preset => preset.type === 'torbox-search'), false);
  assert.deepEqual(template.config.syncedRankedStreamExpressionUrls || [], []);
  assert.equal((template.config.excludedStreamExpressions || []).some(entry => /streamExpressionScore\s*\(/.test(entry.expression || '')), false);
  assert.ok(template.config.syncedRankedRegexUrls.length > 0);
});

test('shared advanced generator records its explicit v2.32 compatibility target', () => {
  const template = generateTemplate({
    service:'torbox-pro', device:'generic', resolution:'1080p', architecture:'standard',
    outputProfile:'advanced', aiostreamsVersion:'2.32.0',
  });
  assert.equal(template.config.presets.some(preset => preset.type === 'torbox-search'), false);
  assert.equal(template.metadata.coreBuildsAIOStreamsTarget, '2.32.0');
});

test('special Nuvio generation also omits synced expressions', () => {
  const host = { id:'fortheweak', supportsP2P:true, supportsNuvioInstant:true, supportsDebrid:true, supportsHttp:true };
  const template = generateTemplate({
    route:'nuvio-torbox-instant', device:'generic', resolution:'1080p', host,
  }, { host });
  assert.equal(template.metadata.coreBuildsProfile, 'advanced');
  assert.deepEqual(template.config.syncedRankedStreamExpressionUrls || [], []);
});
