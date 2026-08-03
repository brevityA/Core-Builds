/**
 * Make a generated template safe to send to a remote import/paste service.
 *
 * Import links are intentionally public to the selected AIOStreams instance, so
 * they must never contain a user's service credentials. Keep this policy pure:
 * callers can safely continue using the full local template for downloads or
 * direct installs after creating an import-link copy.
 */

function isSensitiveKey(key) {
  // Do not use a bare `auth` match: it would also remove harmless metadata
  // fields such as `author`.
  return /(?:api.?key|access.?token|authorization|auth.?key|password|secret|token)/i.test(key)
    || /^auth$/i.test(key);
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== 'object') return value;

  const out = {};
  for (const [key, rawValue] of Object.entries(value)) {
    // Service credentials are an object rather than a single option key.
    if (key === 'credentials') {
      out[key] = {};
      continue;
    }
    // This intentionally covers apiKey, subDlApiKey, tmdbAccessToken,
    // tmdbApiKey, password, and future credential-shaped option names. The
    // built-in RPDB free-tier identifier is public configuration, not a user
    // credential, and must remain for poster redirects to keep working.
    if (isSensitiveKey(key) && !(key === 'rpdbApiKey' && rawValue === 't0-free-rpdb')) continue;
    out[key] = sanitizeValue(rawValue);
  }
  return out;
}

function sanitizePreset(preset) {
  const clean = sanitizeValue(preset);
  // StreamNZB uses a user-owned manifest URL rather than an apiKey. It can
  // embed a credential, so preserve the option shape but blank its value.
  if (clean?.type === 'streamnzb' && clean.options && typeof clean.options === 'object') {
    clean.options.url = '';
  }
  return clean;
}

/**
 * Return a credential-free clone suitable for a public import URL.
 *
 * @param {object} template A generated AIOStreams template.
 * @returns {object} A new, sanitized template. The input is never mutated.
 */
export function sanitizeTemplateForRemoteImport(template) {
  const result = sanitizeValue(clone(template || {}));
  const config = result?.config;

  if (config && Array.isArray(config.presets)) {
    config.presets = config.presets.map(sanitizePreset);
  }

  // `parentConfig` is emitted at the template root by the current assembly
  // contract. If present, do not expose its password through a paste URL.
  if (result?.parentConfig && typeof result.parentConfig === 'object') {
    result.parentConfig = sanitizeValue(result.parentConfig);
  }

  return result;
}
