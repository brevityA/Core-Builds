import test from 'node:test';
import assert from 'node:assert/strict';

import { clearHistory, canUndo, popSnapshot } from '../src/rollback.js';
import { setSession, clearSession } from '../src/auth-session.js';
import { _setApi, _resetApi, moveAddon, removeAddon, restoreFromBackup, undo } from '../src/mutations.js';

const makeAddons = (names) => names.map(name => ({
  manifest: { name, id: name.toLowerCase() },
  transportUrl: `https://${name.toLowerCase()}.example.com/manifest.json`,
}));

const ADDONS_3 = () => makeAddons(['Torrentio', 'Comet', 'Cinemeta']);

function mockApi(initialAddons) {
  let serverAddons = JSON.parse(JSON.stringify(initialAddons));
  const setCalls = [];
  return {
    setCalls,
    getServerAddons: () => serverAddons,
    api: {
      getAddonCollection: async () => JSON.parse(JSON.stringify(serverAddons)),
      setAddonCollection: async (_key, addons) => {
        setCalls.push(JSON.parse(JSON.stringify(addons)));
        serverAddons = addons;
        return { result: true };
      },
    },
  };
}

test('mutations: moveAddon pushes rollback snapshot', async () => {
  clearHistory();
  setSession('test-key');
  const { api, setCalls } = mockApi(ADDONS_3());
  _setApi(api);

  try {
    await moveAddon(0, 2);
    assert.ok(canUndo());
    const snap = popSnapshot();
    assert.equal(snap.addons.length, 3);
    assert.equal(snap.addons[0].manifest.name, 'Torrentio');
    assert.equal(snap.label, 'move');
    assert.equal(setCalls.length, 1);
    assert.equal(setCalls[0][0].manifest.name, 'Comet');
    assert.equal(setCalls[0][1].manifest.name, 'Cinemeta');
    assert.equal(setCalls[0][2].manifest.name, 'Torrentio');
  } finally {
    _resetApi();
    clearSession();
    clearHistory();
  }
});

test('mutations: moveAddon same index is no-op', async () => {
  clearHistory();
  setSession('test-key');
  const { api, setCalls } = mockApi(ADDONS_3());
  _setApi(api);

  try {
    const result = await moveAddon(1, 1);
    assert.equal(result.length, 3);
    assert.equal(setCalls.length, 0);
    assert.ok(!canUndo());
  } finally {
    _resetApi();
    clearSession();
    clearHistory();
  }
});

test('mutations: moveAddon rejects invalid indices', async () => {
  setSession('test-key');
  const { api } = mockApi(ADDONS_3());
  _setApi(api);

  try {
    await assert.rejects(() => moveAddon(-1, 0), /Invalid source index/);
    await assert.rejects(() => moveAddon(0, 99), /Invalid target index/);
  } finally {
    _resetApi();
    clearSession();
  }
});

test('mutations: removeAddon pushes rollback and removes', async () => {
  clearHistory();
  setSession('test-key');
  const { api, setCalls } = mockApi(ADDONS_3());
  _setApi(api);

  try {
    await removeAddon(1);
    assert.ok(canUndo());
    assert.equal(setCalls[0].length, 2);
    assert.equal(setCalls[0][0].manifest.name, 'Torrentio');
    assert.equal(setCalls[0][1].manifest.name, 'Cinemeta');
  } finally {
    _resetApi();
    clearSession();
    clearHistory();
  }
});

test('mutations: removeAddon rejects invalid index', async () => {
  setSession('test-key');
  const { api } = mockApi(ADDONS_3());
  _setApi(api);

  try {
    await assert.rejects(() => removeAddon(99), /Invalid index/);
    await assert.rejects(() => removeAddon(-1), /Invalid index/);
  } finally {
    _resetApi();
    clearSession();
  }
});

test('mutations: restoreFromBackup saves current state before overwriting', async () => {
  clearHistory();
  setSession('test-key');
  const { api, setCalls } = mockApi(ADDONS_3());
  _setApi(api);

  try {
    const backupAddons = makeAddons(['NewAddon', 'AnotherAddon']);
    await restoreFromBackup(backupAddons);

    assert.ok(canUndo());
    const snap = popSnapshot();
    assert.equal(snap.label, 'restore');
    assert.equal(snap.addons.length, 3);
    assert.equal(snap.addons[0].manifest.name, 'Torrentio');

    assert.equal(setCalls[0].length, 2);
    assert.equal(setCalls[0][0].manifest.name, 'NewAddon');
  } finally {
    _resetApi();
    clearSession();
    clearHistory();
  }
});

test('mutations: restoreFromBackup rejects empty', async () => {
  setSession('test-key');
  await assert.rejects(() => restoreFromBackup([]), /no addons/i);
  await assert.rejects(() => restoreFromBackup(null), /no addons/i);
  clearSession();
});

test('mutations: undo restores previous state', async () => {
  clearHistory();
  setSession('test-key');
  const { api, setCalls } = mockApi(ADDONS_3());
  _setApi(api);

  try {
    await removeAddon(0);
    assert.equal(setCalls[0].length, 2);

    await undo();
    assert.equal(setCalls[1].length, 3);
    assert.equal(setCalls[1][0].manifest.name, 'Torrentio');
    assert.ok(!canUndo());
  } finally {
    _resetApi();
    clearSession();
    clearHistory();
  }
});

test('mutations: multiple undos in LIFO order', async () => {
  clearHistory();
  setSession('test-key');
  const { api, setCalls } = mockApi(ADDONS_3());
  _setApi(api);

  try {
    await removeAddon(2);
    await removeAddon(1);

    await undo();
    assert.equal(setCalls[2][0].manifest.name, 'Torrentio');
    assert.equal(setCalls[2].length, 2);

    await undo();
    assert.equal(setCalls[3].length, 3);
    assert.ok(!canUndo());
  } finally {
    _resetApi();
    clearSession();
    clearHistory();
  }
});

test('mutations: undo rejects when nothing to undo', async () => {
  clearHistory();
  setSession('test-key');
  await assert.rejects(() => undo(), /Nothing to undo/);
  clearSession();
});

test('mutations: requires auth for all operations', async () => {
  clearSession();
  clearHistory();
  await assert.rejects(() => moveAddon(0, 1), /Not authenticated/);
  await assert.rejects(() => removeAddon(0), /Not authenticated/);
  await assert.rejects(() => restoreFromBackup([{ manifest: { name: 'x' } }]), /Not authenticated/);
});
