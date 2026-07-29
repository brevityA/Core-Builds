import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  '../src/js/app.js',
  '../e2e/golden/torbox-4k-apex-mixed.json',
  '../e2e/golden/torbox-mixed-apex-mixed.json',
];

test('adaptive 4K HDR expression does not contain the malformed extra parenthesis', async () => {
  for (const file of files) {
    const text = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.equal(text.includes(': ((count(bitrate('), false, `${file} contains malformed ternary grouping`);
    assert.equal(text.includes('*0.01))))>=1 ?'), false, `${file} contains malformed fallback grouping`);
    if (text.includes('4K WEB-DL HDR')) {
      assert.equal(text.includes('*0.01)))))>=1 ?'), true, `${file} is missing fallback condition grouping`);
      assert.equal(text.includes('*0.01))) : []'), true, `${file} is missing fallback result grouping`);
    }
  }
});
