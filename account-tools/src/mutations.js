import * as defaultApi from './stremio-api.js';
import { getAuthKey } from './auth-session.js';
import { pushSnapshot, popSnapshot, peekSnapshot, canUndo } from './rollback.js';

let _api = defaultApi;

export function _setApi(api) {
  _api = api;
}

export function _resetApi() {
  _api = defaultApi;
}

async function requireAuth() {
  const key = getAuthKey();
  if (!key) throw new Error('Not authenticated');
  return key;
}

async function loadCurrent(authKey) {
  return _api.getAddonCollection(authKey);
}

async function saveWithRollback(authKey, currentAddons, newAddons, label) {
  await _api.setAddonCollection(authKey, newAddons);
  pushSnapshot(currentAddons, label);
  return _api.getAddonCollection(authKey);
}

export async function moveAddon(fromIndex, toIndex) {
  const authKey = await requireAuth();
  const current = await loadCurrent(authKey);
  if (fromIndex < 0 || fromIndex >= current.length) throw new Error('Invalid source index');
  if (toIndex < 0 || toIndex >= current.length) throw new Error('Invalid target index');
  if (fromIndex === toIndex) return current;

  const reordered = [...current];
  const [item] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, item);

  return saveWithRollback(authKey, current, reordered, 'move');
}

export async function removeAddon(index) {
  const authKey = await requireAuth();
  const current = await loadCurrent(authKey);
  if (index < 0 || index >= current.length) throw new Error('Invalid index');

  const updated = [...current];
  updated.splice(index, 1);

  return saveWithRollback(authKey, current, updated, 'remove');
}

export async function restoreFromBackup(backupAddons) {
  if (!Array.isArray(backupAddons) || backupAddons.length === 0) {
    throw new Error('Backup contains no addons');
  }
  const authKey = await requireAuth();
  const current = await loadCurrent(authKey);

  return saveWithRollback(authKey, current, backupAddons, 'restore');
}

let _undoing = false;

export async function undo() {
  if (_undoing) throw new Error('Undo already in progress');
  if (!canUndo()) throw new Error('Nothing to undo');
  _undoing = true;
  try {
    const authKey = await requireAuth();
    const snapshot = peekSnapshot();

    await _api.setAddonCollection(authKey, snapshot.addons);
    popSnapshot();
    return _api.getAddonCollection(authKey);
  } finally {
    _undoing = false;
  }
}

export { canUndo };
