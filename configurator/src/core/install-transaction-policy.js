/**
 * Pure planning and verification for Stremio addon collection writes.
 * Credentials and auth keys never enter this module or its receipts.
 */

function urlOf(addon) {
  return typeof addon?.transportUrl === 'string' ? addon.transportUrl : '';
}

function uniqueByUrl(addons) {
  const seen = new Set();
  return (Array.isArray(addons) ? addons : []).filter(addon => {
    const url = urlOf(addon);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export function planAddonInstall({ existing = [], desiredUrls = [], removeWhen = () => false } = {}) {
  const before = uniqueByUrl(existing);
  const removed = before.filter(removeWhen);
  const kept = before.filter(addon => !removeWhen(addon));
  const desired = [...new Set(desiredUrls.filter(url => typeof url === 'string' && url))];
  const present = new Set(kept.map(urlOf));
  const added = [];
  for (const url of desired) {
    if (present.has(url)) continue;
    const addon = { transportName:'http', transportUrl:url, flags:{} };
    kept.push(addon);
    added.push(addon);
    present.add(url);
  }
  return Object.freeze({
    before: Object.freeze(before),
    after: Object.freeze(kept),
    desiredUrls: Object.freeze(desired),
    added: Object.freeze(added),
    removed: Object.freeze(removed),
    unchanged: kept.length - added.length,
  });
}

export function verifyAddonInstall({ actual = [], expectedUrls = [], absentUrls = [] } = {}) {
  const urls = new Set(uniqueByUrl(actual).map(urlOf));
  const expected = [...new Set(expectedUrls.filter(Boolean))];
  const absent = [...new Set(absentUrls.filter(Boolean))];
  const missing = expected.filter(url => !urls.has(url));
  const unexpectedlyPresent = absent.filter(url => urls.has(url));
  return Object.freeze({
    ok: missing.length === 0 && unexpectedlyPresent.length === 0,
    missing: Object.freeze(missing),
    unexpectedlyPresent: Object.freeze(unexpectedlyPresent),
    expectedCount: expected.length,
    actualCount: urls.size,
  });
}

export function createInstallReceipt({ status, operation, beforeCount, afterCount, verification, repaired = false } = {}) {
  return Object.freeze({
    receiptVersion: 1,
    createdAt: new Date().toISOString(),
    status: status || 'unknown',
    operation: operation || 'addon-install',
    beforeCount: Number(beforeCount) || 0,
    afterCount: Number(afterCount) || 0,
    repaired: Boolean(repaired),
    verification: verification ? {
      ok: Boolean(verification.ok),
      missingCount: verification.missing?.length || 0,
      unexpectedCount: verification.unexpectedlyPresent?.length || 0,
    } : null,
  });
}
