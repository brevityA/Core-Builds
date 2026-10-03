/**
 * 2026-10-03: AIOSubtitle, the default subtitle source, began taking ~12 s per
 * manifest. AIOStreams fetches every manifest on save, so hosts refused the whole
 * save ("Failed to fetch manifest for AIOSubtitle: 502 - Bad Gateway"). SubDL
 * without a key was refused too (subDlApiKey is required upstream).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateTemplate } from '../../packages/core/src/generate-template.js';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const subs = (input) => generateTemplate({ service: 'torbox-pro', ...input }, {}).config.presets
  .filter(p => ['aiosubtitle', 'opensubtitles-v3-plus', 'subdl'].includes(p.type)).map(p => p.type);

test('the default subtitle source is OpenSubtitles v3+, in both generators', () => {
  assert.deepEqual(subs({}), ['opensubtitles-v3-plus']);
  assert.doesNotMatch(app, /\['aiosubtitle'\]/, 'no code path may default to AIOSubtitle');
  assert.match(app, /subtitleAddons: \['opensubtitles-v3-plus'\]/);
});

test('SubDL is only emitted with its API key, and never leaves a build without subtitles', () => {
  assert.deepEqual(subs({ subtitleAddons: ['subdl'] }), ['opensubtitles-v3-plus']);
  assert.deepEqual(subs({ subtitleAddons: ['subdl'], credentials: { subdl: 'k' } }), ['subdl']);
  assert.deepEqual(subs({ subtitleAddons: ['subdl', 'opensubtitles-v3-plus'] }), ['opensubtitles-v3-plus']);
  assert.match(app, /if \(addons\.includes\('subdl'\) && S\.creds\.subdl\)/);
});

test('saved sessions on the old AIOSubtitle-only default move to OpenSubtitles v3+', () => {
  const src = app.match(/const STATE_SCHEMA = \d+;\nfunction migrateState\(input\) \{[\s\S]*?\n\}/)[0];
  const migrate = new Function('DEVICE_FORCE_LIMITED_AUDIO', 'DEVICE_AUDIO_DEFAULTS', 'OUTPUT_PROFILES', 'AIOSTREAMS_COMPATIBILITY_TARGETS', 'DEFAULT_AIOSTREAMS_VERSION',
    `${src}\nreturn migrateState;`)(new Set(), {}, [], ['2.35.7'], '2.35.7');
  assert.deepEqual(migrate({ _schema: 4, subtitleAddons: ['aiosubtitle'] }).subtitleAddons, ['opensubtitles-v3-plus']);
  assert.deepEqual(migrate({ _schema: 4, subtitleAddons: ['aiosubtitle', 'subdl'] }).subtitleAddons, ['aiosubtitle', 'subdl'], 'an explicit mix is the user\'s choice');
  assert.deepEqual(migrate({ _schema: 5, subtitleAddons: ['aiosubtitle'] }).subtitleAddons, ['aiosubtitle'], 'runs once');
});

test('an imported keyless SubDL is switched off; an entered key is written into it', async () => {
  const { mergeImportedPresets, importedSourceState } = await import('../src/core/template-update-policy.js');
  const imported = [{ type: 'subdl', instanceId: 'subdl-imp', enabled: true, options: { name: 'SubDL', language: ['EN'] } }];
  const generated = [{ type: 'opensubtitles-v3-plus', instanceId: 'osub-v3-1', enabled: true, options: {} }];
  const ctx = { optionalScrapers: [], subtitleAddons: ['subdl'], creds: {} };
  const keyless = mergeImportedPresets(generated, imported, ctx);
  assert.equal(keyless.find(p => p.type === 'subdl').enabled, false, 'AIOStreams would refuse the save');
  assert.ok(keyless.some(p => p.type === 'opensubtitles-v3-plus' && p.enabled !== false), 'subtitles still work');
  const keyed = mergeImportedPresets(generated, imported, { ...ctx, creds: { subdl: 'k' } });
  const subdl = keyed.find(p => p.type === 'subdl');
  assert.equal(subdl.enabled, true);
  assert.equal(subdl.options.subDlApiKey, 'k');
  const withKey = [{ ...imported[0], options: { ...imported[0].options, subDlApiKey: 'imported-key' } }];
  assert.equal(importedSourceState({ presets: withKey }).creds.subdl, 'imported-key', 'an imported key reaches the key field');
});
