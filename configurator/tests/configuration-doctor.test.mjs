import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseTemplate, applyRepairs } from '../../tools/inspector/doctor.mjs';

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
