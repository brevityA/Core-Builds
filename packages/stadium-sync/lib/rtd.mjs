/**
 * Daktronics All Sport 5000 RTD framing.
 *
 * Wire format, from the public decoder at
 * https://github.com/zabackary/daktronics-allsport-5000-rs (MIT):
 *   0x16  ...packet...  0x17
 * Packet:
 *   <ignored until 0x01> 0x01  "004210" + decimal offset  0x02  text  0x04  checksum
 * Checksum is the wrapping sum of every byte before 0x04, seeded with 0x04,
 * rendered as two uppercase hex digits. The offset is zero-based.
 *
 * Field numbers in sports.mjs are the console's one-based documentation
 * offsets. This is a reader only — it never writes to a scoreboard.
 */

const HEADER_PREFIX = Buffer.from('004210');

export function checksumHex(bytes, end = bytes.length) {
  let sum = 0x04;
  for (let i = 0; i < end; i += 1) {
    if (bytes[i] === 0x04) break;
    sum = (sum + bytes[i]) & 0xff;
  }
  return sum.toString(16).toUpperCase().padStart(2, '0');
}

export function parsePacket(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const soh = buf.indexOf(0x01);
  if (soh < 0) return { ok: false, reason: 'missing header' };
  const stx = buf.indexOf(0x02, soh + 1);
  const eot = buf.indexOf(0x04, soh + 1);
  const headerEnd = stx >= 0 ? stx : eot;
  if (headerEnd < 0) return { ok: false, reason: 'missing checksum' };
  const header = buf.subarray(soh + 1, headerEnd);
  if (!header.subarray(0, HEADER_PREFIX.length).equals(HEADER_PREFIX)) {
    return { ok: false, reason: 'unsupported packet', skip: true };
  }
  const indexText = header.subarray(HEADER_PREFIX.length).toString('ascii');
  if (!/^\d+$/.test(indexText)) return { ok: false, reason: 'bad offset' };
  const startIndex = Number(indexText);
  if (eot < 0) return { ok: false, reason: 'missing checksum' };
  const data = stx >= 0 && stx < eot ? buf.subarray(stx + 1, eot) : Buffer.alloc(0);
  const sum = buf.subarray(eot + 1, eot + 3).toString('ascii').toUpperCase();
  const expected = checksumHex(buf, eot);
  if (sum !== expected) return { ok: false, reason: 'checksum mismatch' };
  return { ok: true, startIndex, data };
}

export function buildPacket(startIndex, text) {
  const payload = Buffer.from(String(text), 'latin1');
  const head = Buffer.concat([
    Buffer.from('00000000'),
    Buffer.from([0x01]),
    Buffer.from(`004210${String(startIndex).padStart(4, '0')}`),
    Buffer.from([0x02]),
    payload,
    Buffer.from([0x04]),
  ]);
  return Buffer.concat([head, Buffer.from(checksumHex(head, head.length - 1))]);
}

export function framePacket(packet) {
  return Buffer.concat([Buffer.from([0x16]), packet, Buffer.from([0x17])]);
}

export function createRtdDecoder() {
  let idle = true;
  let pending = Buffer.alloc(0);
  const buffer = Buffer.alloc(1024, 0x20);
  let high = 0;
  const stats = { packets: 0, skipped: 0, errors: 0 };

  function apply(packet) {
    const end = packet.startIndex + packet.data.length;
    if (end > buffer.length) return;
    packet.data.copy(buffer, packet.startIndex);
    if (end > high) high = end;
    stats.packets += 1;
  }

  function push(chunk) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (idle && !bytes.includes(0x16) && bytes.includes(0x01) && bytes.includes(0x04)) {
      const bare = parsePacket(bytes);
      if (bare.ok) apply(bare);
      else if (!bare.skip) stats.errors += 1;
      else stats.skipped += 1;
      return stats.packets;
    }
    pending = pending.length ? Buffer.concat([pending, bytes]) : bytes;
    if (pending.length > 64_000) pending = pending.subarray(pending.length - 8_000);

    while (pending.length) {
      if (idle) {
        const sync = pending.indexOf(0x16);
        if (sync < 0) {
          pending = Buffer.alloc(0);
          break;
        }
        pending = pending.subarray(sync + 1);
        idle = false;
        continue;
      }
      const end = pending.indexOf(0x17);
      if (end < 0) break;
      const raw = pending.subarray(0, end);
      pending = pending.subarray(end + 1);
      idle = true;
      const packet = parsePacket(raw);
      if (packet.ok) apply(packet);
      else if (packet.skip) stats.skipped += 1;
      else stats.errors += 1;
    }
    return stats.packets;
  }

  return {
    push,
    stats: () => ({ ...stats, filled: high }),
    field(start, length) {
      const index = start - 1;
      if (index < 0 || length <= 0 || index >= buffer.length) return '';
      return buffer.subarray(index, Math.min(buffer.length, index + length)).toString('latin1');
    },
    snapshot() {
      return buffer.subarray(0, Math.max(high, 256));
    },
  };
}
