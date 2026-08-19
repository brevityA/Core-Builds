const KEY = 'coreline.v1';

export const DEFAULTS = {
  leagues: ['mlb', 'nfl', 'nba', 'nhl', 'epl', 'mls', 'wnba'],
  feeds: [],
  sampleFeed: true,
  speed: 52,
  favorites: '',
  showFinals: true,
  wakeLock: true,
  theme: 'core',
  clockFmt: '12',
  mode: 'board',
  leagueFilter: 'ALL',
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function cacheSlate(payload) {
  try {
    localStorage.setItem(`${KEY}.slate`, JSON.stringify({ at: Date.now(), payload }));
  } catch { /* quota */ }
}

export function readCachedSlate() {
  try {
    const raw = localStorage.getItem(`${KEY}.slate`);
    return raw ? JSON.parse(raw).payload : null;
  } catch {
    return null;
  }
}
