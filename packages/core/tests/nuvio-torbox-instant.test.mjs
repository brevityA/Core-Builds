import test from 'node:test';
import assert from 'node:assert/strict';
import { generateNuvioTorboxInstantPolicy, validateNuvioHost, NUVIO_ADDONS } from '../src/nuvio-torbox-instant.js';

test('Nuvio route requires a P2P-capable host', () => {
  assert.throws(() => validateNuvioHost({ id:'elfhosted', supportsP2P:false, supportsNuvioInstant:false }));
  assert.equal(validateNuvioHost({ id:'fortheweak', supportsP2P:true, supportsNuvioInstant:true }), true);
});

test('Nuvio TorBox Instant policy contains no debrid credentials', () => {
  const result = generateNuvioTorboxInstantPolicy({ device:'shield', resolution:'4k' }, { id:'fortheweak', supportsP2P:true, supportsNuvioInstant:true });
  assert.equal(result.service, null);
  assert.deepEqual(result.credentials, {});
  assert.equal(result.p2pEnabled, true);
  assert.deepEqual(result.requiredServices, []);
  assert.deepEqual(result.addons, NUVIO_ADDONS);
});
