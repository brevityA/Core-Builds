import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/js/app.js'), 'utf8');

// A self-hosted user could not update an existing config: the UUID row was hidden
// for instanceHost 'custom', so every install POSTed a new config and orphaned the
// previous one. Visibility is decided in two places — the initial markup and the
// host-change handler — and both have to agree, or the field appears on first
// paint and vanishes the moment the picker is touched (or the reverse).

test('the UUID row is offered for Custom / Self-hosted, in the markup and the host-change handler', () => {
  const markup = source.match(/<div id="aioUuidRow"[^>]*>/)?.[0] || '';
  assert.ok(markup, 'the UUID row markup is present');
  assert.match(markup, /S\.instanceHost==='auto'\?'display:none':''/, 'markup hides the UUID row for auto only');
  assert.equal(/instanceHost==='custom'\?'display:none'/.test(markup), false, 'markup must not hide the UUID row for custom');

  assert.match(source, /const showUuid = val !== 'auto';/, 'handler shows the UUID row for every concrete host, custom included');
});

test('the configure-page link stays hidden for custom, which has no known public base URL', () => {
  // Split from showUuid deliberately: the link is built from HOST_BASE_URLS[val],
  // which is undefined for a self-hosted instance, so it must not ride the same flag.
  assert.match(source, /const showCfgLink = \(val !== 'custom' && val !== 'auto'\);/);
  assert.match(source, /cfgLinkRow\.style\.display = showCfgLink \? '' : 'none'/);
});

test('the manual panel pushes to an entered UUID instead of only rebuilding the link', () => {
  // Regression: `if (uuid && !isAuto)` returned early for ANY uuid on a concrete
  // host, so a self-hosted user could enter their UUID, click Get Install Link,
  // and receive a manifest URL for the config they already had — the template
  // they had just built was never sent. Showing the UUID field without this is
  // worse than hiding it: it looks like it worked. A uuid with no password still
  // short-circuits, because there is nothing to push.
  assert.match(source, /if \(uuid && !isAuto && !pwd\) \{/, 'the link-only short-circuit requires the absence of a password');
  const manual = source.match(/const userPath = uuid \?[\s\S]{0,900}/)?.[0] || '';
  assert.ok(manual, 'the manual install path selects its route from the uuid');
  assert.match(manual, /method: uuid \? 'PATCH' : 'POST'/, 'a uuid updates in place; no uuid creates');
  assert.match(manual, /\|\| uuid;/, 'a PATCH response need not echo the uuid, so it falls back to the one sent');
});

test('an entered UUID drives an update-in-place regardless of which host is selected', () => {
  // validateUuid is format-only, and the install path picks PATCH /api/v1/user/<id>
  // from the UUID alone — nothing there branches on the host being a public one.
  assert.match(source, /function validateUuid\(val\) \{\s*return \/\^\[0-9a-f\]\{8\}/);
  assert.match(source, /const existingUuid = validateUuid\(uuid\) \? uuid : null;/);
  assert.match(source, /const path = id \? `\/api\/v1\/user\/\$\{id\}` : '\/api\/v1\/user';/);
});
