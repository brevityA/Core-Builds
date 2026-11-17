/**
 * Builds a compact, public-safe reproduction report.
 *
 * It deliberately accepts only outcome/context fields, never service
 * credentials or a generated template. Free text is redacted again so a user
 * cannot accidentally copy a URL, manifest, or credential-looking value into
 * a public support thread.
 */

const PLACEHOLDER = 'Not supplied';
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;
// Auth headers are redacted as a unit, BEFORE the generic keyword rule:
// "Authorization: Bearer <token>" — the generic rule would swallow "Bearer"
// as the value of "authorization=" and leave the actual token behind.
const AUTH_HEADER_PATTERN = /\b(authorization|bearer)\s*[:=]?\s*(?:bearer\s+)?[A-Za-z0-9._~+\/=-]+/gi;
const CREDENTIAL_PATTERN = /\b(api[ _-]?key|token|password|authorization|bearer|secret)\s*[:=]\s*[^\s,;]+/gi;
const UUID_MANIFEST_PATTERN = /\b(?:stremio\/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/**
 * Reduce an arbitrary value to a displayable, credential-free string.
 * Nested objects are rendered via String(value) as '[object Object]'
 * (nothing leaks). Arrays are joined with ' | ' (spaced) rather than
 * String()'s comma-only join: without separators the URL pattern swallows
 * adjacent diagnostic content into its match, e.g.
 * String(['https://x?a=1', 'status 502']) -> 'https://x?a=1,status 502'.
 */
export function sanitizeFeedbackText(value, maxLength = 240) {
  const asText = Array.isArray(value)
    ? value.map(v => (v == null ? '' : String(v))).join(' | ')
    : String(value ?? '');
  const raw = asText
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(URL_PATTERN, '[redacted URL]')
    .replace(AUTH_HEADER_PATTERN, '$1 [redacted]')
    .replace(CREDENTIAL_PATTERN, '$1=[redacted]')
    .replace(UUID_MANIFEST_PATTERN, '[redacted ID]')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  return raw.slice(0, maxLength);
}

function field(label, value) {
  return `• ${label}: ${sanitizeFeedbackText(value) || PLACEHOLDER}`;
}

/**
 * Return a copy-ready text block. `context` should contain only safe generated
 * selections; caller code must never pass S.creds, URLs, UUIDs, passwords, or
 * raw template JSON.
 */
export function buildFeedbackReport(context = {}, report = {}) {
  const lines = [
    'Core Builds — sanitized no-stream report',
    field('Device', context.device),
    field('Service', context.service),
    field('Cache mode', context.cacheMode),
    field('Resolution', context.resolution),
    field('AIOStreams host', context.host),
    field('AIOStreams target/version', context.aiostreamsVersion),
    field('Core profile', context.profile),
    field('Content type', report.contentType),
    field('Exact title + episode', report.titleAndEpisode),
    field('Any addon returned streams', report.addonReturnedStreams),
    field('Visible error text', report.visibleError),
    '',
    'Do not attach API keys, passwords, JSON, UUIDs, manifest URLs, or screenshots containing URLs.',
  ];
  return lines.join('\n');
}
