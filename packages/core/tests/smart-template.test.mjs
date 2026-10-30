// The smart template (Templates/Smart/core-builds.json) must resolve, through
// AIOStreams' own template evaluator, to exactly what generateTemplate() builds
// for the same answers and service. The evaluator is AGPL, so it is fetched at
// the pinned release instead of copied into this MIT repo. Node 22 runs the .ts
// file directly (its type annotations are stripped).
//
// A stale template fails here: regenerate with node scripts/smart-template/compile.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateTemplate } from '../src/index.js';
import { DIMS, LANGUAGES, SERVICES, combinations, generatorInput } from '../../../scripts/smart-template/dimensions.mjs';

const ROOT = new URL('../../../', import.meta.url);
const template = JSON.parse(readFileSync(new URL('Templates/Smart/core-builds.json', ROOT), 'utf8'));
const pin = JSON.parse(readFileSync(new URL('configurator/UPSTREAM.pin', ROOT), 'utf8'));
const EVALUATOR = `${pin.rawBase}/${pin.sha}/packages/frontend/src/lib/templates/processors/conditionals.ts`;

async function loadEvaluator() {
  try {
    const res = await fetch(EVALUATOR, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const file = join(mkdtempSync(join(tmpdir(), 'aio-eval-')), 'conditionals.ts');
    writeFileSync(file, await res.text());
    return await import(pathToFileURL(file).href);
  } catch (err) {
    if (process.env.CI) throw new Error(`could not load the AIOStreams evaluator at the pin: ${err.message}`);
    return null;
  }
}
const evaluator = await loadEvaluator();
const skip = evaluator ? false : 'AIOStreams evaluator unreachable (offline); CI requires it';

// What the AIOStreams wizard does after the conditionals (buildTemplateConfig in
// packages/frontend/src/hooks/templates/wizard.ts): add each picked service, enabled.
function resolve(answers, selected) {
  const cfg = evaluator.applyTemplateConditionals(structuredClone(template.config), answers, selected);
  cfg.services ||= [];
  for (const id of selected) if (!cfg.services.some(s => s.id === id)) cfg.services.push({ id, enabled: true, credentials: {} });
  for (const s of cfg.services) if (!selected.includes(s.id)) s.enabled = false;
  return cfg;
}

test('every answer and service resolves to the generator output', { skip }, () => {
  // Each combination of every question and service once; the language cycles
  // through all of them. The compiler itself reads the full product, languages included.
  const noLang = DIMS.filter(d => d.id !== 'language');
  let i = 0;
  for (const [answers, service] of combinations(noLang)) {
    answers.language = LANGUAGES[i++ % LANGUAGES.length];
    const want = generateTemplate(generatorInput(answers, service)).config;
    const got = resolve(answers, service ? [service] : []);
    assert.deepStrictEqual(got, want, `${service || 'p2p'} ${JSON.stringify(answers)}`);
  }
  assert.ok(i > 10000, `swept ${i} combinations`);
});

test('two services at once give one valid config with both services', { skip }, () => {
  const answers = { device: 'generic', resolution: '4k', profile: 'balanced', cachedOnly: false, anime: true, language: 'English' };
  const ids = SERVICES.map(([id]) => id);
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
    const pick = [ids[a], ids[b]];
    const cfg = resolve(answers, pick);
    const instanceIds = cfg.presets.map(p => p.instanceId);
    assert.equal(new Set(instanceIds).size, instanceIds.length, `duplicate preset for ${pick}`);
    for (const one of pick) {
      for (const p of generateTemplate(generatorInput(answers, one)).config.presets) {
        assert.ok(instanceIds.includes(p.instanceId), `${pick}: ${p.instanceId} from ${one} missing`);
      }
    }
    assert.deepEqual(cfg.services.map(s => s.id), pick);
    assert.ok(cfg.presets.every(p => typeof p.options?.name === 'string' && p.type), `${pick}: unresolved preset`);
    assert.doesNotMatch(JSON.stringify(cfg), /"__(if|value|switch|remove)"|\{\{inputs/, `${pick}: directive left over`);
  }
});

test('the template stays small and declares only questions it uses', () => {
  const size = JSON.stringify(template).length;
  assert.ok(size < 1_500_000, `${size} bytes`);
  const used = new Set(JSON.stringify(template.config).match(/inputs\.[a-zA-Z]+/g).map(s => s.slice(7)));
  const declared = template.metadata.inputs.map(i => i.id);
  for (const id of used) assert.ok(declared.includes(id), `undeclared input ${id}`);
  assert.deepEqual(template.metadata.services, SERVICES.map(([id]) => id));
  assert.equal(template.metadata.serviceRequired, false, 'no service means the free P2P setup');
  assert.ok(template.metadata.author.length <= 20 && template.metadata.category.length <= 20);
});

test('the collection entry resolves exactly like the template and carries the static templates\' trust', { skip }, () => {
  const [entry, ...rest] = JSON.parse(readFileSync(new URL('core-builds-template-collection.json', ROOT), 'utf8'));
  assert.equal(rest.length, 0, 'the collection holds only the smart template');
  assert.deepEqual(entry.metadata, template.metadata);
  const trusted = Object.entries(entry.config).filter(([, v]) => v?.cases?.['core-builds-trust']);
  assert.ok(trusted.some(([k]) => k === 'rankedRegexPatterns') && trusted.some(([k]) => k === 'syncedRankedRegexUrls'));
  const run = (config, answers, selected) => evaluator.applyTemplateConditionals(structuredClone(config), answers, selected);
  const answers = { device: 'shield', resolution: '1080p', profile: 'maximum', cachedOnly: true, anime: false, language: 'Spanish' };
  for (const selected of [[], ['torbox'], ['realdebrid', 'alldebrid'], ['easynews'], ['torbox', 'easynews']]) {
    assert.deepStrictEqual(run(entry.config, answers, selected), run(template.config, answers, selected), `${selected}`);
  }
});
