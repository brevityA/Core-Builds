import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORTED_AIOSTREAMS_VERSIONS,
  AIOSTREAMS_CAPABILITY_MANIFEST,
  aiostreamsCapability,
  buildReliableTemplate,
  defaultState,
  inspectReliableTemplate,
  normalizeState,
  redactTemplate,
  safeDiagnostics,
} from '../src/rebuild/core.js';

const SYNC_FIELDS = [
  'syncedExcludedStreamExpressionUrls',
  'syncedIncludedStreamExpressionUrls',
  'syncedRequiredStreamExpressionUrls',
  'syncedPreferredStreamExpressionUrls',
  'syncedRankedStreamExpressionUrls',
];

test('reliable builder defaults to a local-only stable configuration', () => {
  const template = buildReliableTemplate(defaultState());
  const config = template.config;
  assert.equal(template.metadata.coreBuildsProfile, 'stable');
  assert.equal(template.metadata.coreBuildsExpressionPolicy, 'local-only');
  assert.equal(template.metadata.author, 'Branding-Brevity');
  for (const field of SYNC_FIELDS) assert.deepEqual(config[field], []);
  assert.deepEqual(config.excludedStreamExpressions, []);
  assert.deepEqual(config.includedStreamExpressions, []);
  assert.deepEqual(config.preferredStreamExpressions, []);
  assert.deepEqual(config.rankedStreamExpressions, []);
  assert.equal(config.groups.enabled, false);
  assert.equal(config.dynamicAddonFetching.enabled, false);
  assert.equal(config.hideErrors, false);
  assert.equal(config.statistics.enabled, true);
  assert.equal(config.resultLimits.mode, 'independent');
  assert.ok(config.presets.length >= 4);
});

test('1080p uses native higher-resolution exclusions and 4K preserves 1080p fallback', () => {
  const hd = buildReliableTemplate({ service:'torbox', resolution:'1080p' }).config;
  assert.ok(hd.excludedResolutions.includes('2160p'));
  assert.ok(hd.excludedResolutions.includes('1440p'));
  assert.deepEqual(hd.requiredResolutions, []);
  const uhd = buildReliableTemplate({ service:'torbox', resolution:'4k' }).config;
  assert.ok(uhd.preferredResolutions.includes('2160p'));
  assert.ok(uhd.preferredResolutions.includes('1080p'));
  assert.equal(uhd.resultLimits.global, 12);
});

test('credentials remain opt-in and are redacted from diagnostics/preview', () => {
  const input = { service:'torbox', credential:'test-value', includeCredentialInDownload:false };
  const noCredential = buildReliableTemplate(input);
  assert.deepEqual(noCredential.config.services.find(service => service.id === 'torbox').credentials, {});

  const withCredential = buildReliableTemplate({ ...input, includeCredentialInDownload:true });
  assert.deepEqual(withCredential.config.services.find(service => service.id === 'torbox').credentials, { apiKey:'test-value' });
  const redacted = redactTemplate(withCredential);
  assert.deepEqual(redacted.config.services.find(service => service.id === 'torbox').credentials, {});
  assert.equal(JSON.stringify(safeDiagnostics(withCredential, { ...input, includeCredentialInDownload:true })).includes('test-value'), false);
});

test('unknown target version makes the compatibility check explicit', () => {
  const template = buildReliableTemplate({ aiostreamsVersion:'unknown' });
  const report = inspectReliableTemplate(template, { aiostreamsVersion:'unknown' });
  assert.equal(report.supported, false);
  assert.ok(report.checks.some(check => check.id === 'host-version' && check.pass === false));
  assert.ok(SUPPORTED_AIOSTREAMS_VERSIONS.includes('2.31.1'));
});

test('v2.32 is visible as a review lane, never a premature verified claim', () => {
  const template = buildReliableTemplate({ aiostreamsVersion:'2.32.0' });
  const report = inspectReliableTemplate(template, { aiostreamsVersion:'2.32.0' });
  assert.equal(AIOSTREAMS_CAPABILITY_MANIFEST['2.32.0'].status, 'review');
  assert.equal(aiostreamsCapability('2.32.0').status, 'review');
  assert.equal(report.checks.find(check => check.id === 'host-version').pass, false);
  assert.equal(template.config.presets.some(preset => ['torbox-search', 'newznab', 'torznab'].includes(preset.type)), false);
});

test('p2p profile has no service credential requirement and uses a p2p bridge', () => {
  const template = buildReliableTemplate({ service:'p2p', device:'mobile', resolution:'1080p' });
  assert.equal(template.metadata.category, 'P2P');
  assert.ok(template.config.presets.some(preset => preset.type === 'torrentio'));
  assert.equal(template.config.services.every(service => service.enabled === false), true);
  assert.equal(template.config.excludeUncached, false);
});

test('all V1 service/device/resolution combinations preserve the local-only contract', () => {
  for (const service of ['torbox', 'realdebrid', 'alldebrid', 'debridlink', 'p2p']) {
    for (const device of ['generic_tv', 'fire_tv', 'samsung', 'apple_tv', 'desktop', 'mobile']) {
      for (const resolution of ['1080p', '4k']) {
        const template = buildReliableTemplate({ service, device, resolution });
        const config = template.config;
        for (const field of SYNC_FIELDS) assert.deepEqual(config[field], [], `${service}/${device}/${resolution}: ${field}`);
        assert.equal(config.groups.enabled, false);
        assert.equal(config.dynamicAddonFetching.enabled, false);
        assert.equal(config.excludedStreamExpressions.length, 0);
        assert.equal(config.includedStreamExpressions.length, 0);
        assert.equal(config.preferredStreamExpressions.length, 0);
        assert.equal(config.rankedStreamExpressions.length, 0);
        assert.ok(config.resultLimits.global > 0);
      }
    }
  }
});

test('state normalisation rejects unsupported values', () => {
  const normalised = normalizeState({ service:'not-real', device:'unknown', resolution:'8k', cacheMode:'uncached' });
  assert.equal(normalised.service, 'torbox');
  assert.equal(normalised.device, 'generic_tv');
  assert.equal(normalised.resolution, '1080p');
  assert.equal(normalised.cacheMode, 'mixed');
});
