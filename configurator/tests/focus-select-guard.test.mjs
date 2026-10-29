import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSrc = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('the select-on-focus helper only selects an input that still has focus', () => {
  // select() focuses the input. Run 50 ms after focusin without this check, it pulled
  // focus back from the next field, so autofill or fast tabbing typed into the wrong box
  // (Quick install: the Stremio password landed in the email field and the install stalled).
  const handler = appSrc.slice(appSrc.indexOf("document.addEventListener('focusin'"), appSrc.indexOf("document.addEventListener('focusin'") + 900);
  assert.match(handler, /document\.activeElement === e\.target && e\.target\.value/);
});
