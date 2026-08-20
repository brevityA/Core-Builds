const PRIVATE_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '::',
  'metadata.google.internal',
]);

export function isSafeFeedUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    return { ok: false, reason: 'invalid url' };
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, reason: 'only http/https feeds are allowed' };
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (PRIVATE_HOSTS.has(host)) {
    return { ok: false, reason: 'private hosts are blocked' };
  }
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) {
    return { ok: false, reason: 'private hosts are blocked' };
  }
  if (isPrivateIp(host)) {
    return { ok: false, reason: 'private addresses are blocked' };
  }
  return { ok: true, url: url.toString() };
}

function isPrivateIp(host) {
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^0\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (host.includes(':')) {
    const h = host.toLowerCase();
    if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  }
  return false;
}
