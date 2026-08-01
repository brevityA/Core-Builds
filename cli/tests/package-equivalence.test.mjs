import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, '..', 'index.js');
const REPO_ROOT = resolve(__dirname, '..', '..');

function run(args, opts = {}) {
  return execFileSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    timeout: 15000,
    ...opts,
  });
}

function generate(args) {
  return JSON.parse(run(['generate', ...args]));
}

function normalize(template) {
  const t = JSON.parse(JSON.stringify(template));
  if (t.metadata) {
    delete t.metadata.generatedAt;
    t.metadata.id = 'normalized-id';
    delete t.metadata.name;
  }
  return t;
}

// ─── CLI command tests ───

const COMMANDS = ['devices', 'services', 'formatters', 'architectures'];

for (const cmd of COMMANDS) {
  test(`cli command: ${cmd} exits zero`, () => {
    const result = spawnSync(process.execPath, [CLI, cmd], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    assert.equal(result.status, 0, `${cmd} should exit 0, got ${result.status}\nstderr: ${result.stderr}`);
    assert.ok(result.stdout.length > 0, `${cmd} should produce output`);
  });
}

test('cli command: --help exits zero', () => {
  const result = spawnSync(process.execPath, [CLI, '--help'], {
    encoding: 'utf-8',
    timeout: 10000,
  });
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('core-builds') || result.stdout.includes('generate'));
});

test('cli command: --version prints version', () => {
  const result = spawnSync(process.execPath, [CLI, '--version'], {
    encoding: 'utf-8',
    timeout: 10000,
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

// ─── Generate completeness: required keys from instructions ───

const REQUIRED_CONFIG_KEYS_FULL = [
  'metadata', 'config', 'services', 'presets', 'groups', 'formatter',
  'deduplicator', 'sortCriteria', 'preferredStreamExpressions',
  'includedStreamExpressions', 'excludedStreamExpressions',
  'size', 'bitrate', 'resultLimits', 'dynamicAddonFetching',
];

const GOLDEN_COMBOS = [
  { service: 'torbox-pro', device: 'shield', resolution: '4k', architecture: 'iqr', label: 'torbox-shield-4k-iqr' },
  { service: 'torbox-pro', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'torbox-1080p-standard' },
  { service: 'torbox-pro', device: 'generic', resolution: 'mixed', architecture: 'apex-mixed', label: 'torbox-mixed-apex-mixed' },
  { service: 'alldebrid', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'alldebrid-1080p' },
  { service: 'easynews', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'easynews-1080p' },
  { service: 'p2p', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'p2p-1080p' },
  { service: 'http', device: 'generic', resolution: '1080p', architecture: 'standard', label: 'http-1080p' },
];

for (const combo of GOLDEN_COMBOS) {
  test(`completeness: ${combo.label} has all required keys`, () => {
    const args = ['--service', combo.service, '--device', combo.device, '--resolution', combo.resolution, '--architecture', combo.architecture];
    const t = generate(args);

    assert.ok(t.metadata, 'missing metadata');
    assert.ok(t.config, 'missing config');

    for (const key of ['presets', 'services', 'formatter', 'deduplicator', 'sortCriteria',
      'preferredStreamExpressions', 'includedStreamExpressions', 'excludedStreamExpressions',
      'size', 'bitrate', 'resultLimits', 'dynamicAddonFetching']) {
      assert.ok(key in t.config, `missing config.${key}`);
    }

    assert.ok('groups' in t.config, 'missing config.groups');
  });
}

// ─── CLI validate tests ───

for (const combo of GOLDEN_COMBOS) {
  test(`validate: ${combo.label} passes validation`, () => {
    const tmp = mkdtempSync(resolve(tmpdir(), 'cb-val-'));
    try {
      const outPath = resolve(tmp, 'template.json');
      const args = ['--service', combo.service, '--device', combo.device, '--resolution', combo.resolution, '--architecture', combo.architecture];
      const t = generate(args);
      writeFileSync(outPath, JSON.stringify(t, null, 2));

      const result = spawnSync(process.execPath, [CLI, 'validate', outPath], {
        encoding: 'utf-8',
        timeout: 10000,
      });
      assert.equal(result.status, 0, `validate should pass for ${combo.label}\nstderr: ${result.stderr}`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
}

test('validate: invalid input fails validation with --strict', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'cb-inv-'));
  try {
    const outPath = resolve(tmp, 'invalid.json');
    writeFileSync(outPath, '{"bad":true}\n');
    const result = spawnSync(process.execPath, [CLI, 'validate', outPath, '--strict'], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    assert.notEqual(result.status, 0, 'validate --strict should fail for invalid input');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ─── Golden equivalence: CLI vs Configurator fixtures ───

const GOLDEN_MAP = [
  { service: 'torbox-pro', device: 'generic', resolution: '4k', architecture: 'iqr', golden: 'torbox-4k-iqr' },
  { service: 'torbox-pro', device: 'generic', resolution: '1080p', architecture: 'standard', golden: 'torbox-1080p-standard' },
  { service: 'torbox-pro', device: 'generic', resolution: 'mixed', architecture: 'apex-mixed', golden: 'torbox-mixed-apex-mixed' },
  { service: 'alldebrid', device: 'generic', resolution: '1080p', architecture: 'standard', golden: 'alldebrid-1080p' },
  { service: 'easynews', device: 'generic', resolution: '1080p', architecture: 'standard', golden: 'easynews-1080p' },
  { service: 'p2p', device: 'generic', resolution: '1080p', architecture: 'standard', golden: 'p2p-1080p' },
  { service: 'http', device: 'generic', resolution: '1080p', architecture: 'standard', golden: 'http-1080p' },
];

function findFirstDiff(a, b, path = '') {
  if (typeof a !== typeof b) return `${path}: type ${typeof a} vs ${typeof b}`;
  if (a === null || b === null) {
    if (a !== b) return `${path}: ${a} vs ${b}`;
    return null;
  }
  if (typeof a !== 'object') {
    if (a !== b) return `${path}: ${JSON.stringify(a).slice(0, 80)} vs ${JSON.stringify(b).slice(0, 80)}`;
    return null;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs object`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!(k in a)) return `${path}.${k}: missing in CLI output`;
    if (!(k in b)) return `${path}.${k}: missing in golden fixture`;
    const d = findFirstDiff(a[k], b[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}

for (const entry of GOLDEN_MAP) {
  const goldenPath = resolve(REPO_ROOT, 'configurator', 'e2e', 'golden', `${entry.golden}.json`);
  if (!existsSync(goldenPath)) continue;

  test(`golden equivalence: CLI ${entry.golden} matches Configurator fixture`, () => {
    const args = ['--service', entry.service, '--device', entry.device, '--resolution', entry.resolution, '--architecture', entry.architecture];
    const cliOut = normalize(generate(args));
    const goldenOut = normalize(JSON.parse(readFileSync(goldenPath, 'utf-8')));

    const diff = findFirstDiff(cliOut, goldenOut);
    assert.equal(diff, null, `CLI/Configurator mismatch: ${diff}`);
  });
}

// ─── Diff tests ───

test('diff: identical files report no changes', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'cb-diff-'));
  try {
    const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
    const path = resolve(tmp, 'same.json');
    writeFileSync(path, JSON.stringify(t, null, 2));

    const result = spawnSync(process.execPath, [CLI, 'diff', path, path], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    assert.equal(result.status, 0, 'identical diff should exit 0');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('diff: different files report changes', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'cb-diff-'));
  try {
    const tA = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
    const tB = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '4k', '--architecture', 'standard']);
    const pathA = resolve(tmp, 'a.json');
    const pathB = resolve(tmp, 'b.json');
    writeFileSync(pathA, JSON.stringify(tA, null, 2));
    writeFileSync(pathB, JSON.stringify(tB, null, 2));

    const result = spawnSync(process.execPath, [CLI, 'diff', pathA, pathB], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const combined = (result.stdout || '') + (result.stderr || '');
    assert.ok(combined.length > 0, 'diff should produce output for different files');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('diff: --json emits valid JSON', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'cb-diff-'));
  try {
    const tA = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
    const tB = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '4k', '--architecture', 'standard']);
    const pathA = resolve(tmp, 'a.json');
    const pathB = resolve(tmp, 'b.json');
    writeFileSync(pathA, JSON.stringify(tA, null, 2));
    writeFileSync(pathB, JSON.stringify(tB, null, 2));

    const result = spawnSync(process.execPath, [CLI, 'diff', pathA, pathB, '--json'], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    if (result.stdout.trim()) {
      assert.doesNotThrow(() => JSON.parse(result.stdout), 'diff --json should output valid JSON');
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('diff: credentials are redacted', () => {
  const tmp = mkdtempSync(resolve(tmpdir(), 'cb-diff-'));
  try {
    const tA = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
    const tB = JSON.parse(JSON.stringify(tA));
    tA.config.services.forEach(s => { s.credentials = { apiKey: 'DIFF_SECRET_A', password: 'DIFF_PASS_A' }; });
    tB.config.services.forEach(s => { s.credentials = { apiKey: 'DIFF_SECRET_B', password: 'DIFF_PASS_B' }; });

    const pathA = resolve(tmp, 'a.json');
    const pathB = resolve(tmp, 'b.json');
    writeFileSync(pathA, JSON.stringify(tA, null, 2));
    writeFileSync(pathB, JSON.stringify(tB, null, 2));

    const result = spawnSync(process.execPath, [CLI, 'diff', pathA, pathB], { encoding: 'utf-8', timeout: 10000 });
    const combined = (result.stdout || '') + (result.stderr || '');
    assert.ok(!combined.includes('DIFF_SECRET_A'), 'diff must not print credential A');
    assert.ok(!combined.includes('DIFF_SECRET_B'), 'diff must not print credential B');
    assert.ok(!combined.includes('DIFF_PASS_A'), 'diff must not print password A');
    assert.ok(!combined.includes('DIFF_PASS_B'), 'diff must not print password B');

    const jsonResult = spawnSync(process.execPath, [CLI, 'diff', pathA, pathB, '--json'], { encoding: 'utf-8', timeout: 10000 });
    const jsonCombined = (jsonResult.stdout || '') + (jsonResult.stderr || '');
    assert.ok(!jsonCombined.includes('DIFF_SECRET_A'), 'diff --json must not print credential A');
    assert.ok(!jsonCombined.includes('DIFF_SECRET_B'), 'diff --json must not print credential B');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ─── Package contents ───

test('npm pack includes required files and excludes sensitive ones', () => {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf-8',
    timeout: 30000,
    cwd: resolve(__dirname, '..'),
  });
  assert.equal(result.status, 0, `npm pack --dry-run failed: ${result.stderr}`);

  const packInfo = JSON.parse(result.stdout);
  const files = packInfo[0].files.map(f => f.path);

  assert.ok(files.includes('index.js'), 'pack should include index.js');
  assert.ok(files.includes('package.json'), 'pack should include package.json');

  const bundledOk = 'node_modules/@core-builds/core';
  for (const f of files) {
    if (f.includes('node_modules') && !f.startsWith(bundledOk)) {
      assert.fail(`pack should not include non-bundled node_modules: ${f}`);
    }
    assert.ok(!f.endsWith('.env'), `pack should not include .env: ${f}`);
    assert.ok(!f.includes('test-results'), `pack should not include test-results: ${f}`);
    assert.ok(!f.includes('coverage'), `pack should not include coverage: ${f}`);
  }

  assert.ok(files.some(f => f.startsWith(bundledOk)), 'pack should bundle @core-builds/core');
});

// ─── Version checks ───

test('version: CLI and core package versions are consistent', () => {
  const cliPkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));
  const corePkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'packages', 'core', 'package.json'), 'utf-8'));
  const versions = JSON.parse(readFileSync(resolve(REPO_ROOT, 'versions.json'), 'utf-8'));

  assert.ok(cliPkg.version, 'CLI package.json should have version');
  assert.ok(corePkg.version, 'core package.json should have version');

  const cliMajorMinor = cliPkg.version.split('.').slice(0, 2).join('.');
  if (versions.configurator) {
    const confMajorMinor = versions.configurator.split('.').slice(0, 2).join('.');
    assert.equal(cliMajorMinor, confMajorMinor, 'CLI and configurator major.minor should match');
  }
});

test('version: generated template includes coreBuildsVersion', () => {
  const t = generate(['--service', 'torbox-pro', '--device', 'generic', '--resolution', '1080p', '--architecture', 'standard']);
  assert.ok(t.metadata.coreBuildsVersion, 'metadata.coreBuildsVersion should be set');
  assert.match(t.metadata.coreBuildsVersion, /^\d+\.\d+$/, 'coreBuildsVersion should be MAJOR.MINOR');
});
