// Plain-language help for AIOStreams save refusals (src/core/aio-error-help.js).
// The messages are ones Core Builds has met from real hosts; see CLAUDE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainAioError, AIO_ERROR_HELP } from '../src/core/aio-error-help.js';
import { I18N_ROWS } from '../src/data/i18n-strings.js';

const id = m => explainAioError(m)?.id || null;

test('known refusals get their explanation', () => {
  assert.equal(id('3 / 107 regexes that are not allowed'), 'regex-allowlist');
  assert.equal(id('Forbidden URL: https://example.invalid/list.json'), 'regex-allowlist');
  assert.equal(id('AIO Subtitle has been removed: Addon is no longer hosted'), 'removed-addon');
  assert.equal(id('Preset SeaDex requires at least one usable service'), 'needs-service');
  assert.equal(id('No credentials found for service torbox'), 'needs-service');
  assert.equal(id('Every group must have at least one addon'), 'empty-group');
  assert.equal(id('Invalid password'), 'auth');
  assert.equal(id('Server returned 429'), 'rate-limit');
  assert.equal(id('Server returned 413'), 'too-large');
  assert.equal(id('TypeError: Failed to fetch'), 'network');
  assert.equal(id('Invalid input: expected string, received number at config.sortCriteria'), 'schema');
});

test('unknown messages get no guess', () => {
  assert.equal(explainAioError('Something odd happened'), null);
  assert.equal(explainAioError(''), null);
  assert.equal(explainAioError(undefined), null);
});

test('the raw message still shows under the explanation', () => {
  const app = readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /Config rejected by AIOStreams<\/div>\$\{aioErrorHelpHtml\(apiDetail \|\| safeMsg\)\}[\s\S]{0,400}\$\{safeMsg\}<\/code>/);
});

test('every explanation is translated', () => {
  const keys = new Set(I18N_ROWS.map(r => r[0]));
  for (const e of AIO_ERROR_HELP) {
    assert.ok(keys.has(e.title), `untranslated title: ${e.title}`);
    assert.ok(keys.has(e.help), `untranslated help: ${e.help}`);
  }
});
