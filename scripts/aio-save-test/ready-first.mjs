// Behaviour check for "Ready to play first" (cacheMode 'ready', v3.48), run against the
// same pinned AIOStreams as the save test. A stub addon serves four titles whose
// streams AIOStreams reads as TorBox cached ("[TB+]") or uncached ("[TB download]"):
//   tt9000001 cached + uncached   tt9000002 uncached only
//   tt9000003 cached only         tt9000004 uncached only, 1080p and 2160p
// The Stable profile config Quick install builds is saved three ways and each title is
// requested. 'ready' must match cached-only whenever anything is cached and must never
// come back empty; the native excludeUncached flag ('cached') comes back empty on an
// uncached-only title, which is why Quick install no longer uses it.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { applyOutputProfile } from '../../configurator/src/core/output-profile-policy.js';

const BASE = process.env.AIO_URL || 'http://127.0.0.1:3999';
const PORT = Number(process.env.READY_STUB_PORT || 4102);
const stream = (cached, res, n) => ({
  name: `[TB${cached ? '+' : ' download'}] Stub\n${res}`,
  description: `Test.Movie.2023.${res}.WEB-DL.x265-GRP${n}.mkv\n💾 ${4 + n} GB`,
  url: `http://127.0.0.1:${PORT}/play/${cached ? 'c' : 'u'}${res}${n}.mkv`,
  behaviorHints: { filename: `Test.Movie.2023.${res}.WEB-DL.x265-GRP${n}.mkv`, videoSize: (4 + n) * 1e9 },
});
const TITLES = {
  tt9000001: [stream(1, '2160p', 1), stream(1, '2160p', 2), stream(0, '2160p', 3), stream(0, '2160p', 4), stream(1, '1080p', 5), stream(0, '1080p', 6)],
  tt9000002: [stream(0, '2160p', 1), stream(0, '1080p', 2), stream(0, '1080p', 3)],
  tt9000003: [stream(1, '2160p', 1), stream(1, '1080p', 2)],
  tt9000004: [stream(0, '1080p', 1), stream(0, '2160p', 2)],
};
const server = http.createServer((req, res) => {
  const path = (req.url || '').split('?')[0];
  const body = path.endsWith('manifest.json')
    ? { id: 'stub.readyfirst', name: 'ReadyFirstStub', version: '1.0.0', description: 'test', resources: ['stream'], types: ['movie'], catalogs: [], idPrefixes: ['tt'] }
    : { streams: TITLES[(path.match(/stream\/\w+\/(tt\d+)/) || [])[1]] || [] };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});
await new Promise(r => server.listen(PORT, '0.0.0.0', r));

const golden = JSON.parse(readFileSync(new URL('../../configurator/e2e/golden/core-stable-torbox-4k.json', import.meta.url), 'utf8'));
function build(cacheMode) {
  const context = { service: 'torbox-pro', multiServices: ['torbox-pro'], resolution: '4k', quickStart: true, cacheMode, langs: ['English'] };
  const { config } = applyOutputProfile({ config: structuredClone(golden.config || golden) }, 'stable', context);
  config.excludeUncached = cacheMode === 'cached';
  config.presets = [{ type: 'custom', instanceId: 'rdy', enabled: true, options: { name: 'ReadyFirstStub', manifestUrl: `http://127.0.0.1:${PORT}/manifest.json`, timeout: 5000, resources: ['stream'] } }];
  config.groups = { enabled: false, groupings: [] };
  for (const s of config.services || []) { s.enabled = s.id === 'torbox'; if (s.enabled) s.credentials = { apiKey: 'dummy' }; }
  return config;
}
async function results(config) {
  const r = await fetch(`${BASE}/api/v1/user`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config, password: 'ready-first-check-1' }) });
  const body = await r.json();
  if (!body.success) throw new Error(`save refused: ${JSON.stringify(body.error || body).slice(0, 300)}`);
  const out = {};
  for (const id of Object.keys(TITLES)) {
    const s = await (await fetch(`${BASE}/stremio/${body.data.uuid}/${body.data.encryptedPassword}/stream/movie/${id}.json`)).json();
    // Full URLs, so the Cached only comparison catches a different stream with the
    // same cache status; kind() reads cached/uncached from them for the other checks.
    out[id] = (s.streams || []).filter(x => x.url).map(x => x.url);
  }
  return out;
}

const kind = urls => urls.map(u => (u.match(/\/play\/([cu])/) || [])[1] || '?');
const failures = [];
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures.push(msg); };
try {
  const ready = await results(build('ready'));
  const hard = await results(build('cached'));
  const summary = r => JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, kind(v)])));
  console.log('ready ', summary(ready));
  console.log('cached', summary(hard));
  check(build('ready').excludedStreamExpressions.some(e => /Ready to play first/.test(e.expression)), 'ready: the Stable profile keeps the Ready to play first rule');
  check(ready.tt9000001.length > 0 && kind(ready.tt9000001).every(c => c === 'c'), 'ready: cached + uncached title shows only cached streams');
  check(JSON.stringify(ready.tt9000001) === JSON.stringify(hard.tt9000001), 'ready: same streams as Cached only when anything is cached');
  check(ready.tt9000002.length === 3 && kind(ready.tt9000002).every(c => c === 'u'), 'ready: uncached-only title still lists its 3 streams');
  check(ready.tt9000003.length === 2, 'ready: cached-only title lists its 2 streams');
  check(ready.tt9000004.length === 2, 'ready: uncached-only title at two resolutions lists both');
  check(hard.tt9000002.length === 0, 'cached: native excludeUncached leaves an uncached-only title empty (the reason for ready)');
} finally {
  server.close();
}
if (failures.length) { console.error(`${failures.length} ready-first check(s) failed`); process.exit(1); }
