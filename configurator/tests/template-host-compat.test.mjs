import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTemplates } from '../scripts/validate-template-host-compat.mjs';

const result = await validateTemplates();

test('template catalogue contains JSON templates', () => {
  assert.ok(result.files.length > 0, 'expected at least one template JSON file');
});

test('every non-legacy template is valid JSON', () => {
  assert.deepEqual(
    result.errors.filter((error) => error.includes('invalid JSON')),
    [],
    'one or more templates contain invalid JSON'
  );
});

test('no template references an upstream-removed preset', () => {
  const removed = result.presetReferences.filter((reference) =>
    ['torbox', 'usa-tv', 'debridio-watchtower'].includes(reference.value)
  );

  assert.deepEqual(removed, [], 'templates must not reference removed AIOStreams presets');
});
