import test from 'node:test';
import assert from 'node:assert/strict';
import { addonPolicy, assertAddonPolicy } from '../src/core/addon-policy.js';

test('addon policy normalizes instance IDs, enables presets, and applies timeout', () => {
  const result = addonPolicy({ addonTimeout: 9000 }, [
    { type:'torbox', instanceId:'torbox-1', enabled:true, options:{ name:'TorBox' } },
    { type:'zilean', id:'zilean-1', options:{} },
    { type:'disabled', instanceId:'disabled-1', enabled:false, options:{} },
  ]);
  assert.equal(result.presets.length, 2);
  assert.equal(result.presets[0].options.timeout, 9000);
  assert.equal(result.presets[1].instanceId, 'zilean-1');
  assertAddonPolicy(result);
});

test('addon policy skips malformed presets and reports warnings', () => {
  const result = addonPolicy({}, [{ options:{} }, null, { type:'ok', instanceId:'ok-1' }]);
  assert.equal(result.presets.length, 1);
  assert.equal(result.warnings.length, 1);
});

test('addon policy groups presets without empty groups', () => {
  const result = addonPolicy({}, [
    { type:'a', instanceId:'a-1', group:'primary' },
    { type:'b', instanceId:'b-1', category:'secondary' },
  ]);
  assert.deepEqual(Object.keys(result.groups).sort(), ['primary','secondary']);
  assert.ok(Object.values(result.groups).every(group => group.length > 0));
});
