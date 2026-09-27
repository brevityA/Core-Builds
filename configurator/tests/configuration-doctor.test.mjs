import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diagnoseTemplate, applyRepairs, DOCTOR_SORT_CRITERIA, DOCTOR_RESOLUTIONS,
  DOCTOR_QUALITIES, DOCTOR_VISUAL_TAGS, DOCTOR_AUDIO_TAGS, DOCTOR_AUDIO_CHANNELS,
} from '../../tools/inspector/doctor.mjs';
import { AIO_SORT_CRITERIA } from '../src/config/generated/aiostreams-sort-schema.js';
import {
  AIO_RESOLUTIONS, AIO_QUALITIES, AIO_VISUAL_TAGS, AIO_AUDIO_TAGS, AIO_AUDIO_CHANNELS,
} from '../src/data/generated/aiostreams-enums.js';

test('standalone Doctor contract stays equal to the pinned AIOStreams schema', () => {
  assert.deepEqual(DOCTOR_SORT_CRITERIA, AIO_SORT_CRITERIA);
  assert.deepEqual(DOCTOR_RESOLUTIONS, AIO_RESOLUTIONS);
  assert.deepEqual(DOCTOR_QUALITIES, AIO_QUALITIES);
  assert.deepEqual(DOCTOR_VISUAL_TAGS, AIO_VISUAL_TAGS);
  assert.deepEqual(DOCTOR_AUDIO_TAGS, AIO_AUDIO_TAGS);
  assert.deepEqual(DOCTOR_AUDIO_CHANNELS, AIO_AUDIO_CHANNELS);
});

const broken = () => ({
  metadata: { name:'Imported' },
  config: {
    presets: [
      { type:'torbox-search', instanceId:'same', enabled:true, options:{ timeout:30000, apiKey:'secret-value' } },
      { type:'torrentio', instanceId:'same', enabled:true, options:{ url:'https://example.test/manifest.json?token=abc' } },
      { type:'comet', enabled:true, options:{} },
    ],
    titleMatching:{ mode:'exact', similarityThreshold:.95 },
    yearMatching:{ strict:true },
    includedStreamExpressions:[{ expression:'not(cached(streams))' }],
  },
});

test('doctor returns stable structured findings without mutating input', () => {
  const input = broken();
  const before = JSON.stringify(input);
  const result = diagnoseTemplate(input);
  assert.equal(JSON.stringify(input), before);
  assert.ok(result.summary.blocker >= 3);
  assert.ok(result.findings.some(f => f.id.startsWith('secret:') && f.path.includes('apiKey')));
  assert.ok(result.findings.some(f => f.id === 'removed-preset:0'));
  assert.ok(result.findings.some(f => f.id === 'duplicate-instance:1'));
  assert.ok(result.findings.every(f => ['blocker','warning','advisory'].includes(f.severity)));
});

test('selected repairs are explicit, pure, and leave unselected findings alone', () => {
  const input = broken();
  const result = diagnoseTemplate(input);
  const selected = result.findings.filter(f => f.repair).map(f => f.id);
  const fixed = applyRepairs(input, selected);
  assert.equal(input.config.presets.length, 3, 'input must not mutate');
  assert.equal(fixed.config.presets.length, 2);
  assert.notEqual(fixed.config.presets[0].instanceId, fixed.config.presets[1].instanceId);
  assert.equal(fixed.config.titleMatching.mode, 'fuzzy');
  assert.equal(fixed.config.titleMatching.similarityThreshold, .85);
  assert.equal(fixed.config.yearMatching.strict, false);
  assert.match(fixed.config.includedStreamExpressions[0].expression, /^negate\(/);
});

test('credential repairs redact nested values and URL parameters', () => {
  const input = broken();
  const findings = diagnoseTemplate(input).findings;
  const secretIds = findings.filter(f => f.id.startsWith('secret')).map(f => f.id);
  const fixed = applyRepairs(input, secretIds);
  assert.equal(fixed.config.presets[0].options.apiKey, '<redacted>');
  assert.equal(new URL(fixed.config.presets[1].options.url).searchParams.get('token'), '<redacted>');
});

test('repair output is deterministic', () => {
  const input = broken();
  const ids = diagnoseTemplate(input).findings.filter(f=>f.repair).map(f=>f.id);
  assert.deepEqual(applyRepairs(input, ids), applyRepairs(input, ids));
});

// ── Post-merge audit fixes (v3.13) ─────────────────────────────────

test('redaction works on array-wrapped imports, not only bare objects', () => {
  // Some export paths wrap the template in an array. diagnoseTemplate unwraps
  // it, so its finding paths are relative to the inner object — the repair
  // walk must start from that same root or every redaction silently no-ops.
  const wrapped = [{ config: { presets: [ { type:'comet', instanceId:'c1', enabled:true, options:{ apiKey:'leak-me' } } ] } }];
  const findings = diagnoseTemplate(wrapped).findings;
  const secretIds = findings.filter(f => f.id.startsWith('secret')).map(f => f.id);
  assert.ok(secretIds.length === 1, 'the wrapped credential must be found');
  const fixed = applyRepairs(wrapped, secretIds);
  assert.equal(fixed[0].config.presets[0].options.apiKey, '<redacted>');
});

test('removing a preset also removes its instanceId from groups', () => {
  // groups.groupings[].addons reference presets by instanceId; a dangling id
  // makes AIOStreams reject the config ("Every group must have at least one
  // addon"), which would turn a "safe repair" into a save failure.
  const input = { config: {
    presets: [
      { type:'torbox-search', instanceId:'tbs', enabled:true, options:{} },
      { type:'comet', instanceId:'c1', enabled:true, options:{} },
      { type:'torrentio', instanceId:'t1', enabled:true, options:{} },
    ],
    groups: { enabled:true, groupings: [
      { addons:['tbs','c1'] },
      { addons:['tbs'] },
      { addons:['t1'] },
    ] },
  } };
  const removeId = diagnoseTemplate(input).findings.find(f => f.id === 'removed-preset:0').id;
  const fixed = applyRepairs(input, [removeId]);
  assert.equal(fixed.config.presets.length, 2);
  assert.deepEqual(fixed.config.groups.groupings.map(g => g.addons), [['c1'], ['t1']]);
  assert.equal(fixed.config.groups.enabled, true);
});

test('groups disable entirely when a repair empties every grouping', () => {
  const input = { config: {
    presets: [ { type:'torbox-search', instanceId:'tbs', enabled:true, options:{} } ],
    groups: { enabled:true, groupings: [ { addons:['tbs'] } ] },
  } };
  const fixed = applyRepairs(input, ['removed-preset:0']);
  assert.equal(fixed.config.presets.length, 0);
  assert.deepEqual(fixed.config.groups.groupings, []);
  assert.equal(fixed.config.groups.enabled, false);
});

test('credential-bearing URLs inside string arrays are detected and redacted', () => {
  const input = { config: { presets: [], syncedRankedRegexUrls: ['https://example.test/regexes.json?token=abc123'] } };
  const findings = diagnoseTemplate(input).findings;
  const ids = findings.filter(f => f.id.startsWith('secret-url')).map(f => f.id);
  assert.equal(ids.length, 1, 'URL inside the array must be scanned');
  const fixed = applyRepairs(input, ids);
  assert.equal(new URL(fixed.config.syncedRankedRegexUrls[0]).searchParams.get('token'), '<redacted>');
});

test('payload size is measured on the config the host receives, not the wrapper', () => {
  const config = { presets: [], note: 'x'.repeat(500) };
  const bare = diagnoseTemplate(config);
  const wrapped = diagnoseTemplate({ metadata: { description: 'y'.repeat(5000) }, config });
  assert.equal(bare.payloadBytes, wrapped.payloadBytes);
});
