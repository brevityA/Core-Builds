/**
 * Sportzcast / Genius ScoreLink frame reader.
 *
 * Documented at https://docs.sportzcast.net/public/data-integration/tcp-sockets-legacy/
 * Responses are STX (0x02) ... ETX (0x03). New work should prefer MQTT; this
 * reader accepts the JSON those payloads already are, plus the legacy TCP
 * stream a local ScoreConnect serves on port 1402.
 *
 * Cloud lookup (GT / FB) is optional and only runs when the operator supplies
 * credentials. FB errors back off at least 10 seconds, per Sportzcast's warning.
 */

export function buildStreamCommand({ bot = 1, delayMs = 0, channel = 0, token = '', format = 'JB' } = {}) {
  const kind = format === 'XB' || format === 'ST' ? format : 'JB';
  const bot5 = String(Math.max(0, Number(bot) || 0)).padStart(5, '0').slice(-5);
  const delay5 = String(Math.max(0, Number(delayMs) || 0)).padStart(5, '0').slice(-5);
  const chan = String(Number(channel) || 0).slice(-1);
  return `${kind}${bot5}${delay5}${chan}~${token || ''}`;
}

export function createFrameParser(onPayload) {
  let pending = Buffer.alloc(0);
  return {
    push(chunk) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      pending = pending.length ? Buffer.concat([pending, bytes]) : bytes;
      if (pending.length > 1_000_000) pending = pending.subarray(pending.length - 64_000);
      const out = [];
      while (pending.length) {
        const start = pending.indexOf(0x02);
        if (start < 0) {
          pending = Buffer.alloc(0);
          break;
        }
        const end = pending.indexOf(0x03, start + 1);
        if (end < 0) {
          pending = pending.subarray(start);
          break;
        }
        const payload = pending.subarray(start + 1, end).toString('utf8').trim();
        pending = pending.subarray(end + 1);
        out.push(payload);
        if (onPayload) onPayload(payload);
      }
      return out;
    },
  };
}

export function parseSportzcastJson(payload) {
  if (!payload) return null;
  const text = String(payload).trim();
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** 1-based pipe positions from the Sportzcast GT docs. */
export function parseAuthFrame(payload) {
  const fields = String(payload || '').split('|');
  const valid = fields[0] === '1';
  const token = fields[2] || '';
  return { ok: valid && Boolean(token), token, fields };
}

export function parseBotFrame(payload) {
  const text = String(payload || '').trim();
  if (!text || text === 'ERR' || text.startsWith('ERR')) return { ok: false, reason: 'bot unavailable' };
  const host = text.split('|')[0].trim();
  if (!host || /\s/.test(host)) return { ok: false, reason: 'bad bot node' };
  return { ok: true, host };
}
