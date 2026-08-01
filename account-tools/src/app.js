import { login, loginWithAuthKey, getAddonCollection } from './stremio-api.js';
import { setSession, clearSession, getAuthKey, getEmail, isAuthenticated, onSessionChange } from './auth-session.js';
import { parseCollection, searchAddons, filterByType, getCredentialWarnings, inspectManifest } from './addon-model.js';
import { createBackup, parseBackup, downloadBackup } from './backup.js';
import { diffSnapshots, formatDiff } from './diff.js';

let _addons = [];
let _parsedAddons = [];
let _lastBackup = null;

export async function loginWithEmail(email, password) {
  const authKey = await login(email, password);
  setSession(authKey, email);
  await loadAddons();
  return _parsedAddons;
}

export async function loginWithKey(authKey) {
  await loginWithAuthKey(authKey);
  setSession(authKey);
  await loadAddons();
  return _parsedAddons;
}

export async function loadAddons() {
  const authKey = getAuthKey();
  if (!authKey) throw new Error('Not authenticated');
  _addons = await getAddonCollection(authKey);
  _parsedAddons = parseCollection(_addons);
  return _parsedAddons;
}

export function getAddons() {
  return _parsedAddons;
}

export function search(query) {
  return searchAddons(_parsedAddons, query);
}

export function filterType(type) {
  return filterByType(_parsedAddons, type);
}

export function inspect(index) {
  const addon = _parsedAddons[index];
  if (!addon) throw new Error(`No addon at index ${index}`);
  return inspectManifest(addon);
}

export function getWarnings() {
  return getCredentialWarnings(_parsedAddons);
}

export function exportBackup() {
  if (_addons.length === 0) throw new Error('No addons loaded');
  _lastBackup = createBackup(_addons, { email: getEmail(), source: 'account-tools' });
  return _lastBackup;
}

export function exportAndDownload() {
  const backup = exportBackup();
  downloadBackup(backup);
  return backup;
}

export function importBackup(jsonOrString) {
  const backup = parseBackup(jsonOrString);
  return {
    backup,
    parsed: parseCollection(backup.addons),
  };
}

export function compareSnapshots(backupA, backupB) {
  const a = parseBackup(backupA);
  const b = parseBackup(backupB);
  const result = diffSnapshots(a, b);
  return { ...result, formatted: formatDiff(result) };
}

export function logout() {
  _addons = [];
  _parsedAddons = [];
  _lastBackup = null;
  clearSession();
}

export { isAuthenticated, onSessionChange };
