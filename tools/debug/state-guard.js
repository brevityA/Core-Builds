/**
 * State corruption guard — detects and recovers from corrupted localStorage.
 * Call loadStateGuard() before loadState() in app.js.
 */

export function loadStateGuard() {
  const keys = ['coreBuild', 'coreBuildStep', 'coreBuildBackups', 'coreBuildLastGen', 'coreBuildLastGoodHost'];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      // If it looks like JSON, try parsing
      if (raw.startsWith('{') || raw.startsWith('[')) {
        JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`[CoreBuilds] Corrupted localStorage key "${key}" — removing`, e);
      localStorage.removeItem(key);
    }
  }
}

/**
 * Validate the main state object after loading from localStorage.
 * Returns { ok: boolean, issues: string[], fixed: object|null }
 */
export function validateState(S) {
  const issues = [];
  const fixed = { ...S };

  // Required fields
  if (typeof S !== 'object' || S === null) return { ok: false, issues: ['State is not an object'], fixed: null };

  // multiServices must be array
  if (!Array.isArray(S.multiServices)) {
    issues.push('multiServices was not an array — reset to []');
    fixed.multiServices = [];
  }

  // creds must be object
  if (typeof S.creds !== 'object' || S.creds === null) {
    issues.push('creds was not an object — reset to {}');
    fixed.creds = {};
  }

  // Validate enums
  const enumChecks = {
    audio: ['lossless', 'standard', 'limited', 'dolby'],
    matchMode: ['relaxed', 'balanced', 'strict'],
    cacheMode: ['mixed', 'cached', 'uncached'],
    streamPool: ['normal', 'large', 'max'],
    pseArch: ['standard', 'iqr'],
    installMode: ['direct', 'manifest'],
  };
  for (const [key, valid] of Object.entries(enumChecks)) {
    if (S[key] && !valid.includes(S[key])) {
      issues.push(`${key}="${S[key]}" is invalid — reset to "${valid[1] || valid[0]}"`);
      fixed[key] = valid[1] || valid[0];
    }
  }

  // Validate autoPlayMethod
  if (S.autoPlayMethod && !['matchingFile', 'matchingIndex', 'firstFile'].includes(S.autoPlayMethod)) {
    issues.push(`autoPlayMethod="${S.autoPlayMethod}" is invalid — reset to "matchingFile"`);
    fixed.autoPlayMethod = 'matchingFile';
  }

  // Validate addonTimeout
  if (S.addonTimeout && ![4000, 6000, 8000, 10000].includes(Number(S.addonTimeout))) {
    issues.push(`addonTimeout=${S.addonTimeout} is invalid — reset to 6000`);
    fixed.addonTimeout = 6000;
  }

  // Validate sizeLimit
  if (S.sizeLimit && !['10', '20', '30', '50', 'unlimited'].includes(String(S.sizeLimit).replace(/GB$/, ''))) {
    issues.push(`sizeLimit="${S.sizeLimit}" is invalid — reset to "unlimited"`);
    fixed.sizeLimit = 'unlimited';
  }

  // Validate optionalScrapers
  if (!Array.isArray(S.optionalScrapers)) {
    issues.push('optionalScrapers was not an array — reset to []');
    fixed.optionalScrapers = [];
  }

  // Validate langs
  if (!Array.isArray(S.langs)) {
    issues.push('langs was not an array — reset to ["English"]');
    fixed.langs = ['English'];
  }

  return { ok: issues.length === 0, issues, fixed: issues.length > 0 ? fixed : null };
}

/**
 * Auto-repair state if validation finds issues.
 * Logs warnings and saves the repaired state.
 */
export function autoRepairState(S, saveStateFn) {
  const result = validateState(S);
  if (!result.ok && result.fixed) {
    console.warn('[CoreBuilds] State repair:', result.issues.join('; '));
    Object.assign(S, result.fixed);
    if (typeof saveStateFn === 'function') saveStateFn();
  }
  return result;
}
