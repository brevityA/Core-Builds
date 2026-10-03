// Stub for every external Stremio addon AIOStreams fetches while validating a save.
// Any path ending in manifest.json returns a permissive manifest; anything else an
// empty stream list. Lets the save test check *our* config, not third-party uptime.
import http from 'node:http';

const PORT = Number(process.env.STUB_PORT || 4100);
const manifest = (name) => ({
  id: `stub.${name || 'addon'}`,
  name: `Stub ${name || 'addon'}`,
  version: '1.0.0',
  description: 'Save-test stub',
  resources: ['stream', 'catalog', 'meta', 'subtitles'],
  types: ['movie', 'series', 'anime', 'tv', 'channel'],
  catalogs: [],
  idPrefixes: ['tt', 'kitsu', 'mal', 'tmdb', 'tvdb'],
  behaviorHints: { configurable: true },
});

http.createServer((req, res) => {
  const name = (req.url || '').split('/')[1] || 'addon';
  const body = req.url?.split('?')[0].endsWith('manifest.json') ? manifest(name) : { streams: [], subtitles: [], metas: [] };
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}).listen(PORT, '127.0.0.1', () => console.log(`stub addons on :${PORT}`));
