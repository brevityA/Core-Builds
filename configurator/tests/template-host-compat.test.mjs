import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  evaluateTemplate,
  hasTemplateDirectives,
  resolveCompatibleHosts,
  validateTemplates,
} from '../scripts/validate-template-host-compat.mjs';

const result = await validateTemplates();
const vidhin05 = JSON.parse(
  readFileSync(new URL('../../Filtering/upstream/vidhin05-regexes.snapshot.json', import.meta.url), 'utf8')
);

test('importing the validator does not fail the test run', () => {
  // The module used to run itself on import and set exitCode = 1 whenever any
  // template had an issue, which failed this whole file regardless of assertions.
  assert.equal(process.exitCode, undefined);
});

test('template catalogue contains JSON templates', () => {
  assert.ok(result.files.length > 0, 'expected at least one template JSON file');
});

test('every routed template is valid JSON and host-compatible', () => {
  assert.deepEqual(result.errors, [], 'template host-compatibility validation failed');
});

test('retired, legacy and personal templates are not routed', () => {
  for (const file of result.files) {
    assert.doesNotMatch(file, /[\\/](Deprecated|Legacy|Personal)[\\/]/);
  }
});

test('default routing includes every public host', () => {
  assert.equal(resolveCompatibleHosts('unknown-template').length, 8);
});

test('explicit routing can exclude a host', () => {
  // anime-tosho-new needs AIOStreams 2.36.0; Omni's runs 2.35.9.
  const hosts = resolveCompatibleHosts('brevity.core-nexus-anime');
  assert.equal(hosts.length, 7);
  assert.ok(!hosts.includes('omni'));
  assert.ok(hosts.includes('elfhosted'));
});

test('an excluded host would otherwise report the version gap', () => {
  const template = {
    metadata: { id: 'test-template' },
    config: { presets: [{ type: 'anime-tosho-new' }] },
  };
  const issues = evaluateTemplate(template, 'omni');
  assert.ok(issues.some((issue) => issue.includes('"anime-tosho-new" requires AIOStreams 2.36.0')));
});

test('disabled presets are rejected for the target host', () => {
  const template = {
    metadata: { id: 'test-template' },
    config: {
      presets: [{ type: 'torrentio' }],
    },
  };

  const issues = evaluateTemplate(template, 'elfhosted');
  assert.ok(
    issues.some((issue) => issue.includes('preset "torrentio" is disabled on elfhosted'))
  );
});

test('directive templates are skipped, not read as one fixed config', () => {
  // The smart template adds Torrentio only behind `__if: "!services"`.
  const smart = result.results.find((entry) => entry.file.replace(/\\/g, '/') === 'Smart/core-builds.json');
  assert.ok(smart, 'smart template is in the catalogue');
  assert.equal(smart.skipped, 'template directives');
  assert.ok(hasTemplateDirectives({ presets: [{ __if: '!services', type: 'torrentio' }] }));
  assert.ok(!hasTemplateDirectives({ presets: [{ type: 'torrentio' }] }));
});

test('an allowlisted inline pattern is accepted on a regex-restricted host', () => {
  const entry = vidhin05.find((item) => item.name === 'FraMeSToR');
  assert.ok(entry, 'snapshot carries FraMeSToR');
  const template = {
    metadata: { id: 'test-template' },
    config: { rankedRegexPatterns: [{ name: entry.name, pattern: entry.pattern, score: 100 }] },
  };
  assert.deepEqual(evaluateTemplate(template, 'elfhosted'), []);
});

test('an inline pattern that is not on the allowlist is rejected', () => {
  const template = {
    metadata: { id: 'test-template' },
    config: {
      rankedRegexPatterns: [{ name: 'Custom', pattern: '/\\b(example)\\b/', score: 10 }],
      excludedRegexPatterns: ['/\\b(also-not-listed)\\b/'],
    },
  };

  const issues = evaluateTemplate(template, 'elfhosted');
  assert.ok(issues.some((issue) => issue.includes('"rankedRegexPatterns" pattern "Custom" is not on elfhosted\'s regex allowlist')));
  assert.ok(issues.some((issue) => issue.includes('"excludedRegexPatterns" pattern "/\\b(also-not-listed)\\b/"')));
});

test('hosts that allow user regex accept any inline pattern', () => {
  const template = {
    metadata: { id: 'test-template' },
    config: { rankedRegexPatterns: [{ name: 'Custom', pattern: '/\\b(example)\\b/', score: 10 }] },
  };
  assert.deepEqual(evaluateTemplate(template, 'viren'), []);
});

test('blocked cache-and-play stream types are rejected', () => {
  const template = {
    metadata: { id: 'test-template' },
    config: {
      cacheAndPlay: {
        streamTypes: ['p2p'],
      },
    },
  };

  const issues = evaluateTemplate(template, 'elfhosted');
  assert.ok(issues.some((issue) => issue.includes('cache-and-play stream type "p2p"')));
});
