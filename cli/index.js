#!/usr/bin/env node
/**
 * Core Builds CLI — Generate, validate, and diff AIOStreams templates.
 *
 * Usage:
 *   core-builds generate --service torbox-pro --device shield --resolution 4k --output template.json
 *   core-builds validate template.json
 *   core-builds diff old.json new.json
 *   core-builds devices
 *   core-builds services
 *   core-builds formatters
 */

const { program } = require('commander');
const fs = require('fs');
const path = require('path');

// ── Device Definitions ─────────────────────────────────────────────

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
  'debridio', 'p2p', 'http', 'nzbgeek', 'streamnzb',
];

const FORMATTERS = [
  'family-v3', 'ultra', 'apex-v2', 'sigma', 'minimal', 'prime', 'tv',
  'apex', 'elite', 'uniform', 'syntax', 'syntax-v3', 'omni-diamond',
  'zenith-diamond', 'auburn-tiger', 'midnight-slate', 'rb3-clean', 'rb3',
];

const VALID_SORT_KEYS = [
  'resolution', 'quality', 'cached', 'size', 'seeders', 'bitrate', 'encode',
  'audioChannels', 'audioTags', 'visualTags', 'releaseGroup', 'age',
  'regexScore', 'seScore', 'language', 'subtitle', 'title', 'year',
  'service', 'type', 'filename', 'indexer',
];

// ── Commands ───────────────────────────────────────────────────────

program
  .name('core-builds')
  .description('CLI for AIOStreams template generation, validation, and diffing')
  .version('2.86.0');

// --- devices ---
program
  .command('devices')
  .description('List all supported device profiles')
  .action(() => {
    console.log('\nSupported device profiles:\n');
    for (const [id, d] of Object.entries(DEVICES)) {
      const caps = [
        d.dv ? 'DV' : '',
        d.av1 === true ? 'AV1' : d.av1 === false ? 'no-AV1' : 'AV1?',
        d.audio,
      ].filter(Boolean).join(', ');
      console.log(`  ${id.padEnd(18)} ${d.name.padEnd(26)} [${caps}]`);
    }
    console.log('\n  Total:', Object.keys(DEVICES).length, 'devices\n');
  });

// --- services ---
program
  .command('services')
  .description('List all supported service IDs')
  .action(() => {
    console.log('\nSupported services:\n');
    SERVICES.forEach(s => console.log(`  ${s}`));
    console.log('\n  Total:', SERVICES.length, 'services\n');
  });

// --- formatters ---
program
  .command('formatters')
  .description('List all available formatter IDs')
  .action(() => {
    console.log('\nAvailable formatters:\n');
    FORMATTERS.forEach(f => console.log(`  ${f}`));
    console.log('\n  Total:', FORMATTERS.length, 'formatters\n');
  });

// --- generate ---
program
  .command('generate')
  .description('Generate an AIOStreams template JSON')
  .requiredOption('--service <id>', 'Service ID (e.g. torbox-pro, realdebrid, p2p)')
  .option('--device <id>', 'Device profile (default: generic)', 'generic')
  .option('--resolution <res>', 'Resolution: 4k or 1080p (default: 4k)', '4k')
  .option('--audio <mode>', 'Audio mode: lossless, standard, limited, dolby (default: limited)', 'limited')
  .option('--formatter <id>', 'Formatter ID (default: family-v3)', 'family-v3')
  .option('--content <type>', 'Content type: all, live, mixed, anime (default: all)', 'all')
  .option('--match-mode <mode>', 'Match mode: relaxed, balanced, strict (default: balanced)', 'balanced')
  .option('--cache-mode <mode>', 'Cache mode: mixed, cached, uncached (default: mixed)', 'mixed')
  .option('--output <file>', 'Output file (default: template.json)', 'template.json')
  .option('--tmdb-token <token>', 'TMDB Read Access Token (optional)')
  .option('--tmdb-key <key>', 'TMDB API Key (optional)')
  .action(async (opts) => {
    if (!SERVICES.includes(opts.service)) {
      console.error(`Error: Unknown service "${opts.service}". Run 'core-builds services' to see options.`);
      process.exit(1);
    }
    if (!DEVICES[opts.device]) {
      console.error(`Error: Unknown device "${opts.device}". Run 'core-builds devices' to see options.`);
      process.exit(1);
    }
    if (!FORMATTERS.includes(opts.formatter)) {
      console.error(`Error: Unknown formatter "${opts.formatter}". Run 'core-builds formatters' to see options.`);
      process.exit(1);
    }

    const coreDir = path.resolve(__dirname, '..', 'configurator', 'src', 'core');
    const dataDir = path.resolve(__dirname, '..', 'configurator', 'src', 'data');

    const { templateInput, hasTmdbCredentials } = await import(path.join(coreDir, 'template-policy.js'));
    const { resolutionPolicy, encodePolicy, audioPolicy } = await import(path.join(coreDir, 'device-policies.js'));
    const { sortPolicy } = await import(path.join(coreDir, 'sort-policy.js'));
    const { sizePolicy, bitratePolicy } = await import(path.join(coreDir, 'filter-policy.js'));
    const { assembleTemplate } = await import(path.join(coreDir, 'assemble-template.js'));
    const { DEVICE_AV1_SAFE, DEVICE_FORCE_LIMITED_AUDIO } = await import(path.join(dataDir, 'devices.js'));

    const device = DEVICES[opts.device];
    const isFree = opts.service === 'p2p' || opts.service === 'http';

    const rawInput = {
      service: opts.service,
      device: opts.device,
      resolution: opts.resolution,
      audio: opts.audio,
      contentType: opts.content,
      formatter: opts.formatter,
      tmdbToken: opts.tmdbToken || '',
      tmdbApiKey: opts.tmdbKey || '',
    };

    const input = templateInput(rawInput);
    const hasTmdb = hasTmdbCredentials(input);
    const resolution = resolutionPolicy(input);
    const encode = encodePolicy(input, DEVICE_AV1_SAFE);
    const audio = audioPolicy(input, DEVICE_FORCE_LIMITED_AUDIO);
    const sort = sortPolicy(input);
    const size = sizePolicy(input);
    const bitrate = bitratePolicy(input, hasTmdb);

    const eses = [];
    if (device.dv === false) {
      eses.push({ enabled: true, expression: "/* Exclude DV */ visualTag(streams,'DV','HDR+DV')" });
    }
    if (device.av1 === false) {
      eses.push({ enabled: true, expression: "/* Exclude AV1 */ encode(streams,'AV1')" });
    }
    if (resolution.excludedResolutions?.length) {
      const resArgs = resolution.excludedResolutions.map(r => `'${r}'`).join(',');
      eses.push({ enabled: true, expression: `/* Hard Resolution Kill */ resolution(streams,${resArgs})` });
    }

    const presets = [];
    if (!isFree) {
      presets.push({
        type: opts.service === 'torbox-pro' || opts.service === 'torbox-ess' ? 'torbox-search' : opts.service,
        instanceId: 'main',
        enabled: true,
        options: {}
      });
    }
    presets.push({ type: 'torrentio', instanceId: 'torrentio', enabled: true, options: {} });

    const template = {
      metadata: {
        name: `Core Builds ${opts.resolution.toUpperCase()} — ${DEVICES[opts.device].name}`,
        description: 'Auto-generated by Core Builds CLI',
        version: '1.0.0',
        author: 'Core Builds CLI',
        category: isFree ? 'Free' : 'Debrid',
      },
      config: {
        formatter: {
          id: 'tamtaro',
          definitions: {
            overrides: {
              tamtaro: {
                name: '{stream.resolution::exists["{stream.resolution::replace(\'2160p\',\'4K\')::replace(\'1080p\',\'1080p\')}  "||"HD  "]}{service.cached::istrue["⚡ "||"⏳ "]}{stream.title::exists["{stream.title::upper}"||""]}',
                description: '{service.cached::istrue["✅ Plays Fast "||""]}{stream.quality::exists["🎥 {stream.quality}"||""]}{stream.size::exists["💾 {stream.size::bytes}"||""]}'
              }
            }
          }
        },
        presets,
        includedStreamExpressions: [{ expression: "0Cached == true" }],
        excludedStreamExpressions: eses,
        preferredStreamExpressions: [],
        sortCriteria: sort,
        size,
        bitrate,
        ...resolution,
        ...encode,
        ...audio,
        titleMatching: { mode: 'fuzzy', similarityThreshold: 0.85 },
        yearMatching: { strict: false },
        seasonEpisodeMatching: { strict: false },
        deduplicator: {
          cached: opts.matchMode === 'strict' ? 'global' : 'per_addon',
          uncached: 'per_service'
        },
      }
    };

    if (opts.tmdbToken) template.config.tmdbReadAccessToken = opts.tmdbToken;
    if (opts.tmdbKey) template.config.tmdbApiKey = opts.tmdbKey;

    const result = assembleTemplate(template, { metadata: { coreBuildsVersion: '2.86', generatedAt: new Date().toISOString() } });

    fs.writeFileSync(opts.output, JSON.stringify(result, null, 2));
    console.log(`\n✅ Template written to ${opts.output}`);
    console.log(`   Service: ${opts.service}`);
    console.log(`   Device: ${opts.device} (${device.name})`);
    console.log(`   Resolution: ${opts.resolution}`);
    console.log(`   Audio: ${opts.audio}`);
    console.log(`   Formatter: ${opts.formatter}`);
    console.log(`   Sort sections: ${Object.keys(sort).join(', ')}`);
    console.log(`   ESEs: ${eses.length} device-aware exclusions`);
    console.log('');
  });

// --- validate ---
program
  .command('validate <file>')
  .description('Validate an AIOStreams template JSON')
  .option('--strict', 'Treat warnings as errors')
  .action((file, opts) => {
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf-8');
    } catch(e) {
      console.error(`\n✕ Cannot read file: ${file}\n`);
      process.exit(1);
    }

    let d;
    try {
      d = JSON.parse(raw);
    } catch(e) {
      console.error(`\n✕ INVALID JSON: ${e.message}\n`);
      process.exit(1);
    }

    const errors = [], warnings = [], passes = [];
    const cfg = d.config || {};

    // Metadata
    const meta = d.metadata || {};
    if (!meta.version) warnings.push('metadata.version missing');
    if (!meta.name) warnings.push('metadata.name missing');
    if (!meta.description) warnings.push('metadata.description missing');
    if (!meta.author) warnings.push('metadata.author missing');
    if (!meta.category) warnings.push('metadata.category missing');
    if (meta.version && meta.name && meta.description && meta.author && meta.category)
      passes.push('metadata: complete');

    // Formatter
    const fmt = cfg.formatter || {};
    if (fmt.id === 'tamtaro') {
      const overrides = fmt.definitions?.overrides;
      if (overrides && overrides.tamtaro) passes.push("formatter: tamtaro override correctly keyed");
      else errors.push("formatter: id='tamtaro' but overrides key is not 'tamtaro'");
    } else if (fmt.id) {
      passes.push(`formatter: using built-in '${fmt.id}'`);
    }

    // Sort criteria
    for (const scope of Object.keys(cfg.sortCriteria || {})) {
      const keys = cfg.sortCriteria[scope];
      if (!Array.isArray(keys)) continue;
      const invalid = keys.filter(k => !VALID_SORT_KEYS.includes(k.key));
      if (invalid.length) errors.push(`sortCriteria.${scope}: invalid key(s): ${invalid.map(k=>k.key).join(', ')}`);
      else passes.push(`sortCriteria.${scope}: ${keys.length} keys valid`);
    }

    // Presets
    const presets = cfg.presets || [];
    const enabled = presets.filter(p => p.enabled !== false);
    passes.push(`presets: ${presets.length} total, ${enabled.length} enabled`);

    // Stream expressions
    const ises = cfg.includedStreamExpressions || [];
    const eses = cfg.excludedStreamExpressions || [];
    const pses = cfg.preferredStreamExpressions || [];
    passes.push(`expressions: ${ises.length} ISEs, ${eses.length} ESEs, ${pses.length} PSEs`);

    const hasCachedIse = ises.some(e => e.expression && /0Cached/i.test(e.expression));
    if (!hasCachedIse) warnings.push('0Cached ISE missing — no fallback when nothing is cached');

    // Matching
    if (cfg.titleMatching?.mode === 'exact') warnings.push("titleMatching.mode is 'exact'");
    if (cfg.yearMatching?.strict === true) warnings.push('yearMatching.strict=true');

    // Print report
    console.log(`\n${'═'.repeat(60)}`);
    console.log('  CORE BUILDS TEMPLATE VALIDATOR');
    console.log(`  Checking: ${file}`);
    console.log(`${'═'.repeat(60)}\n`);

    if (errors.length) {
      console.log('ERRORS:');
      errors.forEach(e => console.log(`  ✕ ${e}`));
      console.log('');
    }
    if (warnings.length) {
      console.log('WARNINGS:');
      warnings.forEach(w => console.log(`  ⚠ ${w}`));
      console.log('');
    }
    if (passes.length) {
      console.log('PASSED:');
      passes.forEach(p => console.log(`  ✓ ${p}`));
      console.log('');
    }

    console.log(`${'═'.repeat(60)}`);
    console.log(`  ${errors.length} errors | ${warnings.length} warnings | ${passes.length} checks passed`);
    console.log(`${'═'.repeat(60)}\n`);

    if (errors.length || (opts.strict && warnings.length)) process.exit(1);
  });

// --- diff ---
program
  .command('diff <fileA> <fileB>')
  .description('Compare two AIOStreams template JSONs')
  .action((fileA, fileB) => {
    let a, b;
    try {
      a = JSON.parse(fs.readFileSync(fileA, 'utf-8'));
      b = JSON.parse(fs.readFileSync(fileB, 'utf-8'));
    } catch(e) {
      console.error(`\n✕ Cannot read or parse files: ${e.message}\n`);
      process.exit(1);
    }

    const cfgA = a.config || {};
    const cfgB = b.config || {};
    const diffs = [];

    // Compare formatter
    if (cfgA.formatter?.id !== cfgB.formatter?.id)
      diffs.push(`Formatter: ${cfgA.formatter?.id} → ${cfgB.formatter?.id}`);

    // Compare presets
    const presetsA = (cfgA.presets || []).map(p => p.type).sort().join(', ');
    const presetsB = (cfgB.presets || []).map(p => p.type).sort().join(', ');
    if (presetsA !== presetsB) diffs.push(`Presets changed: [${presetsA}] → [${presetsB}]`);

    // Compare ESE/ISE/PSE counts
    const countA = {
      ese: (cfgA.excludedStreamExpressions || []).length,
      ise: (cfgA.includedStreamExpressions || []).length,
      pse: (cfgA.preferredStreamExpressions || []).length,
    };
    const countB = {
      ese: (cfgB.excludedStreamExpressions || []).length,
      ise: (cfgB.includedStreamExpressions || []).length,
      pse: (cfgB.preferredStreamExpressions || []).length,
    };
    if (countA.ese !== countB.ese) diffs.push(`ESEs: ${countA.ese} → ${countB.ese}`);
    if (countA.ise !== countB.ise) diffs.push(`ISEs: ${countA.ise} → ${countB.ise}`);
    if (countA.pse !== countB.pse) diffs.push(`PSEs: ${countA.pse} → ${countB.pse}`);

    // Compare sort criteria
    const sortA = JSON.stringify(cfgA.sortCriteria || {});
    const sortB = JSON.stringify(cfgB.sortCriteria || {});
    if (sortA !== sortB) diffs.push('Sort criteria changed');

    // Compare matching
    if (JSON.stringify(cfgA.titleMatching) !== JSON.stringify(cfgB.titleMatching))
      diffs.push('Title matching changed');
    if (JSON.stringify(cfgA.yearMatching) !== JSON.stringify(cfgB.yearMatching))
      diffs.push('Year matching changed');

    // Compare deduplicator
    if (JSON.stringify(cfgA.deduplicator) !== JSON.stringify(cfgB.deduplicator))
      diffs.push('Deduplicator changed');

    console.log(`\n${'═'.repeat(60)}`);
    console.log('  CORE BUILDS TEMPLATE DIFF');
    console.log(`  A: ${fileA}`);
    console.log(`  B: ${fileB}`);
    console.log(`${'═'.repeat(60)}\n`);

    if (diffs.length === 0) {
      console.log('  No significant differences found.\n');
    } else {
      diffs.forEach(d => console.log(`  • ${d}`));
      console.log(`\n  ${diffs.length} difference(s) found.\n`);
    }
  });

// --- info ---
program
  .command('info <file>')
  .description('Show template metadata and summary')
  .action((file) => {
    let d;
    try {
      d = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch(e) {
      console.error(`\n✕ Cannot read or parse: ${e.message}\n`);
      process.exit(1);
    }

    const meta = d.metadata || {};
    const cfg = d.config || {};
    const presets = cfg.presets || [];
    const ises = cfg.includedStreamExpressions || [];
    const eses = cfg.excludedStreamExpressions || [];
    const pses = cfg.preferredStreamExpressions || [];

    console.log(`\n${'═'.repeat(60)}`);
    console.log('  TEMPLATE INFO');
    console.log(`${'═'.repeat(60)}\n`);
    console.log(`  Name:        ${meta.name || 'unnamed'}`);
    console.log(`  Description: ${meta.description || 'none'}`);
    console.log(`  Author:      ${meta.author || 'unknown'}`);
    console.log(`  Version:     ${meta.version || 'unknown'}`);
    console.log(`  Category:    ${meta.category || 'unknown'}`);
    console.log(`  Formatter:   ${cfg.formatter?.id || 'default'}`);
    console.log(`  Presets:     ${presets.length} total, ${presets.filter(p=>p.enabled!==false).length} enabled`);
    console.log(`  ESEs:        ${eses.length}`);
    console.log(`  ISEs:        ${ises.length}`);
    console.log(`  PSEs:        ${pses.length}`);
    console.log(`  Match mode:  ${cfg.titleMatching?.mode || 'default'}`);
    console.log(`  Year strict: ${cfg.yearMatching?.strict || false}`);
    console.log(`  Dedup:       cached=${cfg.deduplicator?.cached||'default'}, uncached=${cfg.deduplicator?.uncached||'default'}`);
    console.log(`  File size:   ${fs.statSync(file).size} bytes`);
    console.log('');
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
