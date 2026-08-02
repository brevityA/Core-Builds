import test from 'node:test';
import assert from 'node:assert/strict';
import { applyNuvioTorboxInstantPolicy } from '../src/nuvio-template.js';

test('Nuvio policy removes debrid services and preserves a safe P2P template', () => {
  const input = { device:'shield', resolution:'4k' };
  const host = { id:'fortheweak', supportsP2P:true, supportsNuvioInstant:true };
  const source = { metadata:{}, config:{ presets:[{type:'torbox'},{type:'comet'}] } };
  const { template, policy } = applyNuvioTorboxInstantPolicy(source, input, host);
  assert.deepEqual(template.config.services, []);
  assert.deepEqual(template.config.requiredServices, []);
  assert.equal(template.config.p2pEnabled, true);
  assert.deepEqual(template.config.presets.map(p => p.type), ['comet']);
  assert.equal(policy.route, 'nuvio-torbox-instant');
  assert.deepEqual(source.config.services, undefined);
});
