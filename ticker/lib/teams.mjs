const TEAMS = {
  'maple leafs': 'TOR', toronto: 'TOR', 'blue jays': 'TOR',
  canadiens: 'MTL', montreal: 'MTL', montréal: 'MTL',
  oilers: 'EDM', edmonton: 'EDM',
  flames: 'CGY', calgary: 'CGY',
  canucks: 'VAN', vancouver: 'VAN',
  senators: 'OTT', ottawa: 'OTT',
  jets: 'WPG', winnipeg: 'WPG',
  lakers: 'LAL', 'los angeles lakers': 'LAL',
  celtics: 'BOS', boston: 'BOS', 'red sox': 'BOS', bruins: 'BOS',
  knicks: 'NYK', 'new york knicks': 'NYK',
  yankees: 'NYY', 'new york yankees': 'NYY',
  mets: 'NYM',
  chiefs: 'KC', 'kansas city': 'KC',
  bills: 'BUF', buffalo: 'BUF',
  cowboys: 'DAL', dallas: 'DAL',
  packers: 'GB',
  eagles: 'PHI',
  warriors: 'GSW',
  'inter miami': 'MIA', miami: 'MIA',
  lafc: 'LAFC',
  arsenal: 'ARS',
  chelsea: 'CHE',
  liverpool: 'LIV',
  'man city': 'MCI', 'manchester city': 'MCI',
  'man united': 'MUN', 'manchester united': 'MUN',
  'real madrid': 'RMA',
  barcelona: 'BAR',
  'liberty': 'NY', 'new york liberty': 'NY',
  aces: 'LV', 'las vegas aces': 'LV',
};

export function abbreviate(name) {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (trimmed.length <= 4 && !trimmed.includes(' ')) return trimmed.toUpperCase();
  const key = trimmed.toLowerCase();
  if (TEAMS[key]) return TEAMS[key];
  for (const [needle, abbr] of Object.entries(TEAMS)) {
    if (key.includes(needle)) return abbr;
  }
  const words = trimmed.split(/\s+/).filter((w) => !/^(the|of|at)$/i.test(w));
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
}
