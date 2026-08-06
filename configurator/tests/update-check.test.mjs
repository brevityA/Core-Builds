import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVersion, isNewer, parseChangelogRange, shouldCheck, normalizeTemplateMeta,
} from '../src/core/update-check.js';

test('parseVersion handles v-prefixed, short, and 3-part versions', () => {
  assert.deepEqual(parseVersion('v0.9.1'), [0, 9, 1]);
  assert.deepEqual(parseVersion('2.10.9'), [2, 10, 9]);
  assert.deepEqual(parseVersion('3.5.3'), [3, 5, 3]);
  assert.deepEqual(parseVersion('1.2'), [1, 2, 0]);
  assert.equal(parseVersion('nonsense'), null);
  assert.equal(parseVersion(''), null);
});

test('isNewer compares versions correctly', () => {
  assert.equal(isNewer('0.9.2', '0.9.1'), true);
  assert.equal(isNewer('0.9.1', '0.9.2'), false);
  assert.equal(isNewer('2.10.9', '2.10.7'), true);
  assert.equal(isNewer('2.10.9', '2.10.9'), false);
  assert.equal(isNewer('1.0', '0.9.9'), true);
  assert.equal(isNewer('0.9.1', 'garbage'), false);
});

test('parseChangelogRange extracts entries strictly newer than from, up to to', () => {
  const md = `# Changelog
## 3.5.4 (2026-08-06)
- fix: update system
- feat: more
## 3.5.3 (2026-08-04)
- fix: episode packs
## 3.5.2 (2026-08-02)
- feat: CLI npm
## 3.5.1 (2026-07-31)
- feat: device profiles
`;
  const out = parseChangelogRange(md, '3.5.3', '3.5.4');
  assert.equal(out.length, 1);
  assert.equal(out[0].version, '3.5.4');
  assert.ok(out[0].body.some(l => l.includes('update system')));
  // from newer than all -> empty
  assert.deepEqual(parseChangelogRange(md, '3.5.5', '3.5.9'), []);
  // range spanning multiple
  const multi = parseChangelogRange(md, '3.5.1', '3.5.4');
  assert.equal(multi.length, 3);
  assert.equal(multi[0].version, '3.5.4'); // newest-first file order
  assert.equal(multi[2].version, '3.5.2');
});

test('parseChangelogRange caps at 5 entries and skips unparseable', () => {
  const md = Array.from({ length: 10 }, (_, i) => `## 3.5.${i} (d)\n- item`).join('\n');
  const out = parseChangelogRange(md, '3.0.0', '99.0.0');
  assert.equal(out.length, 5);
});

test('shouldCheck respects the interval', () => {
  const now = 1_000_000;
  assert.equal(shouldCheck(now, null, 3_600_000), true);
  assert.equal(shouldCheck(now, now - 3_600_000, 3_600_000), true);
  assert.equal(shouldCheck(now, now - 60_000, 3_600_000), false);
});

test('normalizeTemplateMeta only keeps public metadata with a real http sourceUrl + version', () => {
  const ok = normalizeTemplateMeta({ sourceUrl: 'https://raw.githubusercontent.com/x/y.json', version: '1.2.3', name: 'Core X' });
  assert.ok(ok && ok.sourceUrl === 'https://raw.githubusercontent.com/x/y.json' && ok.version === '1.2.3');
  assert.equal(normalizeTemplateMeta({ sourceUrl: 'ftp://nope', version: '1' }), null);
  assert.equal(normalizeTemplateMeta({ sourceUrl: 'https://x/y', version: '' }), null);
  assert.equal(normalizeTemplateMeta({}), null);
});
