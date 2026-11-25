// The downloadable formatters (Formatters/*.json) and the formatters inside the
// shipped templates had the same regex-style `~` checks that #845 fixed in the
// configurator's built-ins: `::~(?i)(A|B)` never matches, because AIOStreams' `~`
// is a case-insensitive includes for text and an exact item match for lists. The
// elite-group, HDR, IMAX, Hybrid and DD+ badges therefore never showed. Fixed by
// scripts/template-upgrades/v3_15_formatter_badges.py; this keeps it fixed and
// renders each file with AIOStreams' own engine at the pin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFormatterEngine } from './helpers/aiostreams-formatter-engine.mjs';
import { PREVIEW_SAMPLE } from './fixtures/core-formatter-samples.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const walk = dir => readdirSync(dir).flatMap(name => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
});
const shipped = [
  ...walk(join(repo, 'Formatters')),
  ...walk(join(repo, 'Templates')).filter(p => !/[\\/](Legacy|Deprecated)[\\/]/.test(p)),
];

// Every {name, description} pair a file carries: top level, definitions.overrides.*,
// or a template's config.formatter.
function layouts(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const out = [];
  const take = o => { if (o && typeof o.name === 'string' && typeof o.description === 'string') out.push(o); };
  const fromFormatter = f => {
    if (!f || typeof f !== 'object') return;
    take(f);
    for (const o of Object.values(f.definitions?.overrides || {})) take(o);
  };
  fromFormatter(data);
  fromFormatter(data?.config?.formatter);
  return out.map(o => ({ name: o.name, d: o.description }));
}

test('no shipped formatter or template writes a regex inside a ~ check', () => {
  const offenders = shipped.filter(p => readFileSync(p, 'utf8').includes('::~(?i)')).map(p => relative(repo, p));
  assert.deepEqual(offenders, []);
});

let aio = null;
try { aio = await loadFormatterEngine(); }
catch (err) { if (process.env.CI) throw new Error(`could not load the AIOStreams formatter engine at the pin: ${err.message}`); }
const skip = aio ? false : 'AIOStreams formatter engine unreachable (offline); CI requires it';

const render = (f, stream) => {
  const v = aio.parseValue({ ...PREVIEW_SAMPLE, stream: { ...PREVIEW_SAMPLE.stream, ...stream } });
  return `${aio.render(f.name, v)}\n${aio.render(f.d, v)}`;
};
const all = shipped.flatMap(p => layouts(p).map(f => ({ ...f, file: relative(repo, p) })));
const using = token => all.filter(f => `${f.name}\n${f.d}`.includes(token));

test('elite release-group badges light up in the shipped files', { skip }, () => {
  const users = using('stream.releaseGroup::=framestor');
  assert.ok(users.length >= 40, `expected the elite badge across formatters and templates, found ${users.length}`);
  for (const f of users) {
    assert.notEqual(render(f, { releaseGroup: 'FraMeSToR' }), render(f, { releaseGroup: 'GROUP' }), `${f.file}: FraMeSToR`);
  }
});

test('IMAX badges follow the filename in the shipped files', { skip }, () => {
  const users = using('stream.filename::~imax[');
  assert.ok(users.length >= 40, `found ${users.length}`);
  const base = 'Example.Feature.2024.2160p.BluRay.REMUX.HEVC-GROUP.mkv';
  for (const f of users) {
    assert.notEqual(render(f, { filename: base.replace('2160p', 'IMAX.2160p') }), render(f, { filename: base }), `${f.file}: IMAX`);
  }
});

test('the HDR condition fires on HDR tags and not on SDR in the shipped files', { skip }, () => {
  const users = using('stream.visualTags::~dv::or::stream.visualTags::~hdr::or::');
  assert.ok(users.length >= 40, `found ${users.length}`);
  for (const f of users) {
    assert.notEqual(render(f, { visualTags: ['HDR10'] }), render(f, { visualTags: ['SDR'] }), `${f.file}: HDR10 vs SDR`);
  }
});

test('HDR10 and HDR10+ labels show one badge each in the shipped files', { skip }, () => {
  const users = using("replace('HDR','🌟 HDR')::replace('🌟 HDR10+',");
  assert.ok(users.length >= 40, `found ${users.length}`);
  for (const f of users) {
    for (const tags of [['HDR10'], ['HDR10+'], ['DV', 'HDR10']]) {
      assert.doesNotMatch(render(f, { visualTags: tags }), /🌟 🌟|✨ 🌟/, `${f.file}: ${tags.join('+')} doubled`);
    }
  }
});

test('Core Nexus Elite shows the 2.38 status fields', { skip }, () => {
  const [elite] = layouts(join(repo, 'Formatters', 'core-nexus-elite-formatter.json'));
  for (const [field, badge] of [['preloading', 'PRELOAD'], ['proper', 'PROPER'], ['remastered', 'REMASTER'], ['regraded', 'REGRADED'], ['private', 'PRIVATE']]) {
    assert.match(render(elite, { [field]: true }), new RegExp(badge), field);
    assert.doesNotMatch(render(elite, { [field]: false }), new RegExp(`\\b${badge}\\b`), `${field} off`);
  }
});
