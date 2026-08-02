import test from 'node:test';
import assert from 'node:assert/strict';
import { isNuvioInstantHost, requireNuvioInstantHost } from '../src/nuvio-hosts.js';

test('Nuvio route rejects P2P-disabled hosts', () => {
  assert.equal(isNuvioInstantHost({ supportsP2P:false, supportsNuvioInstant:false }), false);
  assert.throws(() => requireNuvioInstantHost({ id:'elfhosted', supportsP2P:false }));
});

test('Nuvio route accepts explicitly capable hosts', () => {
  const host = { id:'fortheweak', supportsP2P:true, supportsNuvioInstant:true };
  assert.equal(isNuvioInstantHost(host), true);
  assert.equal(requireNuvioInstantHost(host), host);
});
