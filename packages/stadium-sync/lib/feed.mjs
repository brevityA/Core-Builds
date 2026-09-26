/**
 * Feeds Core Line 1.3.0 already knows how to read.
 *
 * The shipping 1.3.0 parser copies home/away scores, league, and status.
 * It drops `detail` unless a clock token also sits in the description.
 * Descriptions still carry that token so an unpatched TV keeps the game
 * clock. The patch in patches/core-line copies detail, venue, and a body
 * source of stadium. The in-venue display uses the structured snapshot.
 */

export function toCoreLineJson(events, meta = {}) {
  return {
    ok: true,
    source: 'stadium',
    venue: meta.venue || '',
    generatedAt: new Date(meta.now || Date.now()).toISOString(),
    events: events.map(toCoreLineEvent),
  };
}

export function toCoreLineEvent(event) {
  const description = [event.detail, ...(event.channels || [])].filter(Boolean).join(', ');
  return {
    id: event.id,
    title: `${event.away?.name || 'Guest'} vs ${event.home?.name || 'Home'}`,
    league: event.league || 'STADIUM',
    status: event.status || 'live',
    detail: event.detail || '',
    description,
    start: event.receivedAt ? new Date(event.receivedAt).toISOString() : null,
    away: event.away,
    home: event.home,
    channels: event.channels || [],
    venue: event.venue || '',
    feed: event.feed || 'Stadium',
    sport: event.sport || '',
    signal: event.signal || 'ok',
  };
}

export function toCoreLineRss(events, meta = {}) {
  const items = events.map((event) => {
    const title = escapeXml(`${event.away?.name || 'Guest'} vs ${event.home?.name || 'Home'}`);
    const description = escapeXml([event.detail, scoreLine(event), ...(event.channels || [])].filter(Boolean).join(' · '));
    const when = event.receivedAt ? new Date(event.receivedAt).toUTCString() : new Date().toUTCString();
    return [
      '<item>',
      `<title>${title}</title>`,
      `<description>${description}</description>`,
      `<category>${escapeXml(event.league || 'STADIUM')}</category>`,
      `<pubDate>${when}</pubDate>`,
      `<guid isPermaLink="false">${escapeXml(event.id)}</guid>`,
      '</item>',
    ].join('');
  }).join('');
  const title = escapeXml(meta.venue || 'Stadium');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${title}</title><description>Core Line stadium sync</description>${items}</channel></rss>`;
}

function scoreLine(event) {
  if (event.away?.score == null || event.home?.score == null) return '';
  const away = event.away.abbr || event.away.name;
  const home = event.home.abbr || event.home.name;
  return `${away} ${event.away.score}-${event.home.score} ${home}`;
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
