import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/js/app.js'), 'utf8');

test('the site menu opens a copyable safe feedback report without wiring credentials into its context', () => {
  // v3.37: it moved from Review's Tools fold to Menu › Help (#feedback).
  const nav = readFileSync(resolve(root, '..', 'tools', 'core-nav.js'), 'utf8');
  assert.match(nav, /\['Copy a safe feedback report', 'configurator\/#feedback', 'clip'\]/);
  assert.match(source, /'#feedback':'open-feedback-report'/);
  assert.match(source, /if \(action === 'open-feedback-report'\) showFeedbackReportModal\(\);/);
  assert.match(source, /function showFeedbackReportModal\(\)/);
  const context = source.match(/function feedbackReportContext\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(context, /aiostreamsVersion/);
  assert.equal(/S\.creds|tmdbToken|tmdbApiKey|instanceUrl|instanceUuid|instancePassword/i.test(context), false);
});
