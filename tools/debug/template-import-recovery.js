/**
 * Template import error recovery — handles malformed JSON, partial imports,
 * and schema mismatches gracefully instead of silent failures.
 */

/**
 * Try to parse a template JSON string with recovery attempts.
 * @param {string} raw - Raw JSON string (possibly from paste or file)
 * @returns {{ ok: boolean, data: object|null, error: string, recovery: string }}
 */
export function safeParseTemplate(raw) {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, data: null, error: 'Empty input', recovery: '' };
  }

  const trimmed = raw.trim();

  // 1. Direct parse
  try {
    const data = JSON.parse(trimmed);
    return { ok: true, data, error: '', recovery: '' };
  } catch (e) {
    // continue to recovery attempts
  }

  // 2. Strip markdown code fences
  if (trimmed.startsWith('```')) {
    const stripped = trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    try {
      const data = JSON.parse(stripped);
      return { ok: true, data, error: '', recovery: 'Stripped markdown code fences' };
    } catch (e) { /* continue */ }
  }

  // 3. Extract JSON from URL response (if user pasted a URL)
  if (trimmed.startsWith('http')) {
    return { ok: false, data: null, error: 'Input is a URL, not JSON — fetch it first', recovery: '' };
  }

  // 4. Try to find JSON object in mixed content
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    const candidate = trimmed.slice(jsonStart, jsonEnd + 1);
    try {
      const data = JSON.parse(candidate);
      return { ok: true, data, error: '', recovery: 'Extracted JSON from surrounding text' };
    } catch (e) { /* continue */ }
  }

  // 5. Common fixups
  let fixed = trimmed;
  // Trailing comma before }
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  // Single quotes → double quotes (basic)
  if (!trimmed.includes('"') && trimmed.includes("'")) {
    fixed = fixed.replace(/'/g, '"');
  }
  try {
    const data = JSON.parse(fixed);
    return { ok: true, data, error: '', recovery: 'Applied common JSON fixups (trailing commas, quotes)' };
  } catch (e) { /* continue */ }

  // 6. All attempts failed
  let hint = '';
  try { JSON.parse(trimmed); } catch (finalErr) {
    const lineMatch = finalErr?.message?.match(/position (\d+)/);
    hint = lineMatch ? ` near position ${lineMatch[1]}` : '';
    return {
      ok: false,
      data: null,
      error: `Invalid JSON${hint}: ${finalErr?.message || 'parse failed'}`,
      recovery: 'Could not auto-recover — check for missing brackets, commas, or quotes',
    };
  }
  return {
    ok: false,
    data: null,
    error: 'Invalid JSON: parse failed',
    recovery: 'Could not auto-recover — check for missing brackets, commas, or quotes',
  };
}

/**
 * Validate an imported template has the expected AIOStreams structure.
 * @param {Object} data - Parsed JSON
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateImportStructure(data) {
  const issues = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, issues: ['Not a valid object'] };
  }

  // Check for config key
  if (!data.config && !data.metadata) {
    // Maybe it's a raw AIOStreams config (no wrapper)
    if (data.presets || data.formatter || data.sortCriteria) {
      issues.push('Template appears to be a raw config without metadata wrapper — will be wrapped');
    } else {
      issues.push('Missing both "config" and "metadata" keys — not an AIOStreams template');
    }
  }

  // Check for presets
  if (data.config?.presets && !Array.isArray(data.config.presets)) {
    issues.push('config.presets is not an array');
  }

  // Check for formatter
  if (data.config?.formatter && typeof data.config.formatter !== 'object') {
    issues.push('config.formatter is not an object');
  }

  // Check for sortCriteria
  if (data.config?.sortCriteria && typeof data.config.sortCriteria !== 'object') {
    issues.push('config.sortCriteria is not an object');
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Try to extract a template from various input formats.
 * Handles: raw JSON, URL, base64, Stremio manifest URL.
 * @param {string} input - User input
 * @returns {{ type: string, data: object|null, error: string }}
 */
export function extractTemplate(input) {
  const trimmed = (input || '').trim();

  // JSON
  const parsed = safeParseTemplate(trimmed);
  if (parsed.ok) return { type: 'json', data: parsed.data, error: '' };

  // URL
  if (trimmed.startsWith('http')) {
    return { type: 'url', data: null, error: 'URL detected — fetch it to get the template' };
  }

  // Base64
  if (/^[A-Za-z0-9+/=]{20,}$/.test(trimmed)) {
    try {
      const decoded = atob(trimmed);
      const inner = safeParseTemplate(decoded);
      if (inner.ok) return { type: 'base64', data: inner.data, error: '' };
    } catch (e) { /* not valid base64 */ }
  }

  return { type: 'unknown', data: null, error: parsed.error };
}
