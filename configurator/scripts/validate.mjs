import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { CHANGELOG } from '../src/data/changelog.js';
import { HOST_BASE_URLS, HOST_META, MIN_AIOSTREAMS_VERSION } from '../src/data/hosts.js';
import { DEVICE_AUDIO_DEFAULTS, DEVICE_AV1_SAFE, DEVICE_DV_SAFE } from '../src/data/devices.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'src/index.html', 'src/styles/01-core.css', 'src/styles/02-brand-theme.css', 'src/styles/03-enhancements.css', 'src/styles/04-landing.css', 'src/styles/05-unified-ui.css', 'src/styles/06-features.css', 'src/styles/07-menu-parity.css', 'src/js/app.js',
  'src/data/devices.js', 'src/data/hosts.js', 'src/data/services.js',
  'src/data/scrapers.js', 'src/data/formatters.js', 'src/data/icons.js',
  'src/data/changelog.js', 'src/config/schema-guard.js'
];
await Promise.all(required.map(file => access(resolve(root, file))));

const app = await readFile(resolve(root, 'src/js/app.js'), 'utf8');
const shell = await readFile(resolve(root, 'src/index.html'), 'utf8');
const cssFiles = ['01-core.css','02-brand-theme.css','03-enhancements.css','04-landing.css','05-unified-ui.css','06-features.css','07-menu-parity.css'];
const cssParts = await Promise.all(cssFiles.map(file => readFile(resolve(root, 'src/styles', file), 'utf8')));
const css = cssParts.join('\n');
const hostKeys = Object.keys(HOST_BASE_URLS);

const checks = {
  'single current release': CHANGELOG[0]?.v === '2.78' && !CHANGELOG.some(x => x.v === '2.76'),
  'host metadata coverage': hostKeys.every(k => HOST_META[k]),
  'minimum host version': MIN_AIOSTREAMS_VERSION === '2.31.1',
  'device defaults': ['generic','appletv-new','shield','chromecast','onn'].every(k => k in DEVICE_AUDIO_DEFAULTS),
  'Apple TV AV1 conservative': !DEVICE_AV1_SAFE.has('appletv-new'),
  'ONN DV conservative': !DEVICE_DV_SAFE.has('onn'),
  'schema guard wired': app.includes("import { sanitizeAioEnumArrays }"),
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
