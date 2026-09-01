import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, '..', 'index.js');

function run(args) {
  return execFileSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    timeout: 15000,
  });
}

function generate(args) {
  return JSON.parse(run(['generate', ...args]));
}

function tryGenerate(args) {
  const r = spawnSync(process.execPath, [CLI, 'generate', ...args], {
    encoding: 'utf-8',
    timeout: 15000,
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

test('hosts command lists available hosts', () => {
  const out = run(['hosts']);
  assert.ok(out.includes('fortheweak'));
  assert.ok(out.includes('elfhosted'));
  assert.ok(out.includes('P2P'));
  assert.ok(out.includes('Nuvio'));
});

test('Nuvio route generates valid template with P2P and no debrid', () => {
  const t = generate(['--route', 'nuvio-torbox-instant', '--host', 'fortheweak', '--device', 'shield', '--resolution', '4k']);
  assert.ok(t.metadata);
  assert.ok(t.config);
  assert.equal(t.metadata.category, 'P2P');
  assert.ok(t.metadata.description.includes('Nuvio'));
  assert.ok(t.config.services.every(s => s.enabled === false));
  assert.ok(t.config.services.every(s => Object.keys(s.credentials).length === 0));
  assert.ok(t.config.presets.length > 0);
  // Stripped by the host gate: not an AIOStreams key (see golden-combos.test.mjs).
  assert.equal(t.config.minSeeders, undefined);
});

test('Nuvio route contains no TorBox credentials', () => {
  const t = generate(['--route', 'nuvio-torbox-instant', '--host', 'fortheweak', '--device', 'generic', '--resolution', '1080p']);
  const json = JSON.stringify(t);
  assert.ok(!json.includes('"torbox-search"'));
  const services = t.config.services;
  for (const s of services) {
    assert.deepStrictEqual(s.credentials, {});
  }
});

test('Nuvio route includes correct default addons', () => {
  const t = generate(['--route', 'nuvio-torbox-instant', '--host', 'fortheweak', '--device', 'generic', '--resolution', '1080p']);
  const types = t.config.presets.map(p => p.type);
  assert.ok(types.includes('torrentio'));
  assert.ok(types.includes('comet'));
  assert.ok(types.includes('mediafusion'));
  assert.ok(types.includes('meteor'));
  assert.ok(types.includes('stremthruTorz'));
});

test('Nuvio route supports optional scrapers', () => {
  const t = generate(['--route', 'nuvio-torbox-instant', '--host', 'fortheweak', '--device', 'generic', '--resolution', '1080p', '--optional-scrapers', 'eztv,knaben,torrent-galaxy']);
  const types = t.config.presets.map(p => p.type);
  assert.ok(types.includes('eztv'));
  assert.ok(types.includes('knaben'));
  assert.ok(types.includes('torrent-galaxy'));
});

test('Nuvio route rejects ElfHosted', () => {
  const r = tryGenerate(['--route', 'nuvio-torbox-instant', '--host', 'elfhosted', '--device', 'generic', '--resolution', '1080p']);
  assert.notEqual(r.status, 0);
  assert.ok(r.stderr.includes('does not support Nuvio'));
});

test('Nuvio route rejects missing --host', () => {
  const r = tryGenerate(['--route', 'nuvio-torbox-instant', '--device', 'generic', '--resolution', '1080p']);
  assert.notEqual(r.status, 0);
  assert.ok(r.stderr.includes('--host is required'));
});

test('Nuvio route --json errors output valid JSON', () => {
  const r = tryGenerate(['--route', 'nuvio-torbox-instant', '--host', 'elfhosted', '--json']);
  assert.notEqual(r.status, 0);
  const parsed = JSON.parse(r.stdout.trim());
  assert.ok(parsed.error);
  assert.ok(parsed.error.includes('does not support Nuvio'));
});

test('Nuvio route output is deterministic', () => {
  const a = generate(['--route', 'nuvio-torbox-instant', '--host', 'fortheweak', '--device', 'shield', '--resolution', '4k']);
  const b = generate(['--route', 'nuvio-torbox-instant', '--host', 'fortheweak', '--device', 'shield', '--resolution', '4k']);
  assert.deepStrictEqual(a, b);
});

test('Nuvio route 1080p includes resolution kill ESE', () => {
  const t = generate(['--route', 'nuvio-torbox-instant', '--host', 'fortheweak', '--device', 'generic', '--resolution', '1080p']);
  const eses = t.config.excludedStreamExpressions.map(e => e.expression);
  assert.ok(eses.some(e => e.includes('Hard Resolution Kill')));
});
