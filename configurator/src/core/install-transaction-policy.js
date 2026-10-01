/**
 * Pure verification for Stremio addon collection writes.
 * Credentials and auth keys never enter this module.
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
