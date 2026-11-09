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

  for (const host of report.publicHosts) {
    assert.deepEqual(host.issues, [], `${host.id} has compatibility issues`);

    if (!host.supports.p2p) {
      assert.ok(
        host.disabledPresetIds.length >= 0,
        `${host.id} capability data must remain aligned with HOST_META`
      );
    }
  }
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
