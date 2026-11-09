import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateTemplate,
  resolveCompatibleHosts,
  validateTemplates,
} from '../scripts/validate-template-host-compat.mjs';

const result = await validateTemplates();

test('template catalogue contains JSON templates', () => {
  assert.ok(result.files.length > 0, 'expected at least one template JSON file');
});

test('every routed template is valid JSON and host-compatible', () => {
  assert.deepEqual(result.errors, [], 'template host-compatibility validation failed');
});

test('default routing includes every public host', () => {
  assert.equal(resolveCompatibleHosts('unknown-template').length, 8);
});

test('explicit routing can exclude a host', () => {
  const hosts = resolveCompatibleHosts('core-stable-torbox-1080p');
  assert.equal(hosts.length, 8);
  assert.ok(hosts.includes('elfhosted'));
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

test('local regex is rejected on regex-restricted hosts', () => {
  const template = {
    metadata: { id: 'test-template' },
    config: {
      rankedRegexPatterns: ['example'],
    },
  };

  const issues = evaluateTemplate(template, 'elfhosted');
  assert.ok(issues.some((issue) => issue.includes('local "rankedRegexPatterns"')));
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
