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

test('keeps only stream-related changelog entries newer than the pin', () => {
  const md = [
    '## [2.38.0](x) (2026-11-14)', '### Features',
    '* **presets/meteor:** skip "no results" placeholder stream ([abc1234](x))',
    '* **web:** add a mini player ([abc1234](x))',
    '* **core:** build Live TV channels and programmes from live catalogs ([abc1234](x))',
    '## [2.36.0](x) (2026-10-12)', '### Features', '* **core:** older entry',
  ].join('\n');
  const s = changelogSince(md, '2.36.0');
  assert.equal(s.length, 1);
  assert.deepEqual(s[0].entries.map(e => e.text), ['skip "no results" placeholder stream']);
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
  assert.match(md, /\*\*Presets added:\*\* `cinemeta`/);
  assert.match(md, /\| `excludeSeederRange` \| no decision; new upstream after 2\.36\.0 \|/);
});

test('decisions.json is valid and uses only known statuses', () => {
  const d = loadDecisions();
  for (const [key, v] of Object.entries(d.raw.options)) {
    assert.ok(STATUSES.includes(v.status), `${key}: unknown status ${v.status}`);
    assert.ok(v.why && v.why.length > 10, `${key}: give a reason`);
  }
  for (const p of d.raw.patterns) assert.doesNotThrow(() => new RegExp(p.match), p.match);
  assert.equal(d.lookup('tmdbApiKey').status, 'used', 'an exact entry wins over a pattern');
  assert.equal(d.lookup('openposterdbUrl').status, 'not-applicable');
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
