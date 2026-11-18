/**
 * Stream proxy (MediaFlow Proxy, StremThru, AIOStreams' built-in proxy).
 *
 * AIOStreams proxies a stream only when `proxy.enabled` is true and `proxy.url`
 * is set (packages/core/src/streams/proxifier.ts, evaluateProxyStream). Until
 * v3.18 the Configurator emitted `{ id, proxiedAddons, proxiedServices }` with
 * neither, so its "Enable Stream Proxy" toggle could never proxy anything, and an
 * update replaced a proxy the user had set up in AIOStreams with that stub.
 *
 * Empty `proxiedAddons` / `proxiedServices` mean "every addon" / "every service".
 * Service ids are AIOStreams' (`torbox`, `realdebrid`, …); streams with no
 * service (P2P, plain HTTP) are matched by `none`.
 *
 * Saving (utils/config.ts, validateProxy) refuses an enabled proxy without an id,
 * an address or credentials, sets the built-in proxy's address to the instance's
 * own, and asks the proxy for its public IP: an unreachable proxy or a wrong
 * password refuses the whole save ("Failed to get the public IP of the proxy
 * service …"). So the build only switches the proxy on once it has everything
 * that check needs, and the app explains that refusal.
 */

export const STREAM_PROXY_IDS = Object.freeze(['mediaflow', 'stremthru', 'builtin']);

export const STREAM_PROXY_INFO = Object.freeze({
  mediaflow: { label: 'MediaFlow Proxy', credential: 'API password', hint: 'The API_PASSWORD of your MediaFlow Proxy instance.' },
  stremthru: { label: 'StremThru', credential: 'username:password', hint: 'A username:password pair from STREMTHRU_PROXY_AUTH on your StremThru instance.' },
  builtin: { label: 'AIOStreams built-in', credential: 'username:password', hint: 'A username:password pair from AIOSTREAMS_AUTH on the AIOStreams instance itself.' },
});

export const DEFAULT_STREAM_PROXY = Object.freeze({
  enabled: false, id: 'mediaflow', url: '', publicUrl: '', proxiedServices: [], proxiedAddons: [],
});

// What every build carried before v3.18, and still carries with the proxy off.
const NEUTRAL_PROXY = () => ({ id: 'mediaflow', proxiedAddons: [], proxiedServices: [] });

/**
 * AIOStreams stores the proxy address and credentials encrypted (utils/crypto.ts:
 * URL-safe base64 of JSON tagged `aioEncrypt`/`a`), so an exported live config can
 * carry them sealed. They are passed back untouched: the instance that sealed them
 * decrypts them on save, and any other instance refuses (see streamProxySaveError).
 */
export function isAioEncrypted(value) {
  if (typeof value !== 'string' || !value || /[^A-Za-z0-9_=-]/.test(value)) return false;
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return ['aioEncrypt', 'a'].includes(json?.type || json?.t);
  } catch {
    return false;
  }
}

const strings = value => [...new Set((Array.isArray(value) ? value : []).map(v => String(v).trim()).filter(Boolean))];

/** null when `url` can be a proxy address, otherwise what is wrong with it. */
export function proxyUrlProblem(url) {
  const raw = String(url || '').trim();
  if (!raw) return 'Enter the address of your proxy.';
  if (isAioEncrypted(raw)) return null;
  let parsed;
  try { parsed = new URL(raw); } catch { return 'That is not a URL. It should look like https://proxy.example.com.'; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return 'The address must start with http:// or https://.';
  if (parsed.username || parsed.password) return 'Put the password in the password field, not in the address.';
  return null;
}

// URL-safe base64 has no '/', so trimming trailing slashes leaves a sealed value intact.
const cleanUrl = url => String(url || '').trim().replace(/\/+$/, '');

/** Normalise stored state (from localStorage, an import or the UI). */
export function normaliseStreamProxyState(state) {
  const s = state && typeof state === 'object' ? state : {};
  return {
    enabled: s.enabled === true,
    id: STREAM_PROXY_IDS.includes(s.id) ? s.id : 'mediaflow',
    url: typeof s.url === 'string' ? s.url.trim() : '',
    publicUrl: typeof s.publicUrl === 'string' ? s.publicUrl.trim() : '',
    proxiedServices: strings(s.proxiedServices),
    proxiedAddons: strings(s.proxiedAddons),
  };
}

/** What the proxy still needs before a save would accept it; null when ready. */
export function streamProxyProblem(state, credentials = '') {
  const s = normaliseStreamProxyState(state);
  if (!s.enabled) return null;
  // The built-in proxy is the AIOStreams instance itself, which fills in the address.
  if (s.id !== 'builtin') {
    const problem = proxyUrlProblem(s.url);
    if (problem) return problem;
  }
  if (!(typeof credentials === 'string' && credentials.trim())) return `Enter the ${STREAM_PROXY_INFO[s.id].credential}: AIOStreams refuses a proxy without one.`;
  return null;
}

/** The `proxy` block for a build. Off, or not yet complete, it is the neutral stub. */
export function streamProxyConfig(state, credentials = '') {
  const s = normaliseStreamProxyState(state);
  if (!s.enabled || streamProxyProblem(s, credentials)) return NEUTRAL_PROXY();
  return {
    enabled: true,
    id: s.id,
    ...(s.id !== 'builtin' ? { url: cleanUrl(s.url) } : {}),
    ...(s.publicUrl && !proxyUrlProblem(s.publicUrl) ? { publicUrl: cleanUrl(s.publicUrl) } : {}),
    credentials: credentials.trim(),
    proxiedAddons: s.proxiedAddons,
    proxiedServices: s.proxiedServices,
  };
}

/** A save refusal caused by the proxy, in words a user can act on; null for anything else. */
export function streamProxySaveError(message) {
  const text = String(message || '');
  if (/Failed to get the public IP of the proxy service/i.test(text)) {
    return 'AIOStreams could not reach your proxy when saving. Check that the address is reachable from the AIOStreams host and the password is right, or turn the proxy off in Advanced → Stream Proxy.';
  }
  if (/Proxy (credentials|URL|public URL) for \S+ (are|is) encrypted but failed to decrypt/i.test(text)) {
    return 'Your proxy settings came from another AIOStreams instance, which encrypted them, so this one cannot read them. Re-enter the proxy address and password under Advanced → Stream Proxy.';
  }
  if (/Proxy (credentials|URL|ID) (are|is) required/i.test(text)) {
    return 'AIOStreams needs the proxy address and password. Fill both in under Advanced → Stream Proxy, or turn the proxy off.';
  }
  return null;
}

/** Recover state and the credential from an imported config's `proxy`. */
export function streamProxyFromConfig(proxy) {
  if (!proxy || typeof proxy !== 'object' || proxy.enabled !== true || (!proxy.url && proxy.id !== 'builtin')) {
    return { state: { ...DEFAULT_STREAM_PROXY, proxiedServices: [], proxiedAddons: [] }, credentials: '' };
  }
  return {
    state: normaliseStreamProxyState({ ...proxy, enabled: true }),
    credentials: typeof proxy.credentials === 'string' ? proxy.credentials : '',
  };
}
