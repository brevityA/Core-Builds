import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateTemplate } from '../src/generate-template.js';

// AIOStreams v2.32 removed the legacy built-in torbox-search preset (TorBox
// Search API shut down). Saving a config that still includes it — enabled or
// disabled — fails on v2.32+ hosts, so the shared generator must never emit it.

test('TorBox output never contains the removed torbox-search preset', () => {
  for (const service of ['torbox', 'torbox-pro']) {
    const template = generateTemplate({
      service,
      device: 'generic',
      resolution: '1080p',
      architecture: 'standard',
    });
    const presetTypes = template.config.presets.map((p) => p.type);
    assert.ok(!presetTypes.includes('torbox-search'), `${service} output must not include torbox-search`);
    assert.ok(!JSON.stringify(template).includes('torbox-search'), `${service} output must not reference torbox-search anywhere`);
  }
});

test('generator source does not contain the torbox-search emission literal', async () => {
  const source = await readFile(new URL('../src/generate-template.js', import.meta.url), 'utf8');
  assert.ok(!source.includes("'torbox-search'"), 'generate-template.js must not emit torbox-search');
  assert.ok(!source.includes('"torbox-search"'), 'generate-template.js must not reference torbox-search');
});

test('Newznab presets use the v2.32 api shape (no newznabUrl/apiPath)', () => {
  const template = generateTemplate({
    service: 'multi',
    multiServices: ['torbox-pro', 'nzbgeek'],
    credentials: { nzbgeek: 'test-nzbgeek-key' },
    device: 'generic',
    resolution: '1080p',
    architecture: 'standard',
  });
  const nabs = template.config.presets.filter((p) => p.type === 'newznab');
  assert.ok(nabs.length > 0, 'multi+nzbgeek output should include the NZBGeek newznab preset');
  for (const p of nabs) {
    assert.ok(p.options.api && typeof p.options.api.url === 'string', 'newznab must use options.api.url');
    assert.ok(p.options.api.url.endsWith('/api'), `newznab endpoint must include /api: ${p.options.api.url}`);
    assert.ok(!('newznabUrl' in p.options), 'no legacy newznabUrl key');
    assert.ok(!('apiPath' in p.options), 'no legacy apiPath key');
    assert.ok(!('checkOwned' in p.options), 'no removed checkOwned key');
  }
});
