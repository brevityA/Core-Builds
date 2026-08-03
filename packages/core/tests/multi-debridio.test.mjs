import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/generate-template.js';

const INPUT = {
  service: 'multi',
  multiServices: ['torbox-pro', 'premiumize', 'debridio'],
  optionalScrapers: ['usenetcrawler'],
  credentials: {
    torbox: 'test-torbox-key',
    premiumize: 'test-premiumize-key',
    debridio: 'test-debridio-key',
    usenetcrawler: 'test-usenet-crawler-key',
  },
  device: 'generic',
  resolution: '4k',
  architecture: 'standard',
  content: 'all',
};

test('multi-service generation keeps Debridio and an optional Usenet Crawler preset', () => {
  const template = generateTemplate(INPUT);
  const debridio = template.config.presets.find(preset => preset.type === 'debridio');
  const crawler = template.config.presets.find(preset => preset.instanceId === 'usenetcrawler-1');

  assert.ok(debridio, 'Debridio must be emitted when it is selected as a multi-service extra');
  assert.equal(debridio.options.apiKey, 'test-debridio-key');

  assert.ok(crawler, 'Usenet Crawler must be emitted from optionalScrapers');
  assert.equal(crawler.type, 'newznab');
  assert.equal(crawler.options.name, 'Usenet Crawler');
  assert.equal(crawler.options.apiKey, 'test-usenet-crawler-key');
});
