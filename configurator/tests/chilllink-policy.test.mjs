import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  MIN_CHILLLINK_AIOSTREAMS_VERSION,
  buildChillLinkUrl,
  chillLinkFromStremioManifest,
  chillLinkGate,
  chillLinkVersionDecision,
} from '../src/core/chilllink-policy.js';

const HOST = 'https://aiostreams.elfhosted.com';
const UUID = '11111111-2222-4333-8444-555555555555';
const EPWD = 'encrypted-password';

// ─── buildChillLinkUrl ───

test('buildChillLinkUrl mirrors the upstream /chilllink/:uuid/:epwd route shape', () => {
  assert.equal(
    buildChillLinkUrl({ host: HOST, uuid: UUID, encryptedPassword: EPWD }),
    `${HOST}/chilllink/${UUID}/${EPWD}`,
  );
});

test('buildChillLinkUrl keeps an origin with a path but drops the path', () => {
  assert.equal(
    buildChillLinkUrl({ host: 'https://example.com/aio/', uuid: UUID, encryptedPassword: EPWD }),
    `https://example.com/chilllink/${UUID}/${EPWD}`,
  );
});

test('buildChillLinkUrl accepts http for self-hosted LAN instances', () => {
  assert.equal(
    buildChillLinkUrl({ host: 'http://192.168.1.10:8080', uuid: UUID, encryptedPassword: EPWD }),
    `http://192.168.1.10:8080/chilllink/${UUID}/${EPWD}`,
  );
});

test('buildChillLinkUrl throws on a non-absolute host', () => {
  assert.throws(() => buildChillLinkUrl({ host: 'aiostreams.elfhosted.com', uuid: UUID, encryptedPassword: EPWD }), /absolute http/);
});

test('buildChillLinkUrl throws on non-http schemes', () => {
  assert.throws(() => buildChillLinkUrl({ host: `stremio://${UUID}`, uuid: UUID, encryptedPassword: EPWD }), /http\(s\)/);
});

test('buildChillLinkUrl throws on a malformed UUID', () => {
  assert.throws(() => buildChillLinkUrl({ host: HOST, uuid: 'not-a-uuid', encryptedPassword: EPWD }), /UUID/);
});

test('buildChillLinkUrl throws without a password — there is no keyless ChillLink route', () => {
  assert.throws(() => buildChillLinkUrl({ host: HOST, uuid: UUID, encryptedPassword: '' }), /encryptedPassword/);
  assert.throws(() => buildChillLinkUrl({ host: HOST, uuid: UUID }), /encryptedPassword/);
});

test('buildChillLinkUrl rejects a password segment that would split the path', () => {
  for (const bad of ['a/b', 'a?b', 'a#b']) {
    assert.throws(() => buildChillLinkUrl({ host: HOST, uuid: UUID, encryptedPassword: bad }), /path segment/);
  }
});

test('buildChillLinkUrl accepts URL-encoded password segments (the value the host returns)', () => {
  const encoded = encodeURIComponent('p@ss w0rd!');
  assert.equal(
    buildChillLinkUrl({ host: HOST, uuid: UUID, encryptedPassword: encoded }),
    `${HOST}/chilllink/${UUID}/${encoded}`,
  );
});

// ─── chillLinkFromStremioManifest ───

test('chillLinkFromStremioManifest derives the ChillLink base from a Stremio manifest URL', () => {
  const stremio = `${HOST}/stremio/${UUID}/${EPWD}/manifest.json`;
  assert.equal(chillLinkFromStremioManifest(stremio), `${HOST}/chilllink/${UUID}/${EPWD}`);
});

test('chillLinkFromStremioManifest ignores query/hash suffixes', () => {
  const stremio = `${HOST}/stremio/${UUID}/${EPWD}/manifest.json?foo=1#x`;
  assert.equal(chillLinkFromStremioManifest(stremio), `${HOST}/chilllink/${UUID}/${EPWD}`);
});

test('chillLinkFromStremioManifest returns null for the keyless /stremio/uuid/manifest.json form', () => {
  assert.equal(chillLinkFromStremioManifest(`${HOST}/stremio/${UUID}/manifest.json`), null);
});

test('chillLinkFromStremioManifest returns null for non-stremio, garbage and empty input', () => {
  assert.equal(chillLinkFromStremioManifest(`${HOST}/chilllink/${UUID}/${EPWD}`), null);
  assert.equal(chillLinkFromStremioManifest('not a url'), null);
  assert.equal(chillLinkFromStremioManifest(''), null);
  assert.equal(chillLinkFromStremioManifest(null), null);
  assert.equal(chillLinkFromStremioManifest(undefined), null);
});

test('chillLinkFromStremioManifest returns null when the UUID is malformed', () => {
  assert.equal(chillLinkFromStremioManifest(`${HOST}/stremio/nope/${EPWD}/manifest.json`), null);
});

// ─── chillLinkGate ───

test('chillLinkGate blocks P2P — ChillLink drops torrent streams upstream', () => {
  const decision = chillLinkGate({ service: 'p2p' });
  assert.equal(decision.status, 'blocked');
  assert.equal(decision.reasons.length, 1);
  assert.match(decision.reasons[0], /P2P/);
});

test('chillLinkGate passes every service class the ChillLink transformer supports', () => {
  for (const service of ['http', 'torbox', 'realdebrid', 'easynews', undefined]) {
    assert.deepEqual(chillLinkGate({ service }), { status: 'ok', reasons: [] }, `service ${service} should pass`);
  }
});

// ─── chillLinkVersionDecision ───

test('chillLinkVersionDecision blocks releases older than the ChillLink floor', () => {
  assert.equal(chillLinkVersionDecision('2.19.0').status, 'blocked');
  assert.equal(chillLinkVersionDecision('2.20.0').status, 'ok');
  assert.equal(chillLinkVersionDecision('2.36.0').status, 'ok');
});

test('chillLinkVersionDecision never blocks on an unknown version', () => {
  assert.deepEqual(chillLinkVersionDecision(null), { status: 'ok', reasons: [] });
  assert.deepEqual(chillLinkVersionDecision(undefined), { status: 'ok', reasons: [] });
});

test('ChillLink floor is the AIOStreams release that merged PR #586 (2.20.0)', () => {
  assert.equal(MIN_CHILLLINK_AIOSTREAMS_VERSION, '2.20.0');
});

// ─── app.js wiring (text-level: the 8.5k-line integration layer has no DOM harness here) ───

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('app.js imports and invokes the ChillLink policy', () => {
  assert.match(app, /import \{[^}]*chillLinkFromStremioManifest[^}]*\} from '\.\.\/core\/chilllink-policy\.js'/);
  assert.match(app, /chillLinkGate\(\{ service: S\.service \}\)/);
  assert.match(app, /if \(target === 'chillio'\)/);
});

test('app.js gates the chillio path on the probed host version', () => {
  assert.match(app, /chillLinkVersionDecision\(currentHostCapabilities\(\)\?\.version\)/);
});

test('app.js only imports policy functions it calls (no dead imports)', () => {
  const importLine = app.match(/import \{([^}]*)\} from '\.\.\/core\/chilllink-policy\.js'/);
  assert.ok(importLine, 'policy import found');
  for (const name of ['chillLinkFromStremioManifest', 'chillLinkGate', 'chillLinkVersionDecision']) {
    assert.ok(importLine[1].includes(name), `imports ${name}`);
  }
  assert.ok(!importLine[1].includes('buildChillLinkUrl'), 'buildChillLinkUrl is module-internal API, not an app.js import');
});

test('app.js offers Chillio in both deploy rows, the Express lane and the manifest modal', () => {
  assert.equal((app.match(/data-target="chillio"/g) || []).length, 2, 'desktop + mobile deploy buttons');
  assert.ok(app.includes("['chillio','Chillio','ChillLink URL']"), 'Express lane tile');
  assert.ok(app.includes("key:'chillio'"), 'manifest modal formatter tab');
  assert.ok(app.includes("chillio:'Chillio'"), 'Express target name map');
  assert.ok(app.includes('ICO.chillio'), 'chillio icon used');
});

test('app.js links the official ChillLink helper tools in the Chillio tab', () => {
  for (const path of ['https://link.chillio.app/manifest-merger', 'https://link.chillio.app/editor', 'https://link.chillio.app/validator']) {
    assert.ok(app.includes(path), `missing ${path}`);
  }
});
