#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  generateTemplate,
  SEL_ARCHITECTURES,
  assembleTemplate,
} from '@core-builds/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')).version;
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

const VALID_SORT_KEYS = [
  'cached','streamExpressionMatched','streamExpressionScore','seadex',
  'resolution','quality','regexScore','visualTag','audioTag','audioChannel',
  'language','encode','library','seeders','bitrate','size','service','addon',
  'keyword','streamType','private','age','subtitle','regexPatterns','releaseGroup',
];

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
  formatters       List all available formatter IDs
  architectures    List SEL PSE architectures
  generate         Generate an AIOStreams template JSON
  validate <file>  Validate an AIOStreams template JSON
  diff <a> <b>     Compare two AIOStreams template JSONs
  info <file>      Show template metadata summary

Generate options:
  --service <id>       Service ID (required)
  --device <id>        Device profile (default: generic)
  --resolution <res>   4k, 1080p, mixed, ultrawide (default: 4k)
  --architecture <a>   standard, iqr, apex-mixed (default: standard)
  --audio <mode>       lossless, standard, limited, dolby (default: standard)
  --formatter <id>     Formatter ID (default: family-v4)
  --content <type>     all, anime, live, mixed (default: all)
  --match-mode <m>     relaxed, balanced, strict (default: balanced)
  --cache-mode <m>     mixed, cached, uncached (default: mixed)
  --size-limit <GB>    Max file size in GB (default: unlimited)
  --output <file>      Output file (default: stdout)
  --name <name>        Template name override
  --id <id>            Template metadata ID

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

switch (command) {
  case 'devices': cmdDevices(); break;
  case 'services': cmdServices(); break;
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
      device:       { type: 'string', default: 'generic' },
      resolution:   { type: 'string', default: '4k' },
      architecture: { type: 'string', default: 'standard' },
      audio:        { type: 'string', default: 'standard' },
      formatter:    { type: 'string', default: 'family-v4' },
      content:      { type: 'string', default: 'all' },
      'match-mode': { type: 'string', default: 'balanced' },
      'cache-mode': { type: 'string', default: 'mixed' },
      'size-limit': { type: 'string' },
      output:       { type: 'string' },
      name:         { type: 'string' },
      id:           { type: 'string' },
    },
    strict: false,
  });

  if (!opts.service) die('--service is required. Run "core-builds services" to see options.');
  if (!SERVICES.includes(opts.service)) die(`Unknown service "${opts.service}". Run "core-builds services" to see options.`);
  if (!DEVICES[opts.device]) die(`Unknown device "${opts.device}". Run "core-builds devices" to see options.`);
  if (!FORMATTERS.find(f => f.id === opts.formatter)) die(`Unknown formatter "${opts.formatter}". Run "core-builds formatters" to see options.`);
  const VALID_RESOLUTIONS = ['4k', '1080p', 'mixed', 'ultrawide'];
  const VALID_ARCHITECTURES = ['standard', 'iqr', 'apex-mixed'];
  const VALID_AUDIO = ['lossless', 'standard', 'limited', 'dolby'];
  const VALID_CONTENT = ['all', 'anime', 'live', 'mixed'];

  if (opts['size-limit'] != null) {
    const stripped = String(opts['size-limit']).replace(/GB$/i, '');
    const num = Number(stripped);
    if (!Number.isFinite(num) || num <= 0) die(`Invalid --size-limit "${opts['size-limit']}". Must be a positive number (in GB).`);
  }
  const VALID_MATCH_MODES = ['relaxed', 'balanced', 'strict'];
  const VALID_CACHE_MODES = ['mixed', 'cached', 'uncached'];
  if (!VALID_RESOLUTIONS.includes(opts.resolution)) die(`Unknown resolution "${opts.resolution}". Valid: ${VALID_RESOLUTIONS.join(', ')}`);
  if (!VALID_ARCHITECTURES.includes(opts.architecture)) die(`Unknown architecture "${opts.architecture}". Valid: ${VALID_ARCHITECTURES.join(', ')}`);
  if (!VALID_AUDIO.includes(opts.audio)) die(`Unknown audio mode "${opts.audio}". Valid: ${VALID_AUDIO.join(', ')}`);
  if (!VALID_CONTENT.includes(opts.content)) die(`Unknown content type "${opts.content}". Valid: ${VALID_CONTENT.join(', ')}`);
  if (!VALID_MATCH_MODES.includes(opts['match-mode'])) die(`Unknown match-mode "${opts['match-mode']}". Valid: ${VALID_MATCH_MODES.join(', ')}`);
  if (!VALID_CACHE_MODES.includes(opts['cache-mode'])) die(`Unknown cache-mode "${opts['cache-mode']}". Valid: ${VALID_CACHE_MODES.join(', ')}`);


  const { common, uhd } = await loadRankedRegex();

  const rawInput = {
    service: opts.service,
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
    optionalScrapers: [],
  };
  if (opts.name) rawInput.name = opts.name;

  const metadata = {};
  if (opts.id) metadata.id = opts.id;
  if (opts.name) metadata.name = opts.name;

  const template = generateTemplate(rawInput, {
    metadata,
    deviceAv1Safe: DEVICE_AV1_SAFE,
    deviceDvSafe: DEVICE_DV_SAFE,
    deviceForceLimitedAudio: DEVICE_FORCE_LIMITED_AUDIO,
    formatters: FORMATTERS,
    rankedRegexCommon: common,
    rankedRegexUhd: uhd,
  });

  const json = JSON.stringify(template, null, 2);

  if (opts.output) {
    try { writeFileSync(opts.output, json); }
    catch (err) { die(`Cannot write to ${opts.output}: ${err.message}`); }
    process.stderr.write(`Template written to ${opts.output}\n`);
    process.stderr.write(`  Service: ${opts.service}\n`);
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

function cmdDiff() {
  const fileA = args[1];
  const fileB = args[2];
  if (!fileA || !fileB) die('Usage: core-builds diff <fileA> <fileB>');

  let a, b;
  try {
    a = JSON.parse(readFileSync(fileA, 'utf-8'));
    b = JSON.parse(readFileSync(fileB, 'utf-8'));
  } catch (e) { die(`Cannot read or parse files: ${e.message}`); }

  const cfgA = a.config || {};
  const cfgB = b.config || {};
  const diffs = [];

  if (cfgA.formatter?.id !== cfgB.formatter?.id)
    diffs.push(`Formatter: ${cfgA.formatter?.id} -> ${cfgB.formatter?.id}`);

  const presetSig = p => `${p.type}:${p.enabled !== false ? 'on' : 'off'}:${p.options?.timeout || ''}`;
  const presetsA = (cfgA.presets || []).map(presetSig).sort().join(', ');
  const presetsB = (cfgB.presets || []).map(presetSig).sort().join(', ');
  if (presetsA !== presetsB) diffs.push(`Presets changed`);

  const countField = (cfg, key) => (cfg[key] || []).length;
  for (const key of ['excludedStreamExpressions', 'includedStreamExpressions', 'preferredStreamExpressions']) {
    const cA = countField(cfgA, key), cB = countField(cfgB, key);
    if (cA !== cB) diffs.push(`${key}: ${cA} -> ${cB}`);
  }

  for (const key of ['excludedRegexPatterns', 'rankedRegexPatterns', 'preferredRegexPatterns']) {
    const cA = countField(cfgA, key), cB = countField(cfgB, key);
    if (cA !== cB) diffs.push(`${key}: ${cA} -> ${cB}`);
  }

  if (JSON.stringify(cfgA.sortCriteria || {}) !== JSON.stringify(cfgB.sortCriteria || {}))
    diffs.push('Sort criteria changed');

  if (JSON.stringify(cfgA.titleMatching) !== JSON.stringify(cfgB.titleMatching))
    diffs.push('Title matching changed');

  if (JSON.stringify(cfgA.deduplicator) !== JSON.stringify(cfgB.deduplicator))
    diffs.push('Deduplicator changed');

  if (JSON.stringify(cfgA.size) !== JSON.stringify(cfgB.size))
    diffs.push('Size limits changed');

  if (JSON.stringify(cfgA.bitrate) !== JSON.stringify(cfgB.bitrate))
    diffs.push('Bitrate limits changed');

  console.log(`\n${'='.repeat(60)}`);
  console.log('  CORE BUILDS TEMPLATE DIFF');
  console.log(`  A: ${fileA}`);
  console.log(`  B: ${fileB}`);
  console.log(`${'='.repeat(60)}\n`);

  if (diffs.length === 0) {
    console.log('  No significant differences found.\n');
  } else {
    diffs.forEach(d => console.log(`  * ${d}`));
    console.log(`\n  ${diffs.length} difference(s) found.\n`);
  }
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
