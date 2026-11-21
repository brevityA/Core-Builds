import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReport, renderMarkdown } from '../scripts/generate-host-report.mjs';

const report = buildReport();

test('every public host has endpoint, metadata, and capability data', () => {
  assert.equal(report.publicHosts.length, 8);

  for (const host of report.publicHosts) {
    assert.ok(host.url, `${host.id} is missing an endpoint`);
    assert.ok(host.aiostreamsVersion, `${host.id} is missing an AIOStreams version`);
    assert.ok(host.regexAccess, `${host.id} is missing a regex-access policy`);
  }
});

test('host capability data is internally consistent', () => {
  assert.equal(report.issueCount, 0);

  // Includes the P2P/HTTP alignment with HOST_META, which the generator checks.
  for (const host of report.publicHosts) {
    assert.deepEqual(host.issues, [], `${host.id} has compatibility issues`);
  }
});

test('importing the generator never rewrites the committed report', async () => {
  const { stat } = await import('node:fs/promises');
  const files = ['../reports/host-compatibility.json', '../docs/host-compatibility.md'].map(f => new URL(f, import.meta.url));
  const before = await Promise.all(files.map(f => stat(f).then(x => x.mtimeMs)));
  await import(`../scripts/generate-host-report.mjs?fresh=${Date.now()}`);
  const after = await Promise.all(files.map(f => stat(f).then(x => x.mtimeMs)));
  assert.deepEqual(after, before);
});

test('regex access policies use supported values', () => {
  for (const host of report.publicHosts) {
    assert.ok(
      ['none', 'trusted', 'all'].includes(host.regexAccess),
      `${host.id} has an unsupported regex-access policy`
    );
  }
});

test('generated report files match the host registry', async () => {
  const [json, markdown] = await Promise.all([
    readFile(new URL('../reports/host-compatibility.json', import.meta.url), 'utf8'),
    readFile(new URL('../docs/host-compatibility.md', import.meta.url), 'utf8'),
  ]);

  assert.equal(json, `${JSON.stringify(report, null, 2)}\n`);
  assert.equal(markdown, renderMarkdown(report));
});
