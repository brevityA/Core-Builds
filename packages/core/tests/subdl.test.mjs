import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/generate-template.js';

test('SubDL uses the AIOStreams-required singular language option and provider codes', () => {
  const template = generateTemplate({
    service: 'torbox-pro',
    multiServices: ['torbox-pro'],
    device: 'generic',
    resolution: '1080p',
    architecture: 'standard',
    subtitleAddons: ['subdl'],
    subtitleLangs: ['en', 'it', 'fr'],
    credentials: { subdl: 'test-subdl-key' },
  });
  const subdl = template.config.presets.find(preset => preset.type === 'subdl');

  assert.ok(subdl);
  assert.deepEqual(subdl.options.language, ['EN', 'IT', 'FR']);
  assert.equal(subdl.options.languages, undefined, 'SubDL does not accept the generic languages option');
  assert.equal(subdl.options.hearingImpairment, 'hiInclude');
  assert.deepEqual(subdl.options.resources, ['subtitles']);
  assert.equal(subdl.options.subDlApiKey, 'test-subdl-key');
});

test('SubDL output caps legacy/crafted language selections at the provider maximum', () => {
  const template = generateTemplate({
    service: 'torbox-pro',
    multiServices: ['torbox-pro'],
    device: 'generic',
    resolution: '1080p',
    architecture: 'standard',
    subtitleAddons: ['subdl'],
    subtitleLangs: ['en', 'it', 'fr', 'de', 'es', 'pt'],
  });
  const subdl = template.config.presets.find(preset => preset.type === 'subdl');
  assert.deepEqual(subdl.options.language, ['EN', 'IT', 'FR', 'DE', 'ES']);
});
