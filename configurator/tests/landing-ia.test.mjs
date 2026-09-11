/**
 * Express-first landing IA (2026-09-06 audit, defect 5).
 *
 * The landing presented four equal route cards for a five-step job. Now the
 * Express five-step flow (service → device → resolution → key → Deploy) is the
 * single primary card; Advanced Builder and Update Existing are secondary text
 * links; the Setup Genie card is gone from the landing while its route stays
 * reachable. These tests fail if the four equal cards ever come back.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
// The route section runs from the Express doors container to the secondary
// links row that replaced the three demoted cards.
const routeStart = app.indexOf('id="splashDoors"');
const routeEnd = app.indexOf('id="splashAltRoutes"');
const routeBlock = routeStart > -1 && routeEnd > routeStart ? app.slice(routeStart, routeEnd) : null;
assert.ok(routeBlock, 'fixture guard: the splash route section must exist');

test('the landing has exactly one route card: Express Install', () => {
  // count the door itself, not its -icon/-title/-text/-desc children
  const doors = routeBlock.match(/class="splash-door(?:\s|")/g) || [];
  assert.equal(doors.length, 1, 'one primary card, not four equal ones');
  assert.match(routeBlock, /data-action="open-express-lane"/);
});

test('the Express card names the five-step flow it opens', () => {
  assert.match(routeBlock, /Service &rarr; device &rarr; resolution &rarr; key &rarr; Deploy/);
});

test('Advanced Builder and Update Existing are demoted to secondary text links', () => {
  const alt = app.match(/id="splashAltRoutes"[\s\S]{0,700}/)?.[0];
  assert.ok(alt, 'the secondary-links row must exist');
  assert.match(alt, /data-action="custom-start"/, 'Advanced Builder keeps its action for #advanced and the tour');
  assert.match(alt, /data-action="update-template"/, 'Update Existing keeps its action for #update');
  assert.match(alt, /class="splash-tertiary-btn"/, 'they reuse the existing tertiary link style — no new visual language');
  assert.ok(!/"splash-door[^"]*"[^>]*data-action="custom-start"/.test(routeBlock), 'Advanced Builder must not be a card');
  assert.ok(!/"splash-door[^"]*"[^>]*data-action="update-template"/.test(routeBlock), 'Update Existing must not be a card');
});

test('the Setup Genie card is removed from the landing but the route stays linked', () => {
  assert.ok(!routeBlock.includes('../tools/genies/'), 'no Genie card among the primary routes');
  const alt = app.match(/id="splashAltRoutes"[\s\S]{0,700}/)?.[0];
  assert.match(alt, /href="..\/tools\/genies\/"/, 'the Genie page stays one click away');
  // and the page itself still exists so the link cannot 404
  const genieIndex = new URL('../../tools/genies/index.html', import.meta.url);
  assert.ok(existsSync(genieIndex), 'tools/genies/index.html must keep existing');
});

test('the tour still finds the Express door where it expects it', () => {
  assert.match(app, /target:'\.splash-doors \[data-action="open-express-lane"\]'/);
});
