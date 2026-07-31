import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/js/app.js', import.meta.url), 'utf8');

test('max file size uses a lower bound plus the selected upper bound', () => {
  assert.match(app, /size\(streams,'1B','\$\{S\.sizeLimit\}GB'\)/);
  assert.doesNotMatch(app, /size\(streams,'\$\{mb\}MB','999999GB'\)/);
});
