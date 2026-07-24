/**
 * Pre-deploy config validator — catches common AIOStreams rejection reasons
 * before the config is sent to a host.
 * Returns { ok: boolean, blockers: string[], warnings: string[] }
 */

const VALID_SORT_KEYS = new Set([
  'resolution', 'quality', 'cached', 'size', 'seeders', 'bitrate', 'encode',
  'audioChannels', 'audioTags', 'visualTags', 'releaseGroup', 'age',
  'regexScore', 'seScore', 'language', 'subtitle', 'title', 'year',
  'service', 'type', 'filename', 'indexer',
]);

export function validateConfigBeforeDeploy(config) {
  const blockers = [];
  const warnings = [];

  if (!config || typeof config !== 'object') {
    return { ok: false, blockers: ['Config is empty or not an object'], warnings: [] };
  }

  // Formatter
  const fmt = config.formatter;
  if (fmt) {
    if (fmt.id === 'tamtaro') {
      if (!fmt.definitions?.overrides?.tamtaro) {
        blockers.push("Formatter id is 'tamtaro' but overrides.tamtaro is missing — formatter won't apply");
      }
    }
  }

  // Sort criteria
  for (const [scope, keys] of Object.entries(config.sortCriteria || {})) {
    if (!Array.isArray(keys)) continue;
    for (const k of keys) {
      if (k.key && !VALID_SORT_KEYS.has(k.key)) {
        blockers.push(`sortCriteria.${scope}: invalid key "${k.key}"`);
      }
    }
  }

  // Presets
  const presets = config.presets || [];
  const enabled = presets.filter(p => p.enabled !== false);
  const iids = new Set();
  for (const p of enabled) {
    if (!p.instanceId) warnings.push(`Preset "${p.name || p.type}" missing instanceId`);
    if (p.instanceId && iids.has(p.instanceId)) {
      blockers.push(`Duplicate instanceId "${p.instanceId}"`);
    }
    if (p.instanceId) iids.add(p.instanceId);
  }

  // Groups reference stale instanceIds
  if (config.groups?.enabled && config.groups.groups) {
    const validIds = new Set(presets.map(p => p.instanceId).filter(Boolean));
    for (const g of config.groups.groups) {
      const stale = (g.addonInstanceIds || []).filter(id => !validIds.has(id));
      if (stale.length) blockers.push(`Group "${g.name}" references stale instanceId(s): ${stale.join(', ')}`);
    }
  }

  // Deduplicator
  const dedup = config.deduplicator || {};
  if (dedup.cached && !['per_addon', 'per_service', 'per_quality_resolution', 'global'].includes(dedup.cached)) {
    blockers.push(`deduplicator.cached: invalid mode "${dedup.cached}"`);
  }
  if (dedup.uncached === 'all') {
    blockers.push('deduplicator.uncached: "all" is not valid');
  }

  // autoPlay attributes
  const autoAllowed = new Set(['service', 'addon', 'proxied', 'resolution', 'quality', 'encode', 'audioTags', 'visualTags', 'languages', 'releaseGroup', 'type', 'infoHash', 'size']);
  if (config.autoPlay?.attributes) {
    const invalid = config.autoPlay.attributes.filter(v => !autoAllowed.has(String(v).trim()));
    if (invalid.length) warnings.push(`autoPlay.attributes: unknown values: ${invalid.join(', ')}`);
  }

  // cacheAndPlay streamTypes
  if (config.cacheAndPlay?.streamTypes) {
    const valid = ['torrent', 'usenet'];
    const invalid = config.cacheAndPlay.streamTypes.filter(v => !valid.includes(v));
    if (invalid.length) blockers.push(`cacheAndPlay.streamTypes: invalid values: ${invalid.join(', ')}`);
  }

  // TMDB-dependent features without key
  const hasTmdb = !!(config.tmdbReadAccessToken || config.tmdbApiKey);
  if (!hasTmdb) {
    if (config.titleMatching?.enabled !== false && config.titleMatching?.mode === 'fuzzy') {
      warnings.push('Title matching is fuzzy but no TMDB key — matching may be imprecise');
    }
  }

  // 0Cached ISE
  const ises = config.includedStreamExpressions || [];
  if (!ises.some(e => e.expression && /0Cached/i.test(e.expression))) {
    warnings.push('No 0Cached ISE — no fallback when nothing is cached');
  }

  // SEL not() usage (blocked on elfhosted/fortheweak)
  const allExprs = [
    ...(config.excludedStreamExpressions || []),
    ...(config.includedStreamExpressions || []),
    ...(config.preferredStreamExpressions || []),
  ];
  if (allExprs.some(e => e.expression && /\bnot\s*\(/.test(e.expression))) {
    blockers.push('SEL expression uses not() — must use negate() instead (blocked on elfhosted/fortheweak)');
  }

  return { ok: blockers.length === 0, blockers, warnings };
}

/**
 * Generate a human-readable pre-deploy report.
 */
export function formatPreDeployReport(result) {
  const lines = [];
  if (result.ok) {
    lines.push('✅ Pre-deploy check passed');
  } else {
    lines.push('✕ Pre-deploy check failed');
  }
  if (result.blockers.length) {
    lines.push('', 'BLOCKERS (will cause rejection):');
    result.blockers.forEach(b => lines.push(`  ✕ ${b}`));
  }
  if (result.warnings.length) {
    lines.push('', 'WARNINGS (may cause issues):');
    result.warnings.forEach(w => lines.push(`  ⚠ ${w}`));
  }
  return lines.join('\n');
}
