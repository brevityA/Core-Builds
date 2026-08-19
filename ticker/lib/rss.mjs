import { isSafeFeedUrl } from './ssrf.mjs';
import { parseFeed } from './parser.mjs';

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 10_000;

export async function fetchFeed(rawUrl, meta = {}) {
  const safety = isSafeFeedUrl(rawUrl);
  if (!safety.ok) {
    return { ok: false, error: safety.reason, events: [] };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(safety.url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'CoreLine/1.0 (+https://github.com/brevityA/Core-Builds)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, application/json, text/xml, text/plain;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      return { ok: false, error: `feed returned ${res.status}`, events: [] };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return { ok: false, error: 'feed too large', events: [] };
    }
    const events = parseFeed(buf.toString('utf8'), meta);
    return { ok: true, events, bytes: buf.length };
  } catch (err) {
    const message = err?.name === 'AbortError' ? 'feed timed out' : (err?.message || 'fetch failed');
    return { ok: false, error: message, events: [] };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'CoreLine/1.0 (+https://github.com/brevityA/Core-Builds)',
        accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
