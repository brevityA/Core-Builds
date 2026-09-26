/**
 * Address policy for stadium sync.
 *
 * Core Line 1.3.0 blocks every private host in SafeUrl.kt and lib/ssrf.mjs.
 * That is correct for arbitrary RSS (it stops the TV proxy from hitting
 * cloud metadata). It is wrong for a scoreboard on the same gym Wi-Fi.
 *
 * This module is the rule the ticker should adopt: public feeds stay
 * public-only; a stadium feed is allowed only when its host was explicitly
 * paired. Metadata endpoints stay blocked even if someone allowlists them.
 */

const ALWAYS_BLOCKED = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '::',
  'metadata.google.internal',
  'metadata.google.internal.',
  '169.254.169.254',
]);

export function normalizeHost(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
}

export function isMetadataHost(host) {
  const h = normalizeHost(host);
  if (ALWAYS_BLOCKED.has(h)) return true;
  if (h === '169.254.169.254') return true;
  if (h.endsWith('.localhost')) return true;
  return false;
}

export function isPrivateIp(host) {
  const h = normalizeHost(host);
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^0\./.test(h)) return true;
  const m = h.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (h.includes(':')) {
    if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
    const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
  }
  return false;
}

export function isLanHost(host) {
  const h = normalizeHost(host);
  if (!h || isMetadataHost(h)) return false;
  if (isPrivateIp(h)) return true;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan')) return true;
  return false;
}

function allowlistHas(allowlist, host, port) {
  const h = normalizeHost(host);
  const items = (allowlist || []).map((item) => normalizeHost(item));
  if (items.includes(h)) return true;
  if (port && items.includes(`${h}:${port}`)) return true;
  return false;
}

/**
 * Classify a feed URL the way Core Line should.
 * `allowlist` is the set of stadium hosts the operator paired (host or host:port).
 */
export function classifyFeedUrl(raw, allowlist = []) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    return { ok: false, lane: 'blocked', reason: 'invalid url' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, lane: 'blocked', reason: 'only http/https feeds are allowed' };
  }
  const host = normalizeHost(url.hostname);
  if (!host) return { ok: false, lane: 'blocked', reason: 'invalid host' };
  if (isMetadataHost(host) || host === '0.0.0.0' || host === '::') {
    return { ok: false, lane: 'blocked', reason: 'that host is blocked' };
  }
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  if (isLanHost(host) || host === 'localhost' || host.endsWith('.localhost')) {
    if (!allowlistHas(allowlist, host, url.port || port)) {
      return {
        ok: false,
        lane: 'blocked',
        reason: 'private addresses are blocked until this stadium host is paired',
      };
    }
    return { ok: true, lane: 'stadium', url: url.toString(), host, port };
  }
  return { ok: true, lane: 'public', url: url.toString(), host, port };
}

export function remoteAddress(socketAddress) {
  const raw = normalizeHost(socketAddress);
  const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? mapped[1] : raw;
}

/** True for loopback and RFC1918 peers. Used to refuse internet score pushes. */
export function isLanPeer(socketAddress) {
  const host = remoteAddress(socketAddress);
  if (!host) return false;
  if (host === '::1' || host === '127.0.0.1' || host === 'localhost') return true;
  return isPrivateIp(host);
}
