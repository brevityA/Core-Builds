/**
 * Game-clock parse / project.
 * Consoles send the truth. HTTP pollers (Core Line's fastest refresh is 15s)
 * would otherwise show a clock that jumps. Projection fills the gap and snaps
 * back the moment a new packet arrives. A stale console is not projected.
 */

export function parseClock(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const tenths = text.match(/^(\d{1,3}):([0-5]\d)\.(\d)$/);
  if (tenths) {
    return {
      seconds: Number(tenths[1]) * 60 + Number(tenths[2]),
      tenths: Number(tenths[3]),
      style: 'mm:ss.t',
    };
  }
  const colon = text.match(/^(\d{1,3}):([0-5]\d)$/);
  if (colon) {
    return {
      seconds: Number(colon[1]) * 60 + Number(colon[2]),
      tenths: 0,
      style: 'mm:ss',
    };
  }
  const short = text.match(/^(\d{1,2})\.(\d)$/);
  if (short) {
    return {
      seconds: Number(short[1]),
      tenths: Number(short[2]),
      style: 'ss.t',
    };
  }
  return null;
}

export function formatClock(totalSeconds, style = 'mm:ss') {
  const safe = Math.max(0, totalSeconds);
  const whole = Math.floor(safe);
  const tenths = Math.min(9, Math.round((safe - whole) * 10));
  if (style === 'ss.t') return `${whole}.${tenths}`;
  const mm = Math.floor(whole / 60);
  const ss = whole % 60;
  const base = `${mm}:${String(ss).padStart(2, '0')}`;
  if (style === 'mm:ss.t') return `${base}.${tenths}`;
  return base;
}

/**
 * @param {string} clock
 * @param {{ running?: boolean, direction?: 'up'|'down', receivedAt?: number, now?: number, stale?: boolean }} opts
 */
export function projectClock(clock, opts = {}) {
  if (!clock || opts.stale || !opts.running) return String(clock || '').trim();
  const parsed = parseClock(clock);
  if (!parsed) return String(clock).trim();
  const elapsed = Math.max(0, ((opts.now ?? Date.now()) - (opts.receivedAt ?? opts.now ?? Date.now())) / 1000);
  if (elapsed < 0.05) return formatClock(parsed.seconds + parsed.tenths / 10, parsed.style);
  const signed = opts.direction === 'up' ? elapsed : -elapsed;
  const next = parsed.seconds + parsed.tenths / 10 + signed;
  return formatClock(Math.max(0, next), parsed.style);
}

export function clockDirection(sport) {
  return sport === 'soccer' || sport === 'futsal' ? 'up' : 'down';
}

/** Whole seconds, 0–35. A shot clock does not count up and does not invent a reset. */
export function parseShot(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{1,2}$/.test(text)) return null;
  const seconds = Number(text);
  if (seconds < 0 || seconds > 35) return null;
  return seconds;
}

/**
 * Same rule as the game clock: subtract time since the packet, and stop
 * when the console is held, stale, or not running. A new packet snaps
 * because its receivedAt is now.
 * @param {string|number} shot
 * @param {{ running?: boolean, receivedAt?: number, now?: number, stale?: boolean }} opts
 */
export function projectShot(shot, opts = {}) {
  const parsed = parseShot(shot);
  if (parsed == null) return String(shot ?? '').trim();
  if (opts.stale || !opts.running) return String(parsed);
  const elapsed = Math.max(0, ((opts.now ?? Date.now()) - (opts.receivedAt ?? opts.now ?? Date.now())) / 1000);
  if (elapsed < 0.05) return String(parsed);
  return String(Math.max(0, Math.floor(parsed - elapsed)));
}
