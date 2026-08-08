/**
 * SEL expression structural validator.
 *
 * Validates SEL (Stream Expression Language) expressions used by AIOStreams.
 * Checks parentheses balance, ternary syntax, string literals, entry shape,
 * function existence (against the upstream parser registry), and length
 * headroom vs the host per-expression limit.
 *
 * No browser globals, no credentials, no UI state.
 */

// Upstream SEL function registry — verified against Viren070/AIOStreams@main
// packages/core/src/parser/streamExpression.ts (this.parser.functions.* +
// dispatch cases + the expr-eval math allowlist). Anything not here is an
// invalid expression on every host (e.g. `private(...)` shipped in 8 Labs
// templates — audit 2026-08-08).
export const SEL_FUNCTIONS = new Set([
  'addon','age','audioChannel','audioChannels','audioTag','avg','bitrate',
  'cached','count','duration','encode','filename','folderName','folderSize',
  'idMatched','indexer','iqr','keyword','keywords','kurtosis','language',
  'library','max','mean','median','merge','message','min','mode',
  'multiEpisode','negate','passthrough','perGroup','percentile','pin','q1',
  'q2','q3','quality','range','regexMatched','regexMatchedInRange',
  'regexScore','releaseGroup','resolution','rseMatched','seMatched',
  'seMatchedInRange','seScore','seadex','seasonPack','seeders','service',
  'size','skewness','slice','stddev','streamExpressionScore','subtitle',
  'subtitles','sum','type','uncached','values','variance','visualTag',
  // expr-eval math allowlist (true entries in the parser's math config)
  'sqrt','ceil','floor','round','trunc','random','in',
]);

// Upstream default per-expression limit (MAX_SEL_LENGTH) and Core's safety
// margins: error above FAIL, warn above WARN.
export const SEL_MAX_LENGTH = 3000;
export const SEL_FAIL_LENGTH = 2800;
export const SEL_WARN_LENGTH = 2400;

const FN_RE = /([A-Za-z][A-Za-z0-9]*)\s*\(/g;
const NON_FN = new Set(['if','and','or','not','true','false']);

// Callables in `expr` that are not valid upstream SEL functions.
export function unknownSelFunctions(expr) {
  if (typeof expr !== 'string') return [];
  const clean = stripStringsAndComments(expr).value || '';
  const out = new Set();
  FN_RE.lastIndex = 0;
  let m;
  while ((m = FN_RE.exec(clean))) {
    const fn = m[1];
    if (SEL_FUNCTIONS.has(fn) || NON_FN.has(fn)) continue;
    out.add(fn);
  }
  return [...out];
}

export function validateExpression(expr) {
  if (typeof expr !== 'string') return { valid: false, error: 'Expression must be a string' };
  const trimmed = expr.trim();
  if (!trimmed.length) return { valid: false, error: 'Empty expression' };

  const stripped = stripStringsAndComments(trimmed);
  if (stripped.error) return { valid: false, error: stripped.error };
  const clean = stripped.value;

  const parenCheck = checkParentheses(clean);
  if (parenCheck) return { valid: false, error: parenCheck };

  const ternaryCheck = checkTernaries(clean);
  if (ternaryCheck) return { valid: false, error: ternaryCheck };

  const colonCheck = checkStrayColons(clean);
  if (colonCheck) return { valid: false, error: colonCheck };

  const unknown = unknownSelFunctions(trimmed);
  if (unknown.length) return { valid: false, error: `Unknown SEL function(s): ${unknown.join(', ')}` };

  if (trimmed.length > SEL_FAIL_LENGTH) {
    return { valid: false, error: `Expression length ${trimmed.length} exceeds ${SEL_FAIL_LENGTH} (host limit ${SEL_MAX_LENGTH})` };
  }
  if (trimmed.length > SEL_WARN_LENGTH) {
    return { valid: true, warn: `Expression length ${trimmed.length} is near the ${SEL_MAX_LENGTH} host limit`, unknown, length: trimmed.length };
  }

  return { valid: true };
}

export function validateEntry(entry) {
  if (!entry || typeof entry !== 'object') return { valid: false, error: 'Entry must be a non-null object' };
  if (typeof entry.expression !== 'string') return { valid: false, error: 'Entry must have a string expression' };
  if ('enabled' in entry && typeof entry.enabled !== 'boolean') return { valid: false, error: 'enabled must be a boolean' };
  return validateExpression(entry.expression);
}

export function validateExpressionList(list, listName = 'expressions') {
  if (!Array.isArray(list)) return [{ index: -1, error: `${listName} must be an array` }];
  const errors = [];
  for (let i = 0; i < list.length; i++) {
    const result = validateEntry(list[i]);
    if (!result.valid) errors.push({ index: i, error: result.error });
  }
  return errors;
}

export function validateSelPolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return { policy: [{ index: -1, error: 'Policy must be a non-null object' }] };
  }
  const errors = {};
  for (const key of ['preferredStreamExpressions', 'includedStreamExpressions', 'excludedStreamExpressions', 'rankedStreamExpressions']) {
    if (!(key in policy)) continue;
    const listErrors = validateExpressionList(policy[key], key);
    if (listErrors.length) errors[key] = listErrors;
  }
  return errors;
}

function stripStringsAndComments(expr) {
  let result = '';
  let i = 0;
  while (i < expr.length) {
    if (expr[i] === '/' && expr[i + 1] === '*') {
      const end = expr.indexOf('*/', i + 2);
      if (end === -1) return { error: 'Unterminated block comment' };
      i = end + 2;
    } else if (expr[i] === "'" || expr[i] === '"') {
      const quote = expr[i];
      i++;
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\') i++;
        i++;
      }
      if (i >= expr.length) return { error: `Unterminated string literal (${quote})` };
      result += '""';
      i++;
    } else {
      result += expr[i];
      i++;
    }
  }
  return { value: result };
}

function checkParentheses(expr) {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') {
      depth--;
      if (depth < 0) return `Unexpected closing parenthesis at position ${i}`;
    }
  }
  if (depth !== 0) return `Unmatched opening parenthesis (${depth} unclosed)`;
  return null;
}

function checkTernaries(expr) {
  let depth = 0;
  let questionCount = 0;
  let colonCount = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') depth--;
    else if (depth === 0) {
      if (expr[i] === '?') questionCount++;
      else if (expr[i] === ':') colonCount++;
    }
  }
  if (questionCount > 0 && colonCount < questionCount) {
    return `Malformed ternary: ${questionCount} '?' but only ${colonCount} ':'`;
  }
  return null;
}

function checkStrayColons(expr) {
  let depth = 0;
  let inTernary = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') depth--;
    else if (depth === 0) {
      if (expr[i] === '?') inTernary++;
      else if (expr[i] === ':') {
        if (inTernary > 0) { inTernary--; continue; }
        return `Unexpected colon at top level (position ${i})`;
      }
    }
  }
  return null;
}
