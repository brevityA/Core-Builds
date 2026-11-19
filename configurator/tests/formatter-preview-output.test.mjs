import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMATTER_PREVIEWS } from '../src/data/formatter-previews.js';
import { FORMATTERS } from '../src/data/formatters.js';

// The previews are AIOStreams' own engine output, so they show exactly what a user
// would see in Stremio. Two built-ins used to print template text there: Family v3
// (`""{stream.title}""`) and Omni Diamond (a regex inside `~`, which AIOStreams
// renders as `{invalid_expression(...)}`), and every language line was empty
// because the samples lacked the fields the engine derives.
const lines = () => Object.entries(FORMATTER_PREVIEWS).flatMap(([id, variants]) =>
  Object.values(variants).flatMap(samples => Object.entries(samples).flatMap(([sample, c]) =>
    [c.n, ...c.d].map(line => ({ id, sample, line })))));

test('no built-in formatter prints template text', () => {
  const raw = lines().filter(({ line }) => /\{|\}|::|invalid_expression/.test(line));
  assert.deepEqual(raw, []);
});

test('language lines show a language in every sample', () => {
  const empty = lines().filter(({ line }) => /^\s*(🗣️?|🌐|💬)\s*$/u.test(line));
  assert.deepEqual(empty, []);
});

test('`~` is a plain contains check, never a regex', () => {
  // AIOStreams' `~` is value.includes(check): `~(?i)(A|B)` never matches anything,
  // and brackets inside it break the expression.
  const broken = FORMATTERS.filter(f => /::~\(\?i\)\([^)]*\[/.test(`${f.name}${f.d}`)).map(f => f.id);
  assert.deepEqual(broken, []);
  assert.doesNotMatch(FORMATTERS.map(f => `${f.name}${f.d}`).join(''), /audioTags::~\(\?i\)/, 'audio tags are exact names (DD+), not a pattern');
});
