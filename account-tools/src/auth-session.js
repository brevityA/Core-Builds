let _authKey = null;
let _email = null;
const _listeners = new Set();

export function setSession(authKey, email = null) {
  _authKey = authKey;
  _email = email;
  _notify();
}

export function clearSession() {
  _authKey = null;
  _email = null;
  _notify();
}

export function getAuthKey() {
  return _authKey;
}

export function getEmail() {
  return _email;
}

export function isAuthenticated() {
  return _authKey !== null;
}

export function onSessionChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _notify() {
  for (const fn of _listeners) {
    try { fn({ authKey: _authKey, email: _email }); } catch {}
  }
}
