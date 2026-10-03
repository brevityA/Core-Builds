// Generate a broad matrix of configs from the built configurator and save
// each to the throwaway AIOStreams. Prints failures grouped by error message.
const ROOT = new URL('../../configurator/', import.meta.url).pathname;
const { chromium } = await import(ROOT + 'node_modules/playwright/index.mjs');
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { withDummyCredentials, save } from './save-test.mjs';

const DIST = process.env.DIST || ROOT + 'dist/web';
const spec = readFileSync(ROOT + 'e2e/golden-configs.spec.mjs', 'utf8');
const BASE = eval('(' + spec.slice(spec.indexOf('const BASE = ') + 13, spec.indexOf('};', spec.indexOf('const BASE = ')) + 1) + ')');
const required = JSON.parse(readFileSync(new URL('./required.json', import.meta.url), 'utf8'));
const DUMMY_CREDS = { torbox: 'k', realdebrid: 'k', alldebrid: 'k', premiumize: 'k', debridlink: 'k', offcloud: 'k', offcloudEmail: 'e@x.invalid', offcloudPass: 'p',
  easynews: 'u', easynewsPass: 'p', nzbgeek: 'k', debridio: 'k', easydebrid: 'k', pikpak: 'e@x.invalid', pikpakPass: 'p', seedr: 't', debrider: 'k',
  streamnzb: 'https://dummy.invalid/manifest.json', subdl: 'k', nzbnoob: 'k', althub: 'k', usenetcrawler: 'k', drunkenslug: 'k', nzbfinder: 'k',
  jackett: 'k', jackettUrl: 'https://dummy.invalid', prowlarr: 'k', prowlarrUrl: 'https://dummy.invalid', nzbhydra: 'https://dummy.invalid', nzbhydraApiKey: 'k' };

const SERVICES = ['torbox-pro', 'torbox-ess', 'realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'easydebrid', 'debrider', 'offcloud', 'pikpak', 'seedr', 'debridio', 'easynews', 'usenet', 'p2p', 'http'];
const CONTENTS = ['all', 'anime', 'live', 'mixed'];
const RESOLUTIONS = ['1080p', '4k'];
const ARCHS = ['standard', 'iqr', 'apex-mixed'];
const free = s => s === 'p2p' || s === 'http';
// MATRIX_HOST=elfhosted: every case targets that host and free lanes it refuses are skipped
// (the restricted run, which mirrors that host's regex allowlist).
const ONLY_HOST = process.env.MATRIX_HOST || '';
const hostFor = s => ONLY_HOST || (free(s) ? 'fortheweak' : 'elfhosted');

const cases = [];
for (const service of SERVICES) for (const content of CONTENTS) for (const resolution of RESOLUTIONS) for (const pseArch of ARCHS) {
  if (ONLY_HOST && free(service)) continue;
  cases.push({ name: `${service}/${content}/${resolution}/${pseArch}`, state: { service, multiServices: [service], content, resolution, pseArch,
    p2pEnabled: service === 'p2p', instanceHost: hostFor(service), creds: DUMMY_CREDS } });
}
// Each optional scraper toggle, alone, on a debrid and a free lane (Advanced keeps extras).
const { OPTIONAL_SCRAPER_DEFS } = await import(ROOT + 'src/data/scrapers.js');
for (const d of OPTIONAL_SCRAPER_DEFS) for (const service of ['torbox-pro', 'p2p', 'easynews']) {
  if (ONLY_HOST && free(service)) continue;
  cases.push({ name: `toggle:${d.id}/${service}`, state: { service, multiServices: [service], content: 'all', resolution: '1080p', pseArch: 'iqr',
    p2pEnabled: service === 'p2p', instanceHost: ONLY_HOST || 'fortheweak', optionalScrapers: [d.id], creds: DUMMY_CREDS } });
}

const srv = spawn('python3', ['-m', 'http.server', '4199', '-d', DIST], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4199/?cb-e2e=1');
await page.waitForFunction(() => !!window.__coreBuilds);

const failures = new Map(); let pass = 0; const t0 = Date.now();
for (const c of cases) {
  let tpl;
  try { tpl = await page.evaluate(s => window.__coreBuilds.generate(s), { ...BASE, ...c.state }); }
  catch (e) { (failures.get('GENERATE: ' + e.message.slice(0, 120)) || failures.set('GENERATE: ' + e.message.slice(0, 120), []).get('GENERATE: ' + e.message.slice(0, 120))).push(c.name); continue; }
  const r = await save(withDummyCredentials(tpl.config, required));
  if (r.ok) { pass++; continue; }
  const key = r.error.replace(/\b[0-9a-f-]{36}\b/g, '<uuid>').slice(0, 220);
  (failures.get(key) || failures.set(key, []).get(key)).push(c.name);
}
// Negative control for the restricted run: a pattern no allowlist carries must be
// refused, or a green run would only mean the gate was never on.
if (ONLY_HOST) {
  const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), { ...BASE, service: 'torbox-pro', multiServices: ['torbox-pro'], instanceHost: ONLY_HOST, creds: DUMMY_CREDS });
  const config = withDummyCredentials(tpl.config, required);
  config.excludedRegexPatterns = [...(config.excludedRegexPatterns || []), '/core-builds-save-test-control-[0-9]{6}/'];
  const r = await save(config);
  if (r.ok || !/regex/i.test(r.error)) {
    process.exitCode = 1;
    console.log(`FAIL control: an unlisted regex ${r.ok ? 'saved' : `was refused for another reason (${r.error.slice(0, 160)})`}; the allowlist is not being enforced`);
  } else console.log('control: unlisted regex refused, allowlist enforced');
}
await browser.close(); srv.kill();
console.log(`\n${pass}/${cases.length} saved in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
for (const [err, names] of [...failures].sort((a, b) => b[1].length - a[1].length)) {
  process.exitCode = 1;
  console.log(`FAIL x${names.length}: ${err}`);
  console.log(`   e.g. ${names.slice(0, 6).join(', ')}${names.length > 6 ? ' …' : ''}`);
}
