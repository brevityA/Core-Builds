import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PROVIDER_CREDENTIALS } from '../src/data/credentials.js';

const PAID_QUICK_KEYS = ['torbox','realdebrid','alldebrid','premiumize','easynews'];
const OPTIONAL_KEYS = ['debridlink','offcloud','nzbgeek','debridio','easydebrid','pikpak','seedr','nzbnoob','althub','usenetcrawler','drunkenslug','nzbfinder'];

test('Quick Install paid providers expose safe account links', () => {
  for (const key of [...PAID_QUICK_KEYS, ...OPTIONAL_KEYS]) {
    const item = PROVIDER_CREDENTIALS[key];
    assert.ok(item, `missing registry entry for ${key}`);
    assert.match(item.url, /^https:\/\//, `missing HTTPS URL for ${key}`);
    assert.ok(item.linkLabel, `missing link label for ${key}`);
  }
});

test('StreamNZB explicitly uses a user-owned manifest URL', () => {
  assert.equal(PROVIDER_CREDENTIALS.streamnzb.url, '');
  assert.equal(PROVIDER_CREDENTIALS.streamnzb.linkLabel, 'Use your manifest URL');
});

test('Quick Install renderer uses the credential registry and visible key links', async () => {
  const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /const credentialField=/);
  assert.match(app, /PROVIDER_CREDENTIALS\[key\]/);
  assert.ok(app.includes('fastlane-get-key'));
  assert.ok(app.includes('noopener noreferrer'));
});
