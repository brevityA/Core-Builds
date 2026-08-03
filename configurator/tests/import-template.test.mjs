import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTemplateForRemoteImport } from '../src/core/import-template.js';

test('remote-import sanitizer removes every credential-bearing generated field without mutating the source', () => {
  const source = {
    metadata: { author: 'Core Builds' },
    parentConfig: { uuid: 'base-id', password: 'BASE_PASSWORD_SECRET' },
    config: {
      tmdbAccessToken: 'TMDB_ACCESS_TOKEN_SECRET',
      tmdbApiKey: 'TMDB_API_KEY_SECRET',
      rpdbApiKey: 't0-free-rpdb',
      services: [
        { id: 'torbox', credentials: { apiKey: 'TORBOX_SECRET' } },
        { id: 'easynews', credentials: { username: 'USER_SECRET', password: 'PASSWORD_SECRET' } },
      ],
      presets: [
        { type: 'subdl', options: { name: 'SubDL', subDlApiKey: 'SUBDL_SECRET' } },
        { type: 'newznab', options: { name: 'Newznab', apiKey: 'NZB_SECRET' } },
        { type: 'streamnzb', options: { name: 'StreamNZB', url: 'https://user.example/manifest/STREAMNZB_SECRET' } },
        { type: 'meteor', options: { name: 'Meteor', url: 'https://meteor.example/public-manifest.json' } },
      ],
    },
  };
  const before = structuredClone(source);

  const clean = sanitizeTemplateForRemoteImport(source);
  const serialized = JSON.stringify(clean);

  for (const secret of [
    'BASE_PASSWORD_SECRET', 'TMDB_ACCESS_TOKEN_SECRET', 'TMDB_API_KEY_SECRET',
    'TORBOX_SECRET', 'USER_SECRET', 'PASSWORD_SECRET', 'SUBDL_SECRET',
    'NZB_SECRET', 'STREAMNZB_SECRET',
  ]) {
    assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
  }

  assert.deepEqual(clean.config.services.map(service => service.credentials), [{}, {}]);
  assert.equal(clean.config.presets[2].options.url, '');
  assert.equal(clean.config.presets[3].options.url, 'https://meteor.example/public-manifest.json');
  assert.equal(clean.config.rpdbApiKey, 't0-free-rpdb');
  assert.equal(clean.metadata.author, 'Core Builds', 'author metadata is not a credential');
  assert.deepEqual(source, before, 'sanitization must not mutate the local template');
});
