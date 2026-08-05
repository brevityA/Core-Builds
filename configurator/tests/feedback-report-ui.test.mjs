import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/js/app.js'), 'utf8');

test('review screen exposes a copyable safe feedback report without wiring credentials into its context', () => {
  assert.match(source, /data-action="open-feedback-report"/);
  assert.match(source, /function showFeedbackReportModal\(\)/);
  const context = source.match(/function feedbackReportContext\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(context, /aiostreamsVersion/);
  assert.equal(/S\.creds|tmdbToken|tmdbApiKey|instanceUrl|instanceUuid|instancePassword/i.test(context), false);
});
