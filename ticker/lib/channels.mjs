/**
 * Channel name normalizer.
 * Turns the messy tokens people actually write — "epn", "tsn 4", "sn3",
 * "sportsnet ontario" — into the short bugs a ticker should show.
 */

const ALIAS_PAIRS = [
  ['espn news', 'ESPNEWS'],
  ['espnews', 'ESPNEWS'],
  ['espn plus', 'ESPN+'],
  ['espn+', 'ESPN+'],
  ['espn2', 'ESPN2'],
  ['espnu', 'ESPNU'],
  ['espn 2', 'ESPN2'],
  ['espn u', 'ESPNU'],
  ['epn', 'ESPN'],
  ['espn', 'ESPN'],
  ['abc', 'ABC'],
  ['nbc sports', 'NBCSN'],
  ['nbcsn', 'NBCSN'],
  ['nbc', 'NBC'],
  ['cbs sports', 'CBSSN'],
  ['cbssn', 'CBSSN'],
  ['cbs', 'CBS'],
  ['fox sports 1', 'FS1'],
  ['fox sports 2', 'FS2'],
  ['fox sports', 'FS1'],
  ['fox', 'FOX'],
  ['fs1', 'FS1'],
  ['fs2', 'FS2'],
  ['fsn', 'FSN'],
  ['btn', 'BTN'],
  ['sec network', 'SECN'],
  ['secn', 'SECN'],
  ['accn', 'ACCN'],
  ['pac-12', 'P12N'],
  ['longhorn', 'LHN'],
  ['tnt sports', 'TNT'],
  ['tnt', 'TNT'],
  ['tbs', 'TBS'],
  ['usa network', 'USA'],
  ['usa', 'USA'],
  ['nba tv', 'NBA TV'],
  ['nbatv', 'NBA TV'],
  ['nhl network', 'NHLN'],
  ['nhln', 'NHLN'],
  ['nhl net', 'NHLN'],
  ['mlb network', 'MLBN'],
  ['mlbn', 'MLBN'],
  ['mlb.tv', 'MLB.TV'],
  ['mlb tv', 'MLB.TV'],
  ['nfl network', 'NFLN'],
  ['nfln', 'NFLN'],
  ['nfl redzone', 'NFL RZ'],
  ['redzone', 'NFL RZ'],
  ['nfl+', 'NFL+'],
  ['prime video', 'PRIME'],
  ['amazon prime', 'PRIME'],
  ['amazon', 'PRIME'],
  ['prime', 'PRIME'],
  ['apple tv+', 'APPLE'],
  ['apple tv', 'APPLE'],
  ['appletv', 'APPLE'],
  ['peacock', 'PEACOCK'],
  ['paramount+', 'P+'],
  ['paramount plus', 'P+'],
  ['youtube tv', 'YTTV'],
  ['youtube', 'YT'],
  ['max', 'MAX'],
  ['hbo max', 'MAX'],
  ['fubo', 'FUBO'],
  ['sling', 'SLING'],
  ['dazn', 'DAZN'],
  ['bein sports', 'BEIN'],
  ['bein', 'BEIN'],
  ['tnt sports 1', 'TNT 1'],
  ['sky sports main event', 'SKY ME'],
  ['sky sports premier league', 'SKY PL'],
  ['sky sports', 'SKY'],
  ['tnt sports', 'TNT SP'],
  ['bt sport', 'TNT SP'],
  ['now tv', 'NOW'],
  ['tsn 1', 'TSN1'],
  ['tsn 2', 'TSN2'],
  ['tsn 3', 'TSN3'],
  ['tsn 4', 'TSN4'],
  ['tsn 5', 'TSN5'],
  ['tsn1', 'TSN1'],
  ['tsn2', 'TSN2'],
  ['tsn3', 'TSN3'],
  ['tsn4', 'TSN4'],
  ['tsn5', 'TSN5'],
  ['tsn', 'TSN'],
  ['sportsnet one', 'SN 1'],
  ['sportsnet 360', 'SN360'],
  ['sportsnet ontario', 'SN ONT'],
  ['sportsnet west', 'SN W'],
  ['sportsnet east', 'SN E'],
  ['sportsnet pacific', 'SN PAC'],
  ['sportsnet world', 'SN WLD'],
  ['sportsnet+', 'SN+'],
  ['sportsnet plus', 'SN+'],
  ['sn ontario', 'SN ONT'],
  ['sn ont', 'SN ONT'],
  ['sn west', 'SN W'],
  ['sn east', 'SN E'],
  ['sn pacific', 'SN PAC'],
  ['sn360', 'SN360'],
  ['sn 360', 'SN360'],
  ['sn1', 'SN 1'],
  ['sn 1', 'SN 1'],
  ['sn2', 'SN 2'],
  ['sn 2', 'SN 2'],
  ['sn3', 'SN 3'],
  ['sn 3', 'SN 3'],
  ['sn4', 'SN 4'],
  ['sn 4', 'SN 4'],
  ['sn5', 'SN 5'],
  ['sn 5', 'SN 5'],
  ['sn+', 'SN+'],
  ['sportsnet', 'SN'],
  ['rds', 'RDS'],
  ['tva sports', 'TVA'],
  ['tva', 'TVA'],
  ['cbc', 'CBC'],
  ['citytv', 'CITY'],
  ['ctv', 'CTV'],
  ['globaltv', 'GLOBAL'],
  ['the sports network', 'TSN'],
  ['willow', 'WILLOW'],
  ['golf channel', 'GOLF'],
  ['tennis channel', 'TENNIS'],
  ['olympic channel', 'OLY'],
  ['univision', 'UNI'],
  ['unimas', 'UNIMAS'],
  ['telemundo', 'TMD'],
  ['galavision', 'GALA'],
  ['fox deportes', 'FXD'],
  ['espn deportes', 'ESPND'],
  ['tvazteca', 'AZTECA'],
];

const ALIAS_MAP = new Map(ALIAS_PAIRS.map(([k, v]) => [k, v]));

/** Longest-first so "espn 2" wins over "espn". */
const ALIAS_KEYS = [...ALIAS_MAP.keys()].sort((a, b) => b.length - a.length);

const TOKEN_RE = new RegExp(
  [
    '\\btsn\\s*[1-5]\\b',
    '\\bsn\\s*[1-5]\\b',
    '\\bsn\\s*360\\b',
    '\\bespn\\+?',
    '\\bespn[2u]\\b',
    '\\bfs[12]\\b',
    '\\bnfl\\s*rz\\b',
    '\\bnba\\s*tv\\b',
    '\\bnhl\\s*n(?:etwork)?\\b',
    '\\bmlb\\s*n(?:etwork)?\\b',
    '\\bnfl\\s*n(?:etwork)?\\b',
    '\\bprime(?:\\s*video)?\\b',
    '\\bapple\\s*tv\\+?',
    '\\bparamount\\+?',
    '\\bpeacock\\b',
    '\\bdazn\\b',
    '\\bbein\\b',
    '\\bsky\\s*sports(?:\\s+\\w+)?\\b',
    '\\bsportsnet(?:\\s+\\w+)?\\b',
  ].join('|'),
  'gi',
);

export function normalizeChannel(raw) {
  if (!raw) return '';
  const key = String(raw).trim().toLowerCase().replace(/[_./]+/g, ' ').replace(/\s+/g, ' ');
  if (ALIAS_MAP.has(key)) return ALIAS_MAP.get(key);
  const compact = key.replace(/\s+/g, '');
  if (ALIAS_MAP.has(compact)) return ALIAS_MAP.get(compact);
  const tsn = key.match(/^tsn\s*([1-5])$/);
  if (tsn) return `TSN${tsn[1]}`;
  const sn = key.match(/^(?:sn|sportsnet)\s*([1-5])$/);
  if (sn) return `SN ${sn[1]}`;
  return String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
}

export function extractChannels(text) {
  if (!text) return [];
  const source = String(text);
  const found = [];
  const seen = new Set();

  const lower = ` ${source.toLowerCase()} `;
  for (const alias of ALIAS_KEYS) {
    const padded = ` ${alias} `;
    if (!lower.includes(padded) && !lower.includes(` ${alias},`) && !lower.includes(` ${alias}/`)) {
      // also allow start/end and punctuation
      const re = new RegExp(`(?:^|[^a-z0-9+])${escapeRe(alias)}(?:[^a-z0-9+]|$)`, 'i');
      if (!re.test(source)) continue;
    }
    const label = ALIAS_MAP.get(alias);
    if (!seen.has(label)) {
      seen.add(label);
      found.push(label);
    }
  }

  // Pattern leftovers that the alias list might have missed (TSN4 glued, etc.)
  for (const match of source.matchAll(TOKEN_RE)) {
    const label = normalizeChannel(match[0]);
    if (label && !seen.has(label) && label.length >= 2 && label.length <= 12) {
      seen.add(label);
      found.push(label);
    }
  }

  return found;
}

const LEAGUE_WORDS = new Set(['nhl', 'nba', 'nfl', 'mlb', 'wnba', 'mls', 'epl', 'ufc', 'f1', 'ncaaf', 'ncaab', 'soccer', 'hockey', 'football', 'baseball', 'basketball']);

export function splitChannelsBlob(text) {
  if (!text) return [];
  const parts = String(text)
    .split(/\s*(?:,|\/|\||•|·|;|\band\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const part of parts) {
    const wholeKey = part.toLowerCase().replace(/[_./]+/g, ' ').replace(/\s+/g, ' ');
    const labels = ALIAS_MAP.has(wholeKey) || ALIAS_MAP.has(wholeKey.replace(/\s+/g, ''))
      ? [normalizeChannel(part)]
      : extractChannels(part);
    for (const label of labels) {
      if (!label || seen.has(label) || LEAGUE_WORDS.has(label.toLowerCase())) continue;
      if (label.length > 12 || /[.]/.test(label)) continue;
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

export function peelChannels(text) {
  const source = String(text || '').trim();
  if (!source) return { text: '', channels: [], index: -1 };
  const lower = source.toLowerCase();
  let index = -1;
  for (const alias of ALIAS_KEYS) {
    const re = new RegExp(`(?:^|[\\s,;/|—(])(${escapeRe(alias)})\\b`, 'i');
    const match = lower.match(re);
    if (!match) continue;
    const at = match.index + (match[0].length - match[1].length);
    if (index === -1 || at < index) index = at;
  }
  const comma = source.search(/\s*[,;/|]\s*/);
  if (comma > 0 && (index === -1 || comma < index)) {
    return {
      text: source.slice(0, comma).trim(),
      channels: splitChannelsBlob(source.slice(comma + 1)),
      index: comma,
    };
  }
  if (index > 0) {
    return {
      text: source.slice(0, index).trim(),
      channels: splitChannelsBlob(source.slice(index)),
      index,
    };
  }
  if (index === 0) {
    return { text: '', channels: splitChannelsBlob(source), index: 0 };
  }
  return { text: source, channels: [], index: -1 };
}

export function formatChannelList(channels, sep = ', ') {
  return (channels || []).filter(Boolean).join(sep);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
