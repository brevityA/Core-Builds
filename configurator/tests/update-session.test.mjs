import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpdateSession, commitUpdate, cancelUpdate, canCommit } from '../src/core/update-session.js';

test('update preview does not mutate the current state', () => {
  const current = { service:'torbox', creds:{ torbox:'secret' } };
  const imported = { service:'realdebrid' };
  const session = createUpdateSession(current, imported, { changed:true });
  imported.service = 'easynews';
  assert.equal(session.importedState.service, 'realdebrid');
  assert.equal(session.currentState.service, 'torbox');
  assert.equal(canCommit(session), true);
});

test('preview clones are independent of source objects', () => {
  const current = { service:'torbox', nested:{ key:'val' } };
  const imported = { service:'realdebrid', nested:{ key:'val2' } };
  const preview = { diff:['sort'], meta:{ count:3 } };
  const session = createUpdateSession(current, imported, preview);
  current.nested.key = 'mutated';
  imported.nested.key = 'mutated';
  preview.meta.count = 999;
  assert.equal(session.currentState.nested.key, 'val');
  assert.equal(session.importedState.nested.key, 'val2');
  assert.equal(session.preview.meta.count, 3);
});

test('cancel leaves the session uncommitted and has no next state', () => {
  const session = createUpdateSession({ service:'torbox' }, { service:'realdebrid' });
  const cancelled = cancelUpdate(session);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.committed, false);
  assert.equal(cancelled.nextState, undefined);
});

test('commit is explicit and clones the resulting state', () => {
  const session = createUpdateSession({ service:'torbox' }, { service:'realdebrid' });
  const next = { service:'realdebrid', creds:{ realdebrid:'secret' } };
  const committed = commitUpdate(session, next);
  next.service = 'easynews';
  assert.equal(committed.status, 'committed');
  assert.equal(committed.committed, true);
  assert.equal(committed.nextState.service, 'realdebrid');
  assert.equal(canCommit(committed), false);
});

test('double commit throws', () => {
  const session = createUpdateSession({ service:'torbox' }, { service:'realdebrid' });
  const committed = commitUpdate(session, { service:'realdebrid' });
  assert.throws(() => commitUpdate(committed, { service:'easynews' }), /not awaiting confirmation/i);
});

test('commit after cancel throws', () => {
  const session = createUpdateSession({ service:'torbox' }, { service:'realdebrid' });
  const cancelled = cancelUpdate(session);
  assert.throws(() => commitUpdate(cancelled, { service:'easynews' }), /not awaiting confirmation/i);
});

test('cancel after commit throws', () => {
  const session = createUpdateSession({ service:'torbox' }, { service:'realdebrid' });
  const committed = commitUpdate(session, { service:'realdebrid' });
  assert.throws(() => cancelUpdate(committed), /not awaiting confirmation/i);
});

test('canCommit returns false for null/undefined/non-object', () => {
  assert.equal(canCommit(null), false);
  assert.equal(canCommit(undefined), false);
  assert.equal(canCommit('string'), false);
});
