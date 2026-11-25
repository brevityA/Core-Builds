// cli/data/formatters.js is generated from the configurator's formatters
// (scripts/sync_cli_formatters.mjs). The hand-kept copy it replaced fell behind:
// CLI builds still shipped badge checks the configurator had fixed, and lacked the
// Core formatters. Keep the two identical.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMATTERS as CLI } from '../data/formatters.js';
import { FORMATTERS as CONFIGURATOR } from '../../configurator/src/data/formatters.js';

test('the CLI ships the configurator formatters unchanged', () => {
  assert.deepEqual(CLI, JSON.parse(JSON.stringify(CONFIGURATOR)));
});

test('no CLI formatter writes a regex inside a ~ check', () => {
  assert.deepEqual(CLI.filter(f => `${f.name}\n${f.d}`.includes('::~(?i)')).map(f => f.id), []);
});
