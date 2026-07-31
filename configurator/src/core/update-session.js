/** Pure transactional update-session helpers. */

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createUpdateSession(currentState = {}, importedState = {}, preview = null) {
  return {
    status: 'preview',
    committed: false,
    currentState: clone(currentState),
    importedState: clone(importedState),
    preview: preview ? clone(preview) : null,
  };
}

export function commitUpdate(session, nextState) {
  if (!session || session.status !== 'preview') throw new Error('Update session is not awaiting confirmation');
  return {
    ...session,
    status: 'committed',
    committed: true,
    nextState: clone(nextState),
  };
}

export function cancelUpdate(session) {
  if (!session || session.status !== 'preview') throw new Error('Update session is not awaiting confirmation');
  return {
    ...session,
    status: 'cancelled',
    committed: false,
    nextState: undefined,
  };
}

export function canCommit(session) {
  return Boolean(session && session.status === 'preview' && !session.committed);
}
