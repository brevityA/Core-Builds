import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OPTIONAL_SCRAPER_DEFS } from '../src/data/scrapers.js';
import { CAROUSEL_SVCS } from '../src/data/services.js';
import { SCRAPER_REQUIRED_SERVICE, requiredServiceFor, withScraperServices } from '../src/core/scraper-services.js';

const appSrc = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('EasyNews and EasyNews+ bring the EasyNews service along; other add-ons bring nothing', () => {
  assert.equal(requiredServiceFor('easynews'), 'easynews');
  assert.equal(requiredServiceFor('easynewsPlus'), 'easynews');
  assert.equal(requiredServiceFor('knaben'), '');
  assert.deepEqual(withScraperServices([], ['easynews', 'easynewsPlus', 'knaben']), ['easynews']);
  assert.deepEqual(withScraperServices(['debridio'], ['easynewsPlus']), ['debridio', 'easynews']);
  assert.deepEqual(withScraperServices(['easynews'], ['easynews']), ['easynews'], 'no duplicate service');
  assert.deepEqual(withScraperServices(undefined, undefined), []);
});

test('every add-on with a required service is offered in the extras dialog, and its service is not', () => {
  // The bug: the dialog lists these add-ons but not the service they need, so a
  // TorBox build that ticked them shipped with no EasyNews at all.
  for (const [scraper, service] of Object.entries(SCRAPER_REQUIRED_SERVICE)) {
    assert.ok(OPTIONAL_SCRAPER_DEFS.some(d => d.id === scraper), `${scraper} is an optional add-on`);
    assert.ok(!CAROUSEL_SVCS.includes(service), `${service} is not pickable as an extra service, so the add-on must bring it`);
  }
});

test('the extras dialog applies required services and Quick install asks for their login', () => {
  assert.match(appSrc, /sv=withScraperServices\(\[\.\.\.selectedServices\],sc\)/);
  assert.match(appSrc, /easynews:\['easynews','easynewsPass'\]/);
});
