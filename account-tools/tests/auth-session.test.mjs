import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setSession,
  clearSession,
  getAuthKey,
  getEmail,
  isAuthenticated,
  onSessionChange,
} from '../src/auth-session.js';

test('session: starts unauthenticated', () => {
  clearSession();
  assert.ok(!isAuthenticated());
  assert.equal(getAuthKey(), null);
  assert.equal(getEmail(), null);
});

test('session: setSession stores auth key and email', () => {
  setSession('test-key-123', 'user@example.com');
  assert.ok(isAuthenticated());
  assert.equal(getAuthKey(), 'test-key-123');
  assert.equal(getEmail(), 'user@example.com');
});

test('session: clearSession removes credentials', () => {
  setSession('key', 'email');
  clearSession();
  assert.ok(!isAuthenticated());
  assert.equal(getAuthKey(), null);
  assert.equal(getEmail(), null);
});

test('session: onSessionChange fires on set', () => {
  clearSession();
  let called = false;
  const unsub = onSessionChange(({ authKey, email }) => {
    called = true;
    assert.equal(authKey, 'new-key');
    assert.equal(email, 'new@test.com');
  });
  setSession('new-key', 'new@test.com');
  assert.ok(called);
  unsub();
  clearSession();
});

test('session: onSessionChange fires on clear', () => {
  setSession('key', 'email');
  let called = false;
  const unsub = onSessionChange(({ authKey }) => {
    called = true;
    assert.equal(authKey, null);
  });
  clearSession();
  assert.ok(called);
  unsub();
});

test('session: unsubscribe stops notifications', () => {
  clearSession();
  let count = 0;
  const unsub = onSessionChange(() => count++);
  setSession('a', 'b');
  unsub();
  setSession('c', 'd');
  assert.equal(count, 1);
  clearSession();
});

test('session: auth key without email', () => {
  clearSession();
  setSession('auth-key-only');
  assert.ok(isAuthenticated());
  assert.equal(getEmail(), null);
  clearSession();
});
