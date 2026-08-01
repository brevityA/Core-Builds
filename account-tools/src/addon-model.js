const CREDENTIAL_FIELDS = /apiKey|password|secret|auth.*key|token/i;

export function parseAddon(raw) {
  return {
    name: raw.manifest?.name || raw.transportName || 'Unknown Addon',
    version: raw.manifest?.version || null,
    description: raw.manifest?.description || null,
    types: raw.manifest?.types || [],
    catalogs: raw.manifest?.catalogs || [],
    resources: raw.manifest?.resources || [],
    transportUrl: raw.transportUrl || '',
    flags: raw.flags || {},
    id: raw.manifest?.id || null,
  };
}

export function parseCollection(addons) {
  return addons.map(parseAddon);
}

export function searchAddons(addons, query) {
  if (!query) return addons;
  const q = query.toLowerCase();
  return addons.filter(a =>
    a.name.toLowerCase().includes(q) ||
    (a.description || '').toLowerCase().includes(q) ||
    a.transportUrl.toLowerCase().includes(q) ||
    (a.id || '').toLowerCase().includes(q)
  );
}

export function filterByType(addons, type) {
  if (!type) return addons;
  return addons.filter(a => a.types.includes(type));
}

export function hasCredentialRisk(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname + parsed.search);
    const segments = path.split(/[/&?=]/);
    return segments.some(s => s.length >= 16 && /^[a-zA-Z0-9+/=_-]+$/.test(s));
  } catch {
    return false;
  }
}

export function getCredentialWarnings(addons) {
  const warnings = [];
  for (const addon of addons) {
    if (hasCredentialRisk(addon.transportUrl)) {
      warnings.push({
        addon: addon.name,
        url: redactUrl(addon.transportUrl),
        message: 'Transport URL may contain embedded credentials',
      });
    }
  }
  return warnings;
}

export function redactUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/');
    const redacted = segments.map(s =>
      s.length >= 16 && /^[a-zA-Z0-9+/=_-]+$/.test(s) ? '[REDACTED]' : s
    );
    parsed.pathname = redacted.join('/');
    for (const [k, v] of parsed.searchParams) {
      if (CREDENTIAL_FIELDS.test(k) || (v.length >= 16 && /^[a-zA-Z0-9+/=_-]+$/.test(v))) {
        parsed.searchParams.set(k, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    return url.replace(/[a-zA-Z0-9+/=_-]{16,}/g, '[REDACTED]');
  }
}

export function inspectManifest(addon) {
  return {
    name: addon.name,
    version: addon.version,
    description: addon.description,
    id: addon.id,
    types: addon.types,
    catalogs: addon.catalogs.length,
    resources: addon.resources.length,
    transportUrl: redactUrl(addon.transportUrl),
    hasCredentialRisk: hasCredentialRisk(addon.transportUrl),
  };
}
