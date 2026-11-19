import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFormatterEngine } from './helpers/aiostreams-formatter-engine.mjs';
import { FORMATTERS } from '../src/data/formatters.js';
import { PREVIEW_SAMPLE } from './fixtures/core-formatter-samples.mjs';

// AIOStreams' `~` is a case-insensitive contains (an exact item for lists), never
// a regex. 28 badge checks were written as `~(?i)(A|B)`, which matches nothing, so
// the elite-group, HDR, IMAX and Hybrid badges never showed.
let aio = null;
try { aio = await loadFormatterEngine(); }
catch (err) { if (process.env.CI) throw new Error(`could not load the AIOStreams formatter engine at the pin: ${err.message}`); }
const skip = aio ? false : 'AIOStreams formatter engine unreachable (offline); CI requires it';

const text = f => `${f.name}\n${f.d}`;
const renderWith = (f, stream) => {
  const v = aio.parseValue({ ...PREVIEW_SAMPLE, stream: { ...PREVIEW_SAMPLE.stream, ...stream } });
  return `${aio.render(f.name, v)}\n${aio.render(f.d, v)}`;
};

test('no formatter writes a regex inside a ~ check', () => {
  assert.deepEqual(FORMATTERS.filter(f => /::~\(\?i\)/.test(text(f))).map(f => f.id), []);
});

test('elite release groups light up, case-insensitively and exactly', { skip }, () => {
  const users = FORMATTERS.filter(f => text(f).includes('stream.releaseGroup::=framestor'));
  assert.ok(users.length >= 10, `expected the elite badge in most formatters, found ${users.length}`);
  for (const f of users) {
    const plain = renderWith(f, { releaseGroup: 'GROUP' });
    assert.notEqual(renderWith(f, { releaseGroup: 'FraMeSToR' }), plain, `${f.id}: FraMeSToR`);
    assert.notEqual(renderWith(f, { releaseGroup: 'D-Z0N3' }), plain, `${f.id}: D-Z0N3`);
    // Same-length names render to the same length unless a badge is added, whatever
    // styling the formatter applies to the name.
    assert.equal(renderWith(f, { releaseGroup: 'SADON' }).length, renderWith(f, { releaseGroup: 'SADOX' }).length, `${f.id}: SADON is not DON`);
    assert.notEqual(renderWith(f, { releaseGroup: 'DON' }).length, renderWith(f, { releaseGroup: 'DOX' }).length, `${f.id}: DON is elite`);
  }
});

test('IMAX and Hybrid badges follow the filename', { skip }, () => {
  for (const [word, token] of [['IMAX', 'stream.filename::~imax'], ['Hybrid', 'stream.filename::~hybrid']]) {
    const users = FORMATTERS.filter(f => text(f).includes(token));
    assert.ok(users.length > 0, word);
    for (const f of users) {
      const base = 'Example.Feature.2024.2160p.BluRay.REMUX.HEVC-GROUP.mkv';
      assert.notEqual(renderWith(f, { filename: base.replace('2160p', `${word}.2160p`) }), renderWith(f, { filename: base }), `${f.id}: ${word}`);
    }
  }
});

test('HDR badges name each tag once', { skip }, () => {
  for (const f of FORMATTERS.filter(x => text(x).includes('stream.visualTags::~hdr10+['))) {
    const out = renderWith(f, { visualTags: ['DV', 'HDR10+'] });
    assert.match(out, /DV/, f.id);
    assert.doesNotMatch(out, /🌟 🌟|HDR¹⁰.*HDR¹⁰/, `${f.id}: no doubled badge`);
    assert.doesNotMatch(renderWith(f, { visualTags: ['SDR'] }), /HDR¹⁰|👁️ DV/, `${f.id}: SDR shows no HDR badge`);
  }
});
