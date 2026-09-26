/**
 * Push this bridge's feed URL into a Core Line TV pair server (port 8791).
 * The shipping APK rejects raw private IPs. A split-horizon hostname works
 * today; a 192.168 address needs the allowlist change described in the docs.
 */

export async function pushFeedToCoreLine({
  host,
  port = 8791,
  code,
  url,
  label = 'Stadium',
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!host) return { ok: false, reason: 'TV address missing' };
  if (!code) return { ok: false, reason: 'Pair code missing' };
  if (!url) return { ok: false, reason: 'Feed URL missing' };
  const body = new URLSearchParams({
    url: String(url),
    label: String(label).slice(0, 24) || 'Stadium',
    code: String(code).trim(),
  }).toString();
  let res;
  try {
    res = await fetchImpl(`http://${host}:${port}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': String(Buffer.byteLength(body)) },
      body,
    });
  } catch (err) {
    return { ok: false, reason: err?.message || 'TV unreachable' };
  }
  const text = await res.text();
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const rejected = /private|blocked|wrong code|not sent/i.test(stripped);
  return {
    ok: res.status >= 200 && res.status < 300 && !rejected,
    status: res.status,
    reason: stripped.slice(0, 240),
  };
}
