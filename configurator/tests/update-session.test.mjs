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
