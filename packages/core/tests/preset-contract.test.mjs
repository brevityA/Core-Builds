import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/generate-template.js';

function peerflixFor(service) {
  const template = generateTemplate({
    service,
    device: 'generic',
    resolution: '1080p',
    architecture: 'standard',
  });
  return template.config.presets.find(preset => preset.type === 'peerflix');
}

test('Peerflix always includes the AIOStreams-required useMultipleInstances option', () => {
  for (const service of ['p2p', 'http']) {
    const peerflix = peerflixFor(service);
    assert.ok(peerflix, `${service} output must include Peerflix`);
    assert.equal(peerflix.options.useMultipleInstances, false, `${service} Peerflix must opt out explicitly`);
  }
});
