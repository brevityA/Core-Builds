/**
 * One-based All Sport 5000 field offsets.
 *
 * The shared team-sport prefix (clock, names, scores, period) is the same on
 * the basketball, football, hockey/lacrosse, volleyball, and soccer maps
 * published in daktronics-allsport-5000-rs. Those maps were transcribed from
 * Daktronics documentation and are marked there as possibly imperfect — treat
 * a first night on a real console as a calibration, not a guarantee.
 *
 * Extras below the prefix are sport-specific and only read for that sport.
 */

export const SPORTS = ['basketball', 'football', 'hockey', 'lacrosse', 'volleyball', 'soccer'];

const SHARED = {
  clock: [1, 5],
  clockStopped: [28, 1],
  homeName: [48, 20],
  guestName: [68, 20],
  homeAbbr: [88, 10],
  guestAbbr: [98, 10],
  homeScore: [108, 4],
  guestScore: [112, 4],
  period: [142, 2],
  periodText: [144, 4],
};

const EXTRAS = {
  basketball: { shotClock: [201, 8] },
  football: { playClock: [201, 8], ballOn: [220, 2], down: [222, 3], toGo: [225, 2] },
  volleyball: { homeSets: [215, 2], guestSets: [217, 2] },
  hockey: {},
  lacrosse: {},
  soccer: {},
};

export function sportFields(sport) {
  return { ...SHARED, ...(EXTRAS[sport] || {}) };
}

export function readFields(decoder, sport) {
  const fields = sportFields(sport);
  const out = { sport };
  for (const [key, [start, length]] of Object.entries(fields)) {
    out[key] = decoder.field(start, length);
  }
  return out;
}

export function cleanText(value) {
  return String(value || '').replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function cleanScore(value) {
  const text = cleanText(value).replace(/[^\d-]/g, '');
  if (!text || text === '-') return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return String(n);
}

export function abbreviate(name, explicit) {
  const given = cleanText(explicit);
  if (given && !/^home$|^guest$|^visitor$/i.test(given)) return given.slice(0, 6).toUpperCase();
  const words = cleanText(name).split(' ').filter((w) => !/^(the|of|and|de|fc)$/i.test(w));
  if (!words.length) return 'TBD';
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  if (words[0].length >= 3) return words[0].slice(0, 4).toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
}

export function periodLabel(sport, period, periodText) {
  const text = cleanText(periodText);
  if (text && !/^\d+$/.test(text)) return text.replace(/\s+/g, '');
  const n = Number(cleanText(period));
  if (!n) return '';
  if (sport === 'football' || sport === 'basketball') return `Q${n}`;
  if (sport === 'hockey' || sport === 'lacrosse') return `P${n}`;
  if (sport === 'soccer') {
    if (n === 1) return '1H';
    if (n === 2) return '2H';
    return `ET${n - 2}`;
  }
  if (sport === 'volleyball') return `G${n}`;
  return `P${n}`;
}

export function detailFromFields(fields) {
  const sport = fields.sport || 'basketball';
  const clock = cleanText(fields.clock);
  const label = periodLabel(sport, fields.period, fields.periodText);
  const parts = [label, clock].filter(Boolean);
  if (sport === 'football') {
    const down = cleanText(fields.down);
    const toGo = cleanScore(fields.toGo);
    if (down) parts.push(toGo ? `${down} & ${toGo}` : down);
  }
  if (sport === 'basketball') {
    const shot = cleanText(fields.shotClock);
    const shotClock = shot.match(/(\d{1,2})(?::(\d{2}))?$/);
    if (shotClock) {
      const secs = shotClock[2] ? Number(shotClock[1]) * 60 + Number(shotClock[2]) : Number(shotClock[1]);
      if (secs > 0 && secs <= 35) parts.push(`shot ${secs}`);
    }
  }
  if (sport === 'volleyball') {
    const home = cleanScore(fields.homeSets);
    const guest = cleanScore(fields.guestSets);
    if (home != null && guest != null) parts.push(`sets ${guest}-${home}`);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function namesFromFields(fields, profile = {}) {
  const guestName = preferName(fields.guestName, profile.guest, 'Guest');
  const homeName = preferName(fields.homeName, profile.home, 'Home');
  return {
    guestName,
    homeName,
    guestAbbr: abbreviate(guestName, fields.guestAbbr || profile.guestAbbr),
    homeAbbr: abbreviate(homeName, fields.homeAbbr || profile.homeAbbr),
  };
}

function preferName(fromConsole, fromProfile, fallback) {
  const consoleName = cleanText(fromConsole);
  if (consoleName && !/^home$|^guest$|^visitor$/i.test(consoleName)) return consoleName;
  const profileName = cleanText(fromProfile);
  if (profileName) return profileName;
  return consoleName || fallback;
}

export function clockRunningFromFields(fields) {
  const flag = cleanText(fields.clockStopped).toLowerCase();
  if (flag === 's') return false;
  if (flag === 'z') return false;
  return Boolean(cleanText(fields.clock));
}
