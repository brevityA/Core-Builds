import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, '..', 'index.js');

function generate(args) {
  const out = execFileSync(process.execPath, [CLI, 'generate', ...args], {
    encoding: 'utf-8',
    timeout: 15000,
  });
  return JSON.parse(out);
}

function generateToFile(args, outPath) {
  execFileSync(process.execPath, [CLI, 'generate', ...args, '--output', outPath], {
    encoding: 'utf-8',
    timeout: 15000,
  });
  return JSON.parse(readFileSync(outPath, 'utf-8'));
}

function normalize(template) {
  const t = JSON.parse(JSON.stringify(template));
  if (t.metadata) {
    delete t.metadata.generatedAt;
    t.metadata.id = 'normalized-id';
  }
  return t;
}

const GOLDEN_COMBOS = [
  { service: 'torbox-pro', device: 'shield', resolution: '4k', architecture: 'iqr', label: 'TorBox Pro 4K IQR' },
  { service: 'torbox-pro', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'TorBox Pro 1080p Standard' },
  { service: 'torbox-pro', device: 'generic', resolution: 'mixed', architecture: 'apex-mixed', label: 'TorBox Pro Mixed Apex-Mixed' },
  { service: 'alldebrid', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'AllDebrid 1080p Standard' },
  { service: 'easynews', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'EasyNews 1080p Standard' },
  { service: 'p2p', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'P2P 1080p Standard' },
  { service: 'http', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'HTTP 1080p Standard' },
];

const REQUIRED_TOP_KEYS = ['metadata', 'config'];
const REQUIRED_CONFIG_KEYS = [
  'presets', 'services', 'formatter', 'sortCriteria',
  'excludedStreamExpressions', 'includedStreamExpressions', 'preferredStreamExpressions',
  'size', 'bitrate', 'deduplicator', 'resultLimits',
];
const DEBRID_EXTRA_KEYS = ['excludedRegexPatterns', 'rankedRegexPatterns', 'preferredRegexPatterns'];

const SENSITIVE_PATTERNS = [
  /apiKey/i, /password/i, /secret/i, /auth.*key/i, /token/i,
];

for (const combo of GOLDEN_COMBOS) {
  test(`golden: ${combo.label} generates a complete importable template`, () => {
    const args = ['--service', combo.service, '--device', combo.device, '--resolution', combo.resolution, '--architecture', combo.architecture];
    const template = generate(args);

    for (const key of REQUIRED_TOP_KEYS) {
      assert.ok(template[key], `missing top-level key: ${key}`);
    }

    for (const key of REQUIRED_CONFIG_KEYS) {
      assert.ok(key in template.config, `missing config key: ${key}`);
    }

    const isFree = combo.service === 'p2p' || combo.service === 'http';
    if (!isFree) {
      for (const key of DEBRID_EXTRA_KEYS) {
        assert.ok(Array.isArray(template.config[key]), `${key} should be an array for debrid service`);
      }
    }

    assert.ok(template.metadata.name, 'metadata.name should be set');
    assert.ok(template.metadata.version, 'metadata.version should be set');

    assert.ok(Array.isArray(template.config.presets), 'presets should be an array');
    assert.ok(template.config.presets.length > 0, 'presets should not be empty');
    assert.ok(Array.isArray(template.config.services), 'services should be an array');

    assert.ok(template.config.sortCriteria.global, 'sortCriteria.global should exist');
    assert.ok(template.config.sortCriteria.global.length > 0, 'sortCriteria.global should have entries');
    for (const entry of template.config.sortCriteria.global) {
      assert.ok(typeof entry.key === 'string' && entry.key.length > 0, `sortCriteria entry needs a key: ${JSON.stringify(entry)}`);
      assert.ok('direction' in entry, `sortCriteria entry needs "direction": ${JSON.stringify(entry)}`);
      assert.ok(!('order' in entry), `sortCriteria entry must not use "order": ${JSON.stringify(entry)}`);
    }

    assert.ok(template.config.excludedStreamExpressions.length > 0, 'ESEs should not be empty');
    assert.ok(template.config.includedStreamExpressions.length > 0, 'ISEs should not be empty');
    assert.ok(template.config.preferredStreamExpressions.length > 0, 'PSEs should not be empty');

    assert.ok(template.config.size.global, 'size.global should exist');
    assert.ok(template.config.bitrate.global, 'bitrate.global should exist');

    assert.ok(template.config.deduplicator, 'deduplicator should exist');
    assert.ok(template.config.resultLimits, 'resultLimits should exist');

    assert.ok(template.config.formatter?.id, 'formatter.id should be set');
  });

  test(`golden: ${combo.label} is deterministic`, () => {
    const args = ['--service', combo.service, '--device', combo.device, '--resolution', combo.resolution, '--architecture', combo.architecture];
    const a = normalize(generate(args));
    const b = normalize(generate(args));
    assert.deepEqual(a, b);
  });
}

test('golden: 4K IQR has IQR-specific expressions', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'shield', '--resolution', '4k', '--architecture', 'iqr']);
  const pses = t.config.preferredStreamExpressions.map(p => p.expression);
  assert.ok(pses.some(e => e.includes('iqr(')), 'IQR PSEs should contain iqr() calls');
});

test('golden: 1080p standard excludes 4K resolutions', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
  const excl = t.config.excludedResolutions || [];
  const eses = t.config.excludedStreamExpressions.map(e => e.expression);
  const hasNativeKill = excl.includes('2160p') && excl.includes('1440p');
  const hasEseKill = eses.some(e => e.includes("resolution(streams,'2160p','1440p')"));
  assert.ok(hasNativeKill || hasEseKill, '1080p should exclude 4K via excludedResolutions or ESE');
});

test('golden: AllDebrid uses stremthruStore not stremthruTorz', () => {
  const t = generate(['--service', 'alldebrid', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
  const presetTypes = t.config.presets.map(p => p.type);
  assert.ok(presetTypes.includes('stremthruStore'), 'AllDebrid should have stremthruStore');
  assert.ok(!presetTypes.includes('stremthruTorz'), 'AllDebrid should NOT have stremthruTorz');
});

test('golden: EasyNews has EasyNews presets', () => {
  const t = generate(['--service', 'easynews', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
  const presetTypes = t.config.presets.map(p => p.type);
  assert.ok(presetTypes.includes('easynewsPlusPlus'), 'EasyNews should have easynewsPlusPlus preset');
  assert.ok(presetTypes.includes('easynews-search'), 'EasyNews should have easynews-search preset');
});

test('golden: P2P template has p2p-specific config', () => {
  const t = generate(['--service', 'p2p', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
  assert.ok(t.config.minSeeders >= 1, 'P2P should set minSeeders');
  const presetTypes = t.config.presets.map(p => p.type);
  assert.ok(presetTypes.includes('torrentio'), 'P2P should have torrentio preset');
});

test('golden: HTTP template has HTTP-specific presets', () => {
  const t = generate(['--service', 'http', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
  const presetTypes = t.config.presets.map(p => p.type);
  assert.ok(presetTypes.includes('sootio'), 'HTTP should have sootio preset');
  assert.ok(presetTypes.includes('peerflix'), 'HTTP should have peerflix preset');
});

test('golden: apex-mixed uses labs profile and strips score-dependent rules without local ranked expressions', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', 'mixed', '--architecture', 'apex-mixed']);
  assert.equal(t.metadata.coreBuildsProfile, 'labs', 'apex-mixed should resolve to labs profile');
  const eses = t.config.excludedStreamExpressions.map(e => e.expression);
  const hasScoreIqr = eses.some(e => e.includes('streamExpressionScore'));
  const hasLocalRanked = (t.config.rankedStreamExpressions || []).some(e => e.enabled !== false && e.expression && e.expression !== '[]');
  if (!hasLocalRanked) {
    assert.ok(!hasScoreIqr, 'Score IQR Guard should be stripped when no local ranked expressions exist');
  }
});

test('golden: DV-Only Kill fires on generic device with advanced profile', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '4k', '--architecture', 'iqr']);
  assert.equal(t.metadata.coreBuildsProfile, 'advanced', 'IQR architecture should resolve to advanced profile');
  const eses = t.config.excludedStreamExpressions.map(e => e.expression);
  assert.ok(eses.some(e => e.includes('DV-Only Kill')), 'generic device should have DV-Only Kill ESE in advanced profile');
});

test('golden: DV-capable device skips DV-Only Kill', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'shield', '--resolution', '4k', '--architecture', 'standard']);
  const eses = t.config.excludedStreamExpressions.map(e => e.expression);
  assert.ok(!eses.some(e => e.includes('DV-Only Kill')), 'shield (DV-safe) should NOT have DV-Only Kill ESE');
});

test('golden: groups use instanceId not display names', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '4k', '--architecture', 'standard']);
  const groups = t.config.groups;
  if (groups?.enabled) {
    for (const g of groups.groupings) {
      for (const id of g.addons) {
        assert.ok(!/^[A-Z]/.test(id), `group addon "${id}" looks like a display name, not an instanceId`);
        assert.ok(id.length < 30, `group addon "${id}" looks too long for an instanceId`);
      }
    }
  }
});

test('security: generated template JSON contains no credential values', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '4k', '--architecture', 'standard']);
  const SAFE_DEFAULTS = new Set(['t0-free-rpdb']);
  function walkForSecrets(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      const cur = path ? `${path}.${key}` : key;
      if (SENSITIVE_PATTERNS.some(p => p.test(key)) && typeof val === 'string' && val.length > 0 && !SAFE_DEFAULTS.has(val)) {
        assert.fail(`sensitive field ${cur} has non-empty value "${val}"`);
      }
      if (typeof val === 'object') walkForSecrets(val, cur);
    }
  }
  walkForSecrets(t);
});

test('security: validate output never prints sensitive field values', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'cb-sec-'));
  try {
    const outPath = resolve(tmp, 'test.json');
    const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
    t.config.services.forEach(s => { s.credentials = { apiKey: 'SUPER_SECRET_KEY_123', password: 'HIDDEN_PASS' }; });
    writeFileSync(outPath, JSON.stringify(t, null, 2));

    const valResult = spawnSync(process.execPath, [CLI, 'validate', outPath], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const validateOut = (valResult.stdout || '') + (valResult.stderr || '');
    assert.ok(!validateOut.includes('SUPER_SECRET_KEY_123'), 'validate must not print API key values');
    assert.ok(!validateOut.includes('HIDDEN_PASS'), 'validate must not print password values');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('security: diff output never prints sensitive field values', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'cb-sec-'));
  try {
    const tA = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
    const tB = JSON.parse(JSON.stringify(tA));
    tA.config.services.forEach(s => { s.credentials = { apiKey: 'SECRET_A_KEY', password: 'PASS_A' }; });
    tB.config.services.forEach(s => { s.credentials = { apiKey: 'SECRET_B_KEY', password: 'PASS_B' }; });

    const pathA = resolve(tmp, 'a.json');
    const pathB = resolve(tmp, 'b.json');
    writeFileSync(pathA, JSON.stringify(tA, null, 2));
    writeFileSync(pathB, JSON.stringify(tB, null, 2));

    const diffResult = spawnSync(process.execPath, [CLI, 'diff', pathA, pathB], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const diffOut = (diffResult.stdout || '') + (diffResult.stderr || '');
    assert.ok(!diffOut.includes('SECRET_A_KEY'), 'diff must not print API key values');
    assert.ok(!diffOut.includes('SECRET_B_KEY'), 'diff must not print API key values');
    assert.ok(!diffOut.includes('PASS_A'), 'diff must not print password values');
    assert.ok(!diffOut.includes('PASS_B'), 'diff must not print password values');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('golden: --size-limit produces correct bounds', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard', '--size-limit', '10']);
  assert.deepEqual(t.config.size.global.movies, [0, 10_000_000_000]);
  assert.deepEqual(t.config.size.global.series, [0, 10_000_000_000]);
});

test('golden: unlimited size-limit does not add restrictive ESE', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
  const eses = t.config.excludedStreamExpressions.map(e => e.expression);
  assert.ok(!eses.some(e => e.includes("Size Limit")), 'unlimited should not add size limit ESE');
  assert.ok(t.config.size.global.movies[1] > 10_000_000_000, 'unlimited movie size cap should be large');
});
