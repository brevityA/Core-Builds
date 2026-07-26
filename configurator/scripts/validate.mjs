import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { CHANGELOG } from '../src/data/changelog.js';
import { HOST_BASE_URLS, HOST_META, MIN_AIOSTREAMS_VERSION } from '../src/data/hosts.js';
import { DEVICE_AUDIO_DEFAULTS, DEVICE_AV1_SAFE, DEVICE_DV_SAFE } from '../src/data/devices.js';
import { PROVIDER_CREDENTIALS } from '../src/data/credentials.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(root, '..');
const required = [
  'src/index.html', 'src/styles/01-core.css', 'src/styles/02-brand-theme.css', 'src/styles/03-enhancements.css', 'src/styles/04-landing.css', 'src/styles/05-unified-ui.css', 'src/styles/06-features.css', 'src/styles/07-menu-parity.css', 'src/js/app.js',
  'src/data/devices.js', 'src/data/hosts.js', 'src/data/services.js',
  'src/data/scrapers.js', 'src/data/formatters.js', 'src/data/icons.js',
  'src/data/changelog.js', 'src/data/credentials.js', 'src/config/schema-guard.js'
];
await Promise.all(required.map(file => access(resolve(root, file))));

const app = await readFile(resolve(root, 'src/js/app.js'), 'utf8');
const shell = await readFile(resolve(root, 'src/index.html'), 'utf8');
const buildScript = await readFile(resolve(root, 'scripts/build.mjs'), 'utf8');
const cssFiles = ['01-core.css','02-brand-theme.css','03-enhancements.css','04-landing.css','05-unified-ui.css','06-features.css','07-menu-parity.css'];
const cssParts = await Promise.all(cssFiles.map(file => readFile(resolve(root, 'src/styles', file), 'utf8')));
const css = cssParts.join('\n');
const hostKeys = Object.keys(HOST_BASE_URLS);

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const versions = JSON.parse(await readFile(resolve(repoRoot, 'versions.json'), 'utf8'));
const appVer = app.match(/CONFIGURATOR_VERSION\s*=\s*'([^']+)'/)?.[1];

const checks = {
  'single current release': CHANGELOG[0]?.v === '2.85' && !CHANGELOG.some(x => x.v === '2.76'),
  'version consistency': appVer === CHANGELOG[0]?.v && pkg.version.startsWith(appVer + '.') && versions.configurator === pkg.version,
  'host metadata coverage': hostKeys.every(k => HOST_META[k]),
  'minimum host version': MIN_AIOSTREAMS_VERSION === '2.31.1',
  'device defaults': ['generic','appletv-new','shield','chromecast','onn'].every(k => k in DEVICE_AUDIO_DEFAULTS),
  'device grid layout': app.includes('class="device-grid"') && app.includes('class="device-card"') && app.includes('class="device-help-banner"') && !app.includes('id="devScroll"'),
  'Apple TV AV1 conservative': !DEVICE_AV1_SAFE.has('appletv-new'),
  'ONN DV conservative': !DEVICE_DV_SAFE.has('onn'),
  'schema guard wired': app.includes("import { sanitizeAioEnumArrays }"),
  'credential registry': Object.keys(PROVIDER_CREDENTIALS).length >= 18 && app.includes("import { PROVIDER_CREDENTIALS }"),
  'quick install key links': app.includes('fastlane-get-key') && app.includes('PROVIDER_CREDENTIALS[key]'),
  'quick install optional TMDB': app.includes('data-fl-tmdb') && app.includes("tmdbField('tmdbToken')") && app.includes("tmdbField('tmdbApiKey'"),
  'TMDB-free config compatibility': app.includes('bitrate: { useMetadataRuntime:hasTmdb') && app.includes('digitalReleaseFilter: { enabled:hasTmdb') && app.includes('titleMatching: { enabled:hasTmdb') && app.includes('yearMatching: { enabled:hasTmdb') && !app.includes("warns.push('No TMDB key"),
  'Quick Install manifest lifecycle': app.includes("{ key:'manifest',label:'Manifest URL', getUrl: u => u, action:'copy' }") && app.includes("document.getElementById('fastLaneModal')?.remove()") && !app.includes("if (state.target==='manifest') installTarget='app'"),
  'Fine-Tune pop-out lifecycle': app.includes("import { FORMATTERS, AUDIO_HELP }") && app.includes("openAdvancedDrawer(el)") && app.includes("overlay.id = 'advancedDrawer'") && app.includes('closeAdvancedDrawer()') && !app.includes("main.innerHTML = renderAdvancedPanel();\n    nav.style.display = 'none'"),
  'Advanced extras carousel': app.includes('const carouselOptSection =') && app.includes('const optSection = S.simpleMode ? compactOptSection : carouselOptSection') && app.includes('toggle-carousel-service') && app.includes('toggle-optional-scraper'),
  'advanced playback controls': app.includes("preloadEnabled:true") && app.includes("autoPlayMethod:'matchingFile'") && app.includes('preset.options.timeout = globalTimeout'),
  'partial exports': app.includes('const PARTIAL_EXPORT_FIELDS') && app.includes("credentials:{}") && app.includes("exportPartial(el.dataset.kind)"),
  'Core Tools links': app.includes('Back Up Addons') && app.includes('All Core Tools') && app.includes('Back up your current addons first'),
  'cache-busted web assets': buildScript.includes("createHash('sha256')") && buildScript.includes('app.js?v=${assetVersions.js}') && buildScript.includes('app.css?v=${assetVersions.css}'),
  'module shell': shell.includes('type="module" src="./js/app.js"'),
  'external source CSS': cssFiles.every(file => shell.includes(`./styles/${file}`)) && !shell.includes('<style>'),
  'balanced CSS': cssParts.every(part => (part.match(/{/g)||[]).length === (part.match(/}/g)||[]).length),
  'tutorial runtime': app.includes('function tutPositionTarget') && app.includes('Step 7 of 7'),
  'multi-provider quick install': app.includes('state.services') && app.includes('showAdditionalServicesPicker(options={})'),
};

for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
