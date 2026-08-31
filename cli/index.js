#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  generateTemplate,
  SEL_ARCHITECTURES,
  assembleTemplate,
  isNuvioInstantHost,
  gateTemplateForHost,
  resolveHostCapabilities,
  knownHostKeys,
} from '@core-builds/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')).version;
const TEMPLATE_VERSION = PKG_VERSION.split('.').slice(0, 2).join('.');
const dataDir = resolve(__dirname, 'data');

const { FORMATTERS } = await import(pathToFileURL(resolve(dataDir, 'formatters.js')).href);
const { DEVICE_AV1_SAFE, DEVICE_DV_SAFE, DEVICE_FORCE_LIMITED_AUDIO } = await import(pathToFileURL(resolve(dataDir, 'devices.js')).href);

let _rankedCommon, _rankedUhd;
async function loadRankedRegex() {
  if (_rankedCommon) return { common: _rankedCommon, uhd: _rankedUhd };
  try {
    const bundledPath = resolve(dataDir, 'ranked-regex.json');
    const raw = JSON.parse(readFileSync(bundledPath, 'utf-8'));
    _rankedCommon = raw.common || [];
    _rankedUhd = raw.uhd || [];
  } catch {
    try {
      const appPath = resolve(__dirname, '..', 'configurator', 'src', 'js', 'app.js');
      const src = readFileSync(appPath, 'utf-8');
      const commonMatch = src.match(/^const RANKED_REGEX_COMMON\s*=\s*(\[[\s\S]*?\]);\s*$/m);
      const uhdMatch = src.match(/^const RANKED_REGEX_UHD\s*=\s*(\[[\s\S]*?\]);\s*$/m);
      _rankedCommon = commonMatch ? JSON.parse(commonMatch[1]) : [];
      _rankedUhd = uhdMatch ? JSON.parse(uhdMatch[1]) : [];
    } catch (err) {
      process.stderr.write(`Warning: failed to load ranked regex: ${err.message}\n`);
      _rankedCommon = [];
      _rankedUhd = [];
    }
  }
  if (!_rankedCommon.length && !_rankedUhd.length) process.stderr.write('Warning: ranked regex data empty — regexScore sorting will be a no-op\n');
  return { common: _rankedCommon, uhd: _rankedUhd };
}

const DEVICES = {
  'generic':         { name: 'Standard / Not Sure', audio: 'standard', av1: false, dv: false },
  'samsung':         { name: 'Samsung TV',           audio: 'standard', av1: false, dv: false, hdr10plus: true },
  'appletv-old':     { name: 'Apple TV 4K Gen 1-2', audio: 'standard', av1: false, dv: true },
  'appletv-new':     { name: 'Apple TV 4K Gen 3',   audio: 'standard', av1: false, dv: true, hdr10plus: true },
  'lgtv':            { name: 'LG TV webOS',          audio: 'standard', av1: null,  dv: true },
  'windows':         { name: 'Windows PC',           audio: 'lossless', av1: true,  dv: true },
  'firestick-hd':    { name: 'Fire Stick HD',        audio: 'limited',  av1: false, dv: false },
  'firestick-4kmax': { name: 'Fire Stick 4K Max',    audio: 'standard', av1: true,  dv: true },
  'shield':          { name: 'Nvidia Shield',        audio: 'lossless', av1: false, dv: true },
  'googletv':        { name: 'Google TV Streamer',   audio: 'limited',  av1: true,  dv: true },
  'roku':            { name: 'Roku',                  audio: 'limited',  av1: null,  dv: null },
  'chromecast':      { name: 'Chromecast w/ Google TV', audio: 'limited', av1: false, dv: true },
  'sony':            { name: 'Sony Bravia',           audio: 'standard', av1: null,  dv: true },
  'ipad':            { name: 'iPad / iPhone',         audio: 'limited',  av1: null,  dv: true },
  'projector':       { name: 'Projector',             audio: 'limited',  av1: null,  dv: false },
  'onn':             { name: 'ONN Box',               audio: 'limited',  av1: true,  dv: null },
  'xiaomi':          { name: 'Xiaomi Mi Box S (2nd)', audio: 'standard', av1: true,  dv: true },
  'xiaomi-3rd':      { name: 'Xiaomi Mi Box S (3rd)', audio: 'standard', av1: true,  dv: true },
};

const SERVICES = [
  'torbox-pro', 'torbox-ess', 'realdebrid', 'alldebrid', 'premiumize',
  'debridlink', 'easynews', 'offcloud', 'easydebrid', 'pikpak', 'seedr',
  'debridio', 'debrider', 'p2p', 'http', 'nzbgeek', 'streamnzb',
];

const HOSTS = {
  fortheweak:  { id:'fortheweak',  name:"Yeb's / ForTheWeak",       supportsP2P:true,  supportsHttp:true,  supportsDebrid:true,  supportsNuvioInstant:true  },
  midnight:    { id:'midnight',    name:"Midnight's",                supportsP2P:true,  supportsHttp:true,  supportsDebrid:true,  supportsNuvioInstant:true  },
  kuu:         { id:'kuu',         name:"Kuu's",                     supportsP2P:true,  supportsHttp:true,  supportsDebrid:true,  supportsNuvioInstant:true  },
  atbp:        { id:'atbp',        name:'ATBP',                      supportsP2P:true,  supportsHttp:true,  supportsDebrid:true,  supportsNuvioInstant:true  },
  wizaardd:    { id:'wizaardd',    name:'Wizaardd',                   supportsP2P:true,  supportsHttp:true,  supportsDebrid:true,  supportsNuvioInstant:true  },
  viren:       { id:'viren',       name:"Viren's Nightly",           supportsP2P:true,  supportsHttp:true,  supportsDebrid:true,  supportsNuvioInstant:true  },
  omni:        { id:'omni',        name:"Omni's (legacy)",           supportsP2P:true,  supportsHttp:true,  supportsDebrid:true,  supportsNuvioInstant:true  },
  elfhosted:   { id:'elfhosted',   name:'ElfHosted',                  supportsP2P:false, supportsHttp:false, supportsDebrid:true,  supportsNuvioInstant:false },
  selfhosted:  { id:'selfhosted',  name:'Self-hosted',                supportsP2P:true,  supportsHttp:true,  supportsDebrid:true,  supportsNuvioInstant:true  },
};

const VALID_ROUTES = ['nuvio-torbox-instant'];

const VALID_SORT_KEYS = [
  'cached','streamExpressionMatched','streamExpressionScore','seadex',
  'resolution','quality','regexScore','visualTag','audioTag','audioChannel',
  'language','encode','library','seeders','bitrate','size','service','addon',
  'keyword','streamType','private','age','subtitle','regexPatterns','releaseGroup',
];

/**
 * Pick the host to gate against: the configurator's default unless it blocks the
 * stream type this build is built around. Mirrors the instanceHost values in
 * configurator/e2e/golden-configs.spec.mjs, which are asserted against these
 * exact fixtures by tests/package-equivalence.test.mjs.
 */
function defaultHostFor(service) {
  const needed = service === 'p2p' ? 'p2p' : service === 'http' ? 'http' : null;
  if (!needed) return 'elfhosted';
  for (const key of ['elfhosted', ...knownHostKeys()]) {
    if (key === 'custom') continue;
    const caps = resolveHostCapabilities(key, null);
    if (!caps.blockedStreamTypes.includes(needed) && !caps.requiresProbe && !caps.unverified) return key;
  }
  return 'elfhosted';
}

function die(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

function printHelp() {
  console.log(`
Core Builds CLI v${PKG_VERSION}

Usage:
  core-builds <command> [options]

Commands:
  devices          List all supported device profiles
  services         List all supported service IDs
  hosts            List all supported AIOStreams hosts
  formatters       List all available formatter IDs
  architectures    List SEL PSE architectures
  generate         Generate an AIOStreams template JSON
  validate <file>  Validate an AIOStreams template JSON
  diff <a> <b>     Compare two AIOStreams template JSONs
  info <file>      Show template metadata summary

Generate options:
  --service <id>       Service ID (required unless --route is set)
  --route <route>      Route: nuvio-torbox-instant (overrides --service)
  --host <id>          AIOStreams host (required for some routes)
  --device <id>        Device profile (default: generic)
  --resolution <res>   4k, 1080p, mixed, ultrawide (default: 4k)
  --architecture <a>   standard, iqr, apex-mixed (default: standard)
  --audio <mode>       lossless, standard, limited, dolby (default: standard)
  --formatter <id>     Formatter ID (default: family-v4)
  --content <type>     all, anime, live, mixed (default: all)
  --match-mode <m>     relaxed, balanced, strict (default: balanced)
  --cache-mode <m>     mixed, cached, uncached (default: mixed)
  --size-limit <GB>    Max file size in GB (default: unlimited)
  --optional-scrapers  Comma-separated scraper IDs (eztv,knaben,torrent-galaxy)
  --output <file>      Output file (default: stdout)
  --name <name>        Template name override
  --id <id>            Template metadata ID
  --json               Output errors as JSON instead of text

Validate options:
  --strict             Treat warnings as errors
`);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === '--version' || command === '-V') {
  console.log(PKG_VERSION);
  process.exit(0);
}

switch (command) {
  case 'devices': cmdDevices(); break;
  case 'services': cmdServices(); break;
  case 'hosts': cmdHosts(); break;
  case 'formatters': cmdFormatters(); break;
  case 'architectures': cmdArchitectures(); break;
  case 'generate': await cmdGenerate(); break;
  case 'validate': cmdValidate(); break;
  case 'diff': cmdDiff(); break;
  case 'info': cmdInfo(); break;
  default: die(`Unknown command: ${command}. Run with --help to see usage.`);
}

function cmdDevices() {
  console.log('\nSupported device profiles:\n');
  for (const [id, d] of Object.entries(DEVICES)) {
    const caps = [
      d.dv ? 'DV' : '',
      d.av1 === true ? 'AV1' : d.av1 === false ? 'no-AV1' : 'AV1?',
      d.audio,
    ].filter(Boolean).join(', ');
    console.log(`  ${id.padEnd(18)} ${d.name.padEnd(26)} [${caps}]`);
  }
  console.log(`\n  Total: ${Object.keys(DEVICES).length} devices\n`);
}

function cmdServices() {
  console.log('\nSupported services:\n');
  SERVICES.forEach(s => console.log(`  ${s}`));
  console.log(`\n  Total: ${SERVICES.length} services\n`);
}

function cmdHosts() {
  console.log('\nSupported AIOStreams hosts:\n');
  for (const [id, h] of Object.entries(HOSTS)) {
    const caps = [
      h.supportsP2P ? 'P2P' : 'no-P2P',
      h.supportsNuvioInstant ? 'Nuvio' : '',
      h.supportsDebrid ? 'Debrid' : '',
    ].filter(Boolean).join(', ');
    console.log(`  ${id.padEnd(14)} ${h.name.padEnd(24)} [${caps}]`);
  }
  console.log(`\n  Total: ${Object.keys(HOSTS).length} hosts\n`);
}

function cmdFormatters() {
  console.log('\nAvailable formatters:\n');
  for (const f of FORMATTERS) {
    console.log(`  ${f.id.padEnd(20)} ${f.label.padEnd(20)} [${f.badge}]`);
  }
  console.log(`\n  Total: ${FORMATTERS.length} formatters\n`);
}

function cmdArchitectures() {
  console.log('\nSEL PSE architectures:\n');
  for (const arch of SEL_ARCHITECTURES) {
    console.log(`  ${arch}`);
  }
  console.log('');
}

async function cmdGenerate() {
  const { values: opts } = parseArgs({
    args: args.slice(1),
    options: {
      service:      { type: 'string' },
      route:        { type: 'string' },
      host:         { type: 'string' },
      device:       { type: 'string', default: 'generic' },
      resolution:   { type: 'string', default: '4k' },
      architecture: { type: 'string', default: 'standard' },
      audio:        { type: 'string', default: 'standard' },
      formatter:    { type: 'string', default: 'family-v4' },
      content:      { type: 'string', default: 'all' },
      'match-mode': { type: 'string', default: 'balanced' },
      'cache-mode': { type: 'string', default: 'mixed' },
      'size-limit': { type: 'string' },
      'optional-scrapers': { type: 'string' },
      output:       { type: 'string' },
      name:         { type: 'string' },
      id:           { type: 'string' },
      json:         { type: 'boolean', default: false },
    },
    strict: false,
  });

  const jsonErrors = opts.json;
  const dieJson = (msg) => {
    if (jsonErrors) { process.stdout.write(JSON.stringify({ error: msg }) + '\n'); process.exit(1); }
    die(msg);
  };

  const isNuvioRoute = opts.route === 'nuvio-torbox-instant';

  if (opts.route && !VALID_ROUTES.includes(opts.route)) dieJson(`Unknown route "${opts.route}". Valid: ${VALID_ROUTES.join(', ')}`);
  if (!isNuvioRoute && !opts.service) dieJson('--service is required (unless --route is set). Run "core-builds services" to see options.');
  if (!isNuvioRoute && opts.service && !SERVICES.includes(opts.service)) dieJson(`Unknown service "${opts.service}". Run "core-builds services" to see options.`);
  if (!DEVICES[opts.device]) dieJson(`Unknown device "${opts.device}". Run "core-builds devices" to see options.`);
  if (!FORMATTERS.find(f => f.id === opts.formatter)) dieJson(`Unknown formatter "${opts.formatter}". Run "core-builds formatters" to see options.`);

  if (isNuvioRoute) {
    if (!opts.host) dieJson('--host is required for the nuvio-torbox-instant route. Run "core-builds hosts" to see options.');
    if (!HOSTS[opts.host]) dieJson(`Unknown host "${opts.host}". Run "core-builds hosts" to see options.`);
    const hostMeta = HOSTS[opts.host];
    if (!isNuvioInstantHost(hostMeta)) dieJson(`Host "${opts.host}" does not support Nuvio TorBox Instant (requires P2P + Nuvio Instant). Run "core-builds hosts" to see compatible hosts.`);
  }

  if (opts.host && !isNuvioRoute && !HOSTS[opts.host]) dieJson(`Unknown host "${opts.host}". Run "core-builds hosts" to see options.`);

  const VALID_RESOLUTIONS = ['4k', '1080p', 'mixed', 'ultrawide'];
  const VALID_ARCHITECTURES = ['standard', 'iqr', 'apex-mixed'];
  const VALID_AUDIO = ['lossless', 'standard', 'limited', 'dolby'];
  const VALID_CONTENT = ['all', 'anime', 'live', 'mixed'];

  if (opts['size-limit'] != null) {
    const stripped = String(opts['size-limit']).replace(/GB$/i, '');
    const num = Number(stripped);
    if (!Number.isFinite(num) || num <= 0) dieJson(`Invalid --size-limit "${opts['size-limit']}". Must be a positive number (in GB).`);
  }
  const VALID_MATCH_MODES = ['relaxed', 'balanced', 'strict'];
  const VALID_CACHE_MODES = ['mixed', 'cached', 'uncached'];
  if (!VALID_RESOLUTIONS.includes(opts.resolution)) dieJson(`Unknown resolution "${opts.resolution}". Valid: ${VALID_RESOLUTIONS.join(', ')}`);
  if (!VALID_ARCHITECTURES.includes(opts.architecture)) dieJson(`Unknown architecture "${opts.architecture}". Valid: ${VALID_ARCHITECTURES.join(', ')}`);
  if (!VALID_AUDIO.includes(opts.audio)) dieJson(`Unknown audio mode "${opts.audio}". Valid: ${VALID_AUDIO.join(', ')}`);
  if (!VALID_CONTENT.includes(opts.content)) dieJson(`Unknown content type "${opts.content}". Valid: ${VALID_CONTENT.join(', ')}`);
  if (!VALID_MATCH_MODES.includes(opts['match-mode'])) dieJson(`Unknown match-mode "${opts['match-mode']}". Valid: ${VALID_MATCH_MODES.join(', ')}`);
  if (!VALID_CACHE_MODES.includes(opts['cache-mode'])) dieJson(`Unknown cache-mode "${opts['cache-mode']}". Valid: ${VALID_CACHE_MODES.join(', ')}`);

  const optionalScrapers = opts['optional-scrapers'] ? opts['optional-scrapers'].split(',').map(s => s.trim()).filter(Boolean) : [];

  const { common, uhd } = await loadRankedRegex();

  const rawInput = {
    ...(isNuvioRoute ? { route: 'nuvio-torbox-instant' } : { service: opts.service }),
    ...(opts.host && HOSTS[opts.host] ? { host: HOSTS[opts.host] } : {}),
    device: opts.device,
    resolution: opts.resolution,
    architecture: opts.architecture,
    audio: opts.audio,
    content: opts.content,
    matchMode: opts['match-mode'],
    cacheMode: opts['cache-mode'],
    formatter: opts.formatter,
    sizeLimit: opts['size-limit'] || 'unlimited',
    credentials: {},
    langs: ['English'],
    multiServices: [],
    optionalScrapers,
  };
  if (opts.name) rawInput.name = opts.name;

  const metadata = { coreBuildsVersion: TEMPLATE_VERSION };
  if (opts.id) metadata.id = opts.id;
  if (opts.name) metadata.name = opts.name;

  const template = generateTemplate(rawInput, {
    metadata,
    host: opts.host && HOSTS[opts.host] ? HOSTS[opts.host] : undefined,
    deviceAv1Safe: DEVICE_AV1_SAFE,
    deviceDvSafe: DEVICE_DV_SAFE,
    deviceForceLimitedAudio: DEVICE_FORCE_LIMITED_AUDIO,
    formatters: FORMATTERS,
    rankedRegexCommon: common,
    rankedRegexUhd: uhd,
  });

  // Match the configurator: it gates the assembled template against the target
  // host as the last step of buildFinal(), so a template the CLI emits must go
  // through the same filter or it will carry keys, presets and regex the host
  // rejects — on ElfHosted an unlisted regex pattern fails the entire save.
  //
  // The configurator takes the host from user state; the CLI has no such state,
  // so it defaults to the same host the wizard does (ElfHosted) and steps off it
  // when that host cannot serve the requested source. ElfHosted disables P2P and
  // HTTP, so gating a --service p2p build against it would strip the very addons
  // the build is for. Resolved from the capability registry rather than
  // hardcoded, so a registry change moves this with it.
  // --host already names a host in the same key namespace as the capability
  // registry, so an explicit pick governs the gate too; otherwise infer one.
  const hostKey = knownHostKeys().includes(opts.host) ? opts.host : defaultHostFor(opts.service);
  const gated = gateTemplateForHost(template, resolveHostCapabilities(hostKey, null));
  for (const removal of gated.removals) {
    process.stderr.write(`  removed for ${hostKey}: ${removal.kind}: ${removal.target}\n`);
  }

  const json = JSON.stringify(gated.template, null, 2);

  if (opts.output) {
    try { writeFileSync(opts.output, json); }
    catch (err) { dieJson(`Cannot write to ${opts.output}: ${err.message}`); }
    process.stderr.write(`Template written to ${opts.output}\n`);
    if (isNuvioRoute) process.stderr.write(`  Route: nuvio-torbox-instant\n`);
    else process.stderr.write(`  Service: ${opts.service}\n`);
    if (opts.host) process.stderr.write(`  Host: ${opts.host} (${HOSTS[opts.host]?.name || opts.host})\n`);
    process.stderr.write(`  Device: ${opts.device} (${DEVICES[opts.device].name})\n`);
    process.stderr.write(`  Resolution: ${opts.resolution}\n`);
    process.stderr.write(`  Architecture: ${opts.architecture}\n`);
    process.stderr.write(`  Formatter: ${opts.formatter}\n`);
    process.stderr.write(`  ESEs: ${template.config?.excludedStreamExpressions?.length || 0}\n`);
    process.stderr.write(`  PSEs: ${template.config?.preferredStreamExpressions?.length || 0}\n`);
    process.stderr.write(`  ISEs: ${template.config?.includedStreamExpressions?.length || 0}\n`);
  } else {
    process.stdout.write(json + '\n');
  }
}

function cmdValidate() {
  const file = args[1];
  if (!file) die('Usage: core-builds validate <file> [--strict]');

  const strict = args.includes('--strict');
  let raw;
  try { raw = readFileSync(file, 'utf-8'); }
  catch { die(`Cannot read file: ${file}`); }

  let d;
  try { d = JSON.parse(raw); }
  catch (e) { die(`Invalid JSON: ${e.message}`); }

  const errors = [], warnings = [], passes = [];
  const cfg = d.config || {};
  const meta = d.metadata || {};

  if (!meta.version) warnings.push('metadata.version missing');
  if (!meta.name) warnings.push('metadata.name missing');
  if (!meta.description) warnings.push('metadata.description missing');
  if (meta.version && meta.name) passes.push('metadata: core fields present');

  const fmt = cfg.formatter || {};
  if (fmt.id === 'tamtaro') {
    const o = fmt.definitions?.overrides;
    if (o?.tamtaro) passes.push("formatter: tamtaro override correctly keyed");
    else errors.push("formatter: id='tamtaro' but overrides key is not 'tamtaro'");
  } else if (fmt.id) {
    passes.push(`formatter: using built-in '${fmt.id}'`);
  }

  for (const scope of Object.keys(cfg.sortCriteria || {})) {
    const keys = cfg.sortCriteria[scope];
    if (!Array.isArray(keys)) continue;
    const malformed = keys.filter(k => !k || typeof k !== 'object' || typeof k.key !== 'string');
    if (malformed.length) { errors.push(`sortCriteria.${scope}: ${malformed.length} malformed entries (expected {key,direction})`); continue; }
    const invalid = keys.filter(k => !VALID_SORT_KEYS.includes(k.key));
    if (invalid.length) errors.push(`sortCriteria.${scope}: invalid key(s): ${invalid.map(k => k.key).join(', ')}`);
    const badDir = keys.filter(k => k.direction && k.direction !== 'asc' && k.direction !== 'desc');
    if (badDir.length) errors.push(`sortCriteria.${scope}: invalid direction(s): ${badDir.map(k => `${k.key}=${k.direction}`).join(', ')} (expected "asc" or "desc")`);
    if (!invalid.length && !badDir.length) passes.push(`sortCriteria.${scope}: ${keys.length} keys valid`);
  }

  const presets = cfg.presets || [];
  const enabled = presets.filter(p => p.enabled !== false);
  passes.push(`presets: ${presets.length} total, ${enabled.length} enabled`);

  const ises = cfg.includedStreamExpressions || [];
  const eses = cfg.excludedStreamExpressions || [];
  const pses = cfg.preferredStreamExpressions || [];
  passes.push(`expressions: ${ises.length} ISEs, ${eses.length} ESEs, ${pses.length} PSEs`);

  if (cfg.excludedRegexPatterns?.length) passes.push(`excludedRegexPatterns: ${cfg.excludedRegexPatterns.length} entries`);
  else warnings.push('excludedRegexPatterns: empty or missing');

  if (cfg.rankedRegexPatterns?.length) passes.push(`rankedRegexPatterns: ${cfg.rankedRegexPatterns.length} entries`);
  else warnings.push('rankedRegexPatterns: empty (regexScore sort key is a no-op)');

  if (cfg.preferredRegexPatterns?.length) passes.push(`preferredRegexPatterns: ${cfg.preferredRegexPatterns.length} entries`);
  else warnings.push('preferredRegexPatterns: empty or missing');

  if (cfg.titleMatching?.mode === 'exact') warnings.push("titleMatching.mode is 'exact'");

  const sorts = cfg.sortCriteria || {};
  if (sorts.global?.length) passes.push(`sortCriteria: ${Object.keys(sorts).length} section(s)`);
  else warnings.push('sortCriteria.global missing');

  if (cfg.deduplicator) passes.push(`deduplicator: cached=${cfg.deduplicator.cached || 'default'}`);

  console.log(`\n${'='.repeat(60)}`);
  console.log('  CORE BUILDS TEMPLATE VALIDATOR');
  console.log(`  Checking: ${file}`);
  console.log(`${'='.repeat(60)}\n`);

  if (errors.length) {
    console.log('ERRORS:');
    errors.forEach(e => console.log(`  x ${e}`));
    console.log('');
  }
  if (warnings.length) {
    console.log('WARNINGS:');
    warnings.forEach(w => console.log(`  ! ${w}`));
    console.log('');
  }
  if (passes.length) {
    console.log('PASSED:');
    passes.forEach(p => console.log(`  + ${p}`));
    console.log('');
  }

  console.log(`${'='.repeat(60)}`);
  console.log(`  ${errors.length} errors | ${warnings.length} warnings | ${passes.length} checks passed`);
  console.log(`${'='.repeat(60)}\n`);

  if (errors.length || (strict && warnings.length)) process.exit(1);
}

function redactCredentials(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactCredentials);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/apiKey|password|secret|auth.*key|token/i.test(k) && typeof v === 'string') {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redactCredentials(v);
    }
  }
  return out;
}

function cmdDiff() {
  const jsonMode = args.includes('--json');
  const positional = args.slice(1).filter(a => a !== '--json');
  const fileA = positional[0];
  const fileB = positional[1];
  if (!fileA || !fileB) die('Usage: core-builds diff <fileA> <fileB> [--json]');

  let a, b;
  try {
    a = redactCredentials(JSON.parse(readFileSync(fileA, 'utf-8')));
    b = redactCredentials(JSON.parse(readFileSync(fileB, 'utf-8')));
  } catch (e) { die(`Cannot read or parse files: ${e.message}`); }

  const cfgA = a.config || {};
  const cfgB = b.config || {};
  const diffs = [];

  if (cfgA.formatter?.id !== cfgB.formatter?.id)
    diffs.push({ field: 'formatter', from: cfgA.formatter?.id, to: cfgB.formatter?.id });

  const presetSig = p => `${p.type}:${p.enabled !== false ? 'on' : 'off'}:${p.options?.timeout || ''}`;
  const presetsA = (cfgA.presets || []).map(presetSig).sort().join(', ');
  const presetsB = (cfgB.presets || []).map(presetSig).sort().join(', ');
  if (presetsA !== presetsB) diffs.push({ field: 'presets', changed: true });

  const countField = (cfg, key) => (cfg[key] || []).length;
  for (const key of ['excludedStreamExpressions', 'includedStreamExpressions', 'preferredStreamExpressions']) {
    const cA = countField(cfgA, key), cB = countField(cfgB, key);
    if (cA !== cB) diffs.push({ field: key, from: cA, to: cB });
  }

  for (const key of ['excludedRegexPatterns', 'rankedRegexPatterns', 'preferredRegexPatterns']) {
    const cA = countField(cfgA, key), cB = countField(cfgB, key);
    if (cA !== cB) diffs.push({ field: key, from: cA, to: cB });
  }

  if (JSON.stringify(cfgA.sortCriteria || {}) !== JSON.stringify(cfgB.sortCriteria || {}))
    diffs.push({ field: 'sortCriteria', changed: true });

  if (JSON.stringify(cfgA.titleMatching) !== JSON.stringify(cfgB.titleMatching))
    diffs.push({ field: 'titleMatching', changed: true });

  if (JSON.stringify(cfgA.deduplicator) !== JSON.stringify(cfgB.deduplicator))
    diffs.push({ field: 'deduplicator', changed: true });

  if (JSON.stringify(cfgA.size) !== JSON.stringify(cfgB.size))
    diffs.push({ field: 'size', changed: true });

  if (JSON.stringify(cfgA.bitrate) !== JSON.stringify(cfgB.bitrate))
    diffs.push({ field: 'bitrate', changed: true });

  if (jsonMode) {
    console.log(JSON.stringify({ fileA, fileB, differences: diffs }, null, 2));
    process.exitCode = diffs.length > 0 ? 1 : 0;
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('  CORE BUILDS TEMPLATE DIFF');
  console.log(`  A: ${fileA}`);
  console.log(`  B: ${fileB}`);
  console.log(`${'='.repeat(60)}\n`);

  if (diffs.length === 0) {
    console.log('  No significant differences found.\n');
  } else {
    diffs.forEach(d => {
      if (d.from !== undefined && d.to !== undefined) console.log(`  * ${d.field}: ${d.from} -> ${d.to}`);
      else console.log(`  * ${d.field} changed`);
    });
    console.log(`\n  ${diffs.length} difference(s) found.\n`);
  }
  process.exitCode = diffs.length > 0 ? 1 : 0;
}

function cmdInfo() {
  const file = args[1];
  if (!file) die('Usage: core-builds info <file>');

  let d;
  try { d = JSON.parse(readFileSync(file, 'utf-8')); }
  catch (e) { die(`Cannot read or parse: ${e.message}`); }

  const meta = d.metadata || {};
  const cfg = d.config || {};

  console.log(`\n${'='.repeat(60)}`);
  console.log('  TEMPLATE INFO');
  console.log(`${'='.repeat(60)}\n`);
  console.log(`  Name:        ${meta.name || 'unnamed'}`);
  console.log(`  Description: ${meta.description || 'none'}`);
  console.log(`  Version:     ${meta.version || 'unknown'}`);
  console.log(`  ID:          ${meta.id || 'none'}`);
  console.log(`  Formatter:   ${cfg.formatter?.id || 'default'}`);
  console.log(`  Presets:     ${(cfg.presets || []).length} total, ${(cfg.presets || []).filter(p => p.enabled !== false).length} enabled`);
  console.log(`  ESEs:        ${(cfg.excludedStreamExpressions || []).length}`);
  console.log(`  ISEs:        ${(cfg.includedStreamExpressions || []).length}`);
  console.log(`  PSEs:        ${(cfg.preferredStreamExpressions || []).length}`);
  console.log(`  Ranked RX:   ${(cfg.rankedRegexPatterns || []).length}`);
  console.log(`  Excluded RX: ${(cfg.excludedRegexPatterns || []).length}`);
  console.log(`  Preferred RX: ${(cfg.preferredRegexPatterns || []).length}`);
  console.log(`  Sort sections: ${Object.keys(cfg.sortCriteria || {}).join(', ') || 'none'}`);
  console.log(`  Dedup:       cached=${cfg.deduplicator?.cached || 'default'}, uncached=${cfg.deduplicator?.uncached || 'default'}`);
  try { console.log(`  File size:   ${statSync(file).size} bytes`); } catch {}
  console.log('');
}
