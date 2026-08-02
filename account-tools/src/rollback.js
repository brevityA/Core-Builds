const MAX_HISTORY = 10;
let _history = [];

export function pushSnapshot(addons, label = 'auto') {
  if (!Array.isArray(addons) || addons.length === 0) return;
  _history.push({
    addons: JSON.parse(JSON.stringify(addons)),
    label,
    timestamp: new Date().toISOString(),
  });
  if (_history.length > MAX_HISTORY) _history.shift();
}

export function popSnapshot() {
  if (_history.length === 0) return null;
  return _history.pop();
}

export function peekSnapshot() {
  if (_history.length === 0) return null;
  return _history[_history.length - 1];
}

export function getHistory() {
  return _history.map(({ label, timestamp, addons }) => ({
    label,
    timestamp,
    addonCount: addons.length,
  }));
}

export function canUndo() {
  return _history.length > 0;
}

export function clearHistory() {
  _history = [];
}
