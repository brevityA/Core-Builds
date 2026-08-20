export function initTvNav(root) {
  const onKey = (event) => {
    if (isEditing(event.target)) return;
    const map = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      Enter: 'ok', Escape: 'back',
    };
    const dir = map[event.key];
    if (!dir) return;
    if (dir === 'ok') {
      const el = document.activeElement;
      if (el && el.classList.contains('focusable')) {
        event.preventDefault();
        el.click();
      }
      return;
    }
    if (dir === 'back') {
      const close = root.querySelector('[data-action="close-settings"]');
      if (close && !document.getElementById('drawer').hidden) {
        event.preventDefault();
        close.click();
      }
      return;
    }
    const next = nearest(document.activeElement, dir);
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };
  window.addEventListener('keydown', onKey);
  if (!document.activeElement || document.activeElement === document.body) {
    root.querySelector('.focusable')?.focus();
  }
  return () => window.removeEventListener('keydown', onKey);
}

function nearest(current, dir) {
  const nodes = [...document.querySelectorAll('.focusable')].filter((el) => visible(el));
  if (!nodes.length) return null;
  if (!current || !nodes.includes(current)) return nodes[0];
  const a = box(current);
  let best = null;
  let bestScore = Infinity;
  for (const node of nodes) {
    if (node === current) continue;
    const b = box(node);
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const aligned = Math.abs(dir === 'left' || dir === 'right' ? dy : dx);
    if (dir === 'left' && dx >= -4) continue;
    if (dir === 'right' && dx <= 4) continue;
    if (dir === 'up' && dy >= -4) continue;
    if (dir === 'down' && dy <= 4) continue;
    const along = Math.abs(dir === 'left' || dir === 'right' ? dx : dy);
    const score = along + aligned * 2.4;
    if (score < bestScore) {
      bestScore = score;
      best = node;
    }
  }
  return best;
}

function box(el) {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

function visible(el) {
  if (el.disabled) return false;
  if (el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function isEditing(el) {
  if (!el || el === document.body) return false;
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'textarea' || tag === 'select') return true;
  if (tag === 'input') {
    const type = (el.type || 'text').toLowerCase();
    return !['button', 'submit', 'checkbox', 'radio', 'range'].includes(type);
  }
  return Boolean(el.isContentEditable);
}
