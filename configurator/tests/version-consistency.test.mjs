/**
 * Version-honesty contract (release-stamp fix): one source of truth for the
 * configurator's own version, and every surface agreeing with it.
 *
 * Fails without the fix because you cannot publish "3.7" from
 * package.json while the in-app banner still claims 3.1.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHANGELOG } from '../src/data/changelog.js';
import { AIOSTREAMS_COMPATIBILITY_TARGETS } from '../src/core/output-profile-policy.js';
import { HOST_META } from '../src/data/hosts.js';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const repoVersions = JSON.parse(await readFile(new URL('../../versions.json', import.meta.url), 'utf8'));
const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const built = await readFile(new URL('../index.html', import.meta.url), 'utf8');

const configuratorVersion = app.match(/const CONFIGURATOR_VERSION = '([^']+)'/)?.[1];

test('CONFIGURATOR_VERSION matches package.json (major.minor)', () => {
  assert.ok(configuratorVersion, 'CONFIGURATOR_VERSION constant must exist in app.js');
  assert.equal(configuratorVersion, pkg.version.replace(/\.0$/, ''),
    `app.js says ${configuratorVersion}, package.json says ${pkg.version}`);
});

test('versions.json agrees with package.json', () => {
  assert.equal(repoVersions.configurator, pkg.version);
});

test('the in-app changelog opens with the shipped version', () => {
  assert.equal(CHANGELOG[0].v, configuratorVersion,
    `CHANGELOG top entry is v${CHANGELOG[0].v} but the app ships ${configuratorVersion}`);
});

test('the built header badge matches CONFIGURATOR_VERSION', () => {
  const expected = `title="View changelog">v${configuratorVersion}</span>`;
  assert.ok(built.includes(expected), `built HTML should contain "${expected}"`);
});

// Default AIOStreams compatibility target honesty: the default must itself be
// a selectable lane, and every registry host version must be a real target.
test('default aiostreamsVersion is pinned to a current compatibility target', () => {
  const sInit = app.match(/aiostreamsVersion:'(\d+\.\d+\.\d+)'/)?.[1];
  assert.ok(sInit, 'app.js must pin a default aiostreamsVersion');
  assert.ok(AIOSTREAMS_COMPATIBILITY_TARGETS.includes(sInit),
    `default ${sInit} is not a selectable compatibility target`);
});

test('every registry host version is a valid compatibility target', () => {
  for (const [key, meta] of Object.entries(HOST_META)) {
    assert.ok(AIOSTREAMS_COMPATIBILITY_TARGETS.includes(meta.aiostreamsVersion),
      `${key} registry version ${meta.aiostreamsVersion} is not a selectable target`);
  }
});

test('every compatibility target appears in the output-profile picker', () => {
  for (const target of AIOSTREAMS_COMPATIBILITY_TARGETS) {
    assert.ok(app.includes(`<option value="${target}"`),
      `renderOutputProfilePicker is missing an option for target ${target}`);
  }
});
