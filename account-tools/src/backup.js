const BACKUP_VERSION = 1;

export function createBackup(addons, meta = {}) {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    source: meta.source || 'account-tools',
    email: meta.email || null,
    addonCount: addons.length,
    addons,
  };
}

export function parseBackup(json) {
  if (typeof json === 'string') json = JSON.parse(json);
  if (json.version === BACKUP_VERSION && Array.isArray(json.addons)) return json;
  if (json?.result?.addons) {
    return createBackup(json.result.addons, { source: 'api-import' });
  }
  if (Array.isArray(json?.addons)) {
    return createBackup(json.addons, { source: 'legacy-import' });
  }
  throw new Error('Unrecognized backup format');
}

export function downloadBackup(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `stremio-backup-${ts}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

export function isValidBackup(data) {
  try {
    parseBackup(data);
    return true;
  } catch {
    return false;
  }
}
