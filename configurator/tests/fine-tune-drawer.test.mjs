import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/06-features.css', import.meta.url), 'utf8');

test('Fine-Tune opens as a pop-out without replacing the wizard main content', () => {
  assert.ok(app.includes("import { FORMATTERS, AUDIO_HELP }"));
  assert.ok(app.includes("if (action === 'open-advanced') openAdvancedDrawer(el)"));
  assert.ok(app.includes("overlay.id = 'advancedDrawer'"));
  assert.ok(!app.includes("main.innerHTML = renderAdvancedPanel();\n    nav.style.display = 'none'"));
});

test('Fine-Tune has resilient close paths and preserves the underlying step', () => {
  assert.ok(app.includes("if (event.target === overlay) closeAdvancedDrawer()"));
  assert.ok(app.includes("if (event.key === 'Escape')"));
  assert.ok(app.includes("if (action === 'close-advanced') closeAdvancedDrawer()"));
  assert.ok(app.includes("showToast('Fine-Tune could not open — your setup is still safe'"));
});

test('Fine-Tune drawer supports desktop, mobile, light mode and reduced motion', () => {
  assert.match(css, /\.advanced-drawer-overlay\{/);
  assert.match(css, /\[data-theme='light'\] \.advanced-drawer-panel/);
  assert.match(css, /@media\(max-width:599px\).*\.advanced-drawer-panel/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\).*\.advanced-drawer-panel/);
});
