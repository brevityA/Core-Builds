import net from 'node:net';
import {
  buildStreamCommand,
  createFrameParser,
  parseAuthFrame,
  parseBotFrame,
  parseSportzcastJson,
} from './sportzcast.mjs';

const MIN_BACKOFF_MS = 10_000;

/**
 * Local ScoreConnect: connect and send JB.
 * Cloud: GT, then FB, then JB on the node it names. Never retries faster
 * than 10s. Credentials stay in the operator's config — nothing is built in.
 */
export function startSportzcastClient(options, onJson, onStatus = () => {}) {
  let stopped = false;
  let socket = null;
  let timer = null;
  let backoff = MIN_BACKOFF_MS;
  let phase = 'idle';

  function cleanupSocket() {
    if (!socket) return;
    socket.removeAllListeners();
    socket.destroy();
    socket = null;
  }

  function arm(ms) {
    clearTimeout(timer);
    if (stopped) return;
    timer = setTimeout(connect, ms);
  }

  function fail(reason) {
    onStatus({ ok: false, phase, reason });
    cleanupSocket();
    backoff = Math.min(60_000, Math.max(MIN_BACKOFF_MS, backoff * 2));
    arm(backoff);
  }

  function connect() {
    if (stopped) return;
    cleanupSocket();
    const cloud = Boolean(options.cloud && options.email && options.userToken);
    const host = cloud ? (options.entryHost || 'scorebot.sportzcast.net') : options.host;
    const port = Number(options.port || 1402);
    if (!host) {
      fail('Sportzcast host missing');
      return;
    }
    phase = cloud ? 'auth' : 'stream';
    const parser = createFrameParser();
    let authToken = options.token || '';
    socket = net.connect({ host, port });
    socket.setTimeout(20_000);
    socket.on('connect', () => {
      backoff = MIN_BACKOFF_MS;
      if (phase === 'auth') {
        const email = String(options.email).replace(/[\r\n\s]/g, '');
        const token = String(options.userToken).replace(/[\r\n\s]/g, '');
        socket.write(`GT ${email} ${token}`);
      } else {
        socket.write(buildStreamCommand({ ...options, token: authToken }));
      }
      onStatus({ ok: true, phase, host });
    });
    socket.on('data', (chunk) => {
      for (const payload of parser.push(chunk)) {
        if (phase === 'auth') {
          const auth = parseAuthFrame(payload);
          if (!auth.ok) {
            fail('Sportzcast login rejected');
            return;
          }
          authToken = auth.token;
          phase = 'bot';
          const bot5 = String(Math.max(0, Number(options.bot) || 0)).padStart(5, '0').slice(-5);
          socket.write(`FB${bot5}`);
          continue;
        }
        if (phase === 'bot') {
          const bot = parseBotFrame(payload);
          if (!bot.ok) {
            fail(bot.reason || 'bot unavailable');
            return;
          }
          phase = 'stream';
          cleanupSocket();
          openStream(bot.host, port, authToken);
          return;
        }
        const json = parseSportzcastJson(payload);
        if (json) onJson(json);
      }
    });
    socket.on('timeout', () => fail('Sportzcast timed out'));
    socket.on('error', (err) => fail(err?.message || 'Sportzcast socket error'));
    socket.on('close', () => {
      if (stopped || phase === 'bot' || phase === 'auth') return;
      arm(backoff);
    });
  }

  function openStream(host, port, token) {
    if (stopped) return;
    phase = 'stream';
    const parser = createFrameParser();
    socket = net.connect({ host, port });
    socket.setTimeout(20_000);
    socket.on('connect', () => {
      socket.write(buildStreamCommand({ ...options, token }));
      onStatus({ ok: true, phase: 'stream', host });
    });
    socket.on('data', (chunk) => {
      for (const payload of parser.push(chunk)) {
        const json = parseSportzcastJson(payload);
        if (json) onJson(json);
      }
    });
    socket.on('timeout', () => fail('Sportzcast stream timed out'));
    socket.on('error', (err) => fail(err?.message || 'Sportzcast stream error'));
    socket.on('close', () => {
      if (!stopped) arm(backoff);
    });
  }

  connect();
  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
      cleanupSocket();
    },
  };
}
