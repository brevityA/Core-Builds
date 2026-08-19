/**
 * Assemble a slate in the browser / Android WebView.
 * The native shell proxies third-party hosts through /api/proxy so CORS
 * never enters the picture. The Node server still owns /api/slate for the web.
 */

import { parseFeed } from './parser.mjs';
import {
  LEAGUES,
  espnScoreboardUrl,
  eventsFromEspn,
  eventsFromNhl,
  eventsFromMlb,
  buildDemoSlate,
  mergeEvents,
} from './scoreboard.mjs';

export function isNativeShell() {
  return Boolean(globalThis.CORELINE_NATIVE);
}

export async function buildClientSlate({ leagues = [], feeds = [] } = {}) {
  const sources = [];
  const groups = await Promise.all(leagues.map(async (id) => {
    if (!LEAGUES[id]) return [];
    try {
      const data = await loadJson(espnScoreboardUrl(id));
      const events = eventsFromEspn(data, id);
      sources.push({ id, provider: 'espn', ok: true, count: events.length });
      return events;
    } catch (err) {
      if (id === 'nhl') {
        try {
          const data = await loadJson('https://api-web.nhle.com/v1/score/now');
          const events = eventsFromNhl(data);
          sources.push({ id, provider: 'nhl', ok: true, count: events.length });
          return events;
        } catch { /* fall through */ }
      }
      if (id === 'mlb') {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const data = await loadJson(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team,linescore,broadcasts(all)`);
          const events = eventsFromMlb(data);
          sources.push({ id, provider: 'mlb', ok: true, count: events.length });
          return events;
        } catch { /* fall through */ }
      }
      sources.push({ id, provider: 'espn', ok: false, error: err?.message || 'fetch failed', count: 0 });
      return [];
    }
  }));

  const feedResults = await Promise.all(feeds.map(async (feed) => {
    try {
      const text = await loadText(feed.url);
      const events = parseFeed(text, { source: 'rss', label: feed.label || 'RSS' });
      return { ok: true, events, label: feed.label, url: feed.url, error: null, count: events.length };
    } catch (err) {
      return { ok: false, events: [], label: feed.label, url: feed.url, error: err?.message || 'fetch failed', count: 0 };
    }
  }));

  let events = mergeEvents([...groups, ...feedResults.map((r) => r.events)]);
  let demo = false;
  if (!events.length) {
    events = mergeEvents([buildDemoSlate(), ...feedResults.map((r) => r.events)]);
    demo = true;
  }

  return {
    ok: true,
    demo,
    generatedAt: new Date().toISOString(),
    sources,
    feeds: feedResults.map(({ ok, label, url, error, count }) => ({ ok, label, url, error, count })),
    events,
  };
}

async function loadJson(url) {
  const res = await fetchRemote(url);
  return res.json();
}

async function loadText(url) {
  if (isBundledSample(url)) {
    const res = await fetch('/feeds/sample-sports.xml');
    if (!res.ok) throw new Error(`sample ${res.status}`);
    return res.text();
  }
  const res = await fetchRemote(url);
  return res.text();
}

async function fetchRemote(url) {
  const target = isNativeShell() ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
  const res = await fetch(target, {
    headers: {
      accept: 'application/json, application/rss+xml, application/xml, text/xml, text/plain;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  return res;
}

function isBundledSample(raw) {
  try {
    return new URL(raw, 'http://core.line').pathname.endsWith('/feeds/sample-sports.xml');
  } catch {
    return String(raw || '').includes('sample-sports.xml');
  }
}
