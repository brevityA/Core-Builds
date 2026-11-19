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

// An emoji or a "Lang:" label (any small-caps spelling) with nothing after it.
const EMPTY_LANGUAGE = /(^\s*(🗣️?|🌐|💬)\s*$)|(L(ang|ᴀɴɢ):[\s\u2002\u2003]*([🔹🔸•»|]|$))/u;

test('language lines show a language in every sample', () => {
  for (const bad of ['🗣️ ', '⚑ Lᴀɴɢ: ', '🌍 Lᴀɴɢ: 🔹 ⚙️ ʜᴇᴠᴄ', 'Lang:\u2002']) assert.match(bad, EMPTY_LANGUAGE, bad);
  for (const ok of ['🗣️ English', '⚑ Lᴀɴɢ:\u2002ᴇɴɢʟɪꜱʜ', '🌍 Lᴀɴɢ: 🗣️ ᴍᴜʟᴛɪ']) assert.doesNotMatch(ok, EMPTY_LANGUAGE, ok);
  const empty = lines().filter(({ line }) => EMPTY_LANGUAGE.test(line));
  assert.deepEqual(empty, []);
});

test('MULTI shows only for two or more languages', () => {
  // `languages::>1` compares the array as a string ('English' > '1'), so one
  // language printed MULTI; the count is `languages::length::>1`.
  for (const [id, variants] of Object.entries(FORMATTER_PREVIEWS)) {
    for (const samples of Object.values(variants)) {
      for (const key of ['1080p', 'uncached']) {
        const c = samples[key]; if (!c) continue;
        assert.doesNotMatch([c.n, ...c.d].join('\n'), /ᴍᴜʟᴛɪ|MULTI/, `${id} ${key} has one language`);
      }
    }
  }
  assert.doesNotMatch(FORMATTERS.map(f => `${f.name}${f.d}`).join(''), /stream\.(languages|subtitles)::(>|==)\d/);
});

test('`~` is a plain contains check, never a regex', () => {
  // AIOStreams' `~` is value.includes(check): `~(?i)(A|B)` never matches anything,
  // and brackets inside it break the expression.
  const broken = FORMATTERS.filter(f => /::~\(\?i\)\([^)]*\[/.test(`${f.name}${f.d}`)).map(f => f.id);
  assert.deepEqual(broken, []);
  assert.doesNotMatch(FORMATTERS.map(f => `${f.name}${f.d}`).join(''), /audioTags::~\(\?i\)/, 'audio tags are exact names (DD+), not a pattern');
});
