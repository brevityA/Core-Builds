// Offline tests for the feature rundown: parsing, usage, flags and the report.
// No network. Run: node --test scripts/feature-rundown/tests/
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  REPO_ROOT, STATUSES, buildRundown, changelogSince, collectUsage, compareVersions,
  isActive, loadDecisions, parsePresets, parseSchema, parseSel, renderMarkdown,
} from '../rundown.mjs';

// The shapes upstream's prettier output takes: inline and multi-line z.object,
// a named schema, a JSDoc'd key, an array of objects and a nested JSDoc.
const SCHEMA = `
const CacheAndPlaySchema = z
  .object({
    enabled: z.boolean().optional(),
    streamTypes: z.array(z.enum(['usenet', 'torrent'])).optional(),
  })
  .optional();

export const UserDataSchema = z.object({
  uuid: z.string().uuid().optional(),
  /** Request scoped: never persisted. */
  activeVariants: z.array(z.string()).optional(),
  excludedResolutions: z.array(z.string()).optional(),
  serviceWrap: z
    .object({
      enabled: z.boolean().optional(),
      /** Preset instanceIds to wrap */
      presets: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  cacheAndPlay: CacheAndPlaySchema.optional(),
  excludeSeederRange: z.tuple([z.number(), z.number()]).optional(),
  excludedStreamExpressions: z
    .array(z.object({ expression: z.string(), enabled: z.boolean() }))
    .optional(),
});
`;
const PRESETS_PIN = `export const PRESET_LIST = ['comet', 'meteor', 'torrentio'];`;
const PRESETS_NEW = `export const PRESET_LIST = ['comet', 'meteor', 'torrentio', 'cinemeta'];`;
const SEL = `this.parser.functions.resolution = x; this.parser.functions.health = y;`;

test('parses top-level options, their kinds, nested keys and JSDoc', () => {
  const o = parseSchema(SCHEMA);
  assert.deepEqual(Object.keys(o), ['uuid', 'activeVariants', 'excludedResolutions', 'serviceWrap', 'cacheAndPlay', 'excludeSeederRange', 'excludedStreamExpressions']);
  assert.equal(o.excludedResolutions.kind, 'array', 'the value on the key line counts');
  assert.equal(o.excludeSeederRange.kind, 'tuple');
  assert.equal(o.excludedStreamExpressions.kind, 'array', 'z.array(z.object()) is an array');
  assert.deepEqual(o.serviceWrap.keys, ['enabled', 'presets']);
  assert.deepEqual(o.cacheAndPlay.keys, ['enabled', 'streamTypes'], 'named schemas are followed');
  assert.match(o.activeVariants.doc, /Request scoped/);
  assert.equal(o.cacheAndPlay.doc, '', 'a nested JSDoc does not leak onto the next option');
});

test('reads presets and SEL functions', () => {
  assert.deepEqual(parsePresets(PRESETS_NEW), ['cinemeta', 'comet', 'meteor', 'torrentio']);
  assert.deepEqual(parseSel(SEL), ['health', 'resolution']);
});

test('an option is in use only when it switches something on', () => {
  assert.equal(isActive({ enabled: false, groupings: [] }), false);
  assert.equal(isActive({ enabled: true }), true);
  assert.equal(isActive([]), false);
  assert.equal(isActive(['480p']), true);
  assert.equal(isActive({ global: 10 }), true);
  assert.equal(isActive(null), false);
});

test('reads smart-template directives instead of counting their selectors', () => {
  // A __switch is on only when some branch is; its selector string is not a value.
  assert.equal(isActive({ __switch: 'services', cases: { '': false }, default: { __switch: 'inputs.cachedOnly', cases: { true: true }, default: false } }), true);
  assert.equal(isActive({ __switch: 'services', cases: { '': false }, default: false }), false);
  assert.equal(isActive({ __switch: 'inputs.language', cases: { French: [] }, default: [] }), false);
  assert.equal(isActive({ __remove: true }), false);
  assert.equal(isActive([{ __remove: true }]), false);
  // A list entry that is a __switch counts only if some branch keeps a value.
  assert.equal(isActive([{ __switch: 'services', cases: { '': { __remove: true } }, default: { __remove: true } }]), false);
  assert.equal(isActive([{ __switch: 'services', cases: { '': { __remove: true } }, default: 'x' }]), true);
  assert.equal(isActive(['480p', { __remove: true }]), true);
  // An __if guard on a preset does not make a switched-off entry count.
  assert.equal(isActive({ __if: '!services', enabled: false }), false);
  assert.equal(isActive({ enabled: { __switch: 'services', cases: { '': true }, default: false } }), true);
});

test('a smart template that writes an option at its default does not count as use', () => {
  const r = buildRundown({
    pin: '2.36.0', latest: '2.36.0',
    pinSrc: { schemas: SCHEMA, presetManager: PRESETS_PIN, streamExpression: SEL }, latestSrc: null, changelog: [],
    usage: { goldens: [], templates: [], smart: { excludedResolutions: [], cacheAndPlay: { __switch: 'services', cases: { '': { enabled: false } }, default: { enabled: false } } } },
    decisions: { lookup: k => ({ excludedResolutions: { status: 'used', why: 'x' }, cacheAndPlay: { status: 'used', why: 'x' } })[k] || { status: 'not-applicable', why: 'x' } },
  });
  const flags = Object.fromEntries(r.options.map(o => [o.key, o.flags]));
  assert.match(flags.excludedResolutions.join(), /decision says used, but no generated config/);
  assert.match(flags.cacheAndPlay.join(), /decision says used, but no generated config/);
});

test('keeps only stream-related changelog entries newer than the pin', () => {
  const md = [
    '## [2.38.0](x) (2026-11-14)', '### Features',
    '* **presets/meteor:** skip "no results" placeholder stream ([abc1234](x))',
    '* **web:** add a mini player ([abc1234](x))',
    '* **core:** build Live TV channels and programmes from live catalogs ([abc1234](x))',
    '* **sorter:** sort by audio channels ([abc1234](x))',
    '* **core:** fix audio-channel sorting ([abc1234](x))',
    '## [2.36.0](x) (2026-10-12)', '### Features', '* **core:** older entry',
  ].join('\n');
  const s = changelogSince(md, '2.36.0');
  assert.equal(s.length, 1);
  assert.deepEqual(s[0].entries.map(e => e.text), ['skip "no results" placeholder stream', 'sort by audio channels', 'fix audio-channel sorting'], 'audio channels stay; Live TV channels go');
  assert.ok(compareVersions('v2.38.1', '2.36.0') > 0 && compareVersions('2.36.0', '2.36.0') === 0);
});

test('flags options with no decision, contradicted decisions and upstream additions', () => {
  const usage = {
    goldens: [{ name: 'a', profile: 'stable', cfg: { excludedResolutions: ['480p'], serviceWrap: { enabled: true } } }],
    templates: [], smart: null,
  };
  const decisions = {
    lookup: k => ({
      uuid: { status: 'not-applicable', why: 'id' },
      excludedResolutions: { status: 'used', why: 'drops SD' },
      serviceWrap: { status: 'off-by-design', why: 'not yet' },
      cacheAndPlay: { status: 'used', why: 'plays uncached' },
      activeVariants: { status: 'not-applicable', why: 'request scoped' },
      excludedStreamExpressions: { status: 'used', why: 'ESEs' },
    })[k] || null,
  };
  const r = buildRundown({
    pin: '2.36.0', latest: '2.38.1',
    pinSrc: { schemas: SCHEMA.replace(/  excludeSeederRange[^\n]*\n/, ''), presetManager: PRESETS_PIN, streamExpression: SEL },
    latestSrc: { schemas: SCHEMA, presetManager: PRESETS_NEW, streamExpression: SEL },
    changelog: [], usage, decisions,
  });
  const flags = Object.fromEntries(r.options.map(o => [o.key, o.flags]));
  assert.deepEqual(flags.excludeSeederRange, ['no decision', 'new upstream after 2.36.0']);
  assert.match(flags.serviceWrap.join(), /decision says off-by-design, but configs set it/);
  assert.match(flags.cacheAndPlay.join(), /decision says used, but no generated config/);
  assert.deepEqual(flags.excludedResolutions, []);
  assert.deepEqual(r.attention.sort(), ['cacheAndPlay', 'excludeSeederRange', 'excludedStreamExpressions', 'serviceWrap'].sort());
  assert.deepEqual(r.presets.added, ['cinemeta']);
  assert.deepEqual(r.options.find(o => o.key === 'excludedResolutions').byProfile.stable, { active: 1, total: 1 });
  const md = renderMarkdown(r, { generatedAt: '2026-01-01' });
  const row = renderMarkdown({ ...r, options: [{ ...r.options[0], flags: ['no decision'], doc: String.raw`a \| b` }], attention: [r.options[0].key] }).split('\n').find(l => l.includes('a \\'));
  assert.ok(row.includes(String.raw`a \\\| b`), `a backslash before a pipe is escaped too, so the cell cannot end early: ${row}`);
  assert.match(md, /\*\*Presets added:\*\* `cinemeta`/);
  assert.match(md, /\| `excludeSeederRange` \| no decision; new upstream after 2\.36\.0 \|/);
});

test('a setting switched on in the smart template counts against an off-by-design decision', () => {
  const r = buildRundown({
    pin: '2.36.0', latest: '2.36.0',
    pinSrc: { schemas: SCHEMA, presetManager: PRESETS_PIN, streamExpression: SEL }, latestSrc: null, changelog: [],
    usage: { goldens: [], templates: [], smart: { serviceWrap: { enabled: true }, cacheAndPlay: { enabled: false } } },
    decisions: { lookup: k => ({ serviceWrap: { status: 'off-by-design', why: 'x' }, cacheAndPlay: { status: 'off-by-design', why: 'x' } })[k] || { status: 'not-applicable', why: 'x' } },
  });
  const flags = Object.fromEntries(r.options.map(o => [o.key, o.flags]));
  assert.match(flags.serviceWrap.join(), /off-by-design, but configs set it/);
  assert.deepEqual(flags.cacheAndPlay, [], 'present but switched off is not use');
});

test('decisions.json is valid and uses only known statuses', () => {
  const d = loadDecisions();
  for (const [key, v] of Object.entries(d.raw.options)) {
    assert.ok(STATUSES.includes(v.status), `${key}: unknown status ${v.status}`);
    assert.ok(v.why && v.why.length > 10, `${key}: give a reason`);
  }
  assert.equal(d.raw.patterns, undefined, 'no patterns: every decided key is named');
  for (const g of d.raw.groups) assert.ok(Array.isArray(g.keys) && g.keys.length && STATUSES.includes(g.status));
  assert.equal(d.lookup('openposterdbUrl').status, 'not-applicable', 'group keys resolve');
  assert.equal(d.lookup('streamApiKey'), null, 'an unseen option is never decided by a look-alike name');
});

test('reads this repo: goldens carry a profile, templates and the smart template load', () => {
  const u = collectUsage(REPO_ROOT);
  assert.ok(u.goldens.length >= 10);
  assert.ok(u.goldens.every(g => ['stable', 'balanced', 'advanced', 'labs'].includes(g.profile)), 'every golden names its profile');
  assert.ok(u.templates.length > 0);
  assert.ok(u.templates.every(t => !/[\\/](Personal|Deprecated|Legacy)[\\/]/.test(t.name)), 'personal and retired templates are left out');
  assert.ok(u.smart && Array.isArray(u.smart.presets));
});

test('the committed report covers every option decisions.json knows', () => {
  const md = readFileSync(join(REPO_ROOT, 'reports', 'FEATURE-RUNDOWN.md'), 'utf8');
  assert.match(md, /^# AIOStreams feature rundown/);
  for (const key of ['serviceWrap', 'groups', 'excludeSeasonPacks', 'rankedStreamExpressions']) assert.match(md, new RegExp(`\`${key}\``));
});
