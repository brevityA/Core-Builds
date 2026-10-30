#!/usr/bin/env node
// Compile the Core Builds smart template: one AIOStreams template that asks the
// questions in dimensions.mjs and resolves, through AIOStreams' own template
// directives, to exactly what packages/core generateTemplate() builds for those
// answers and the service picked in the AIOStreams wizard.
//
// How: build every combination, then emit each config value as a __switch tree
// over only the questions it depends on. Presets are aligned by instanceId and
// carry an __if naming the services and answers they appear for.
//
//   node scripts/smart-template/compile.mjs           # write Templates/Smart/core-builds.json
//   node scripts/smart-template/compile.mjs --stdout  # print instead
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateTemplate } from '../../packages/core/src/index.js';
import { DIMS, INPUTS, SERVICES, combinations, generatorInput } from './dimensions.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const OUT_PATH = 'Templates/Smart/core-builds.json';
export const RAW_URL = `https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/${OUT_PATH}`;
// Bump when the compiled output changes; AIOStreams offers the update to users who imported it.
export const TEMPLATE_VERSION = '1.0.0';

const SIZES = DIMS.map(d => d.values.length);
const STRIDES = SIZES.map((_, i) => SIZES.slice(i + 1).reduce((a, b) => a * b, 1));
const N = SIZES.reduce((a, b) => a * b, 1);
const digit = (c, d) => Math.floor(c / STRIDES[d]) % SIZES[d];
const ABSENT = 0;            // id 0 in every table: the key or item is not there
const DONT_CARE = -1;        // the parent is absent, so any value will do

// A value is interned per node as a small integer id; table[id] is the value.
class Fn {
  constructor() { this.ids = new Int32Array(N); this.table = [undefined]; this.index = new Map(); }
  set(c, value) {
    if (value === undefined) { this.ids[c] = ABSENT; return; }
    const key = JSON.stringify(value);
    let id = this.index.get(key);
    if (id === undefined) { id = this.table.length; this.table.push(value); this.index.set(key, id); }
    this.ids[c] = id;
  }
}

const DIRECTIVE = /"__(if|value|switch|remove)"|\{\{(inputs|services)/;

function buildAll() {
  const keyFns = new Map();
  let c = 0;
  for (const [answers, serviceId] of combinations()) {
    const cfg = generateTemplate(generatorInput(answers, serviceId)).config;
    // The AIOStreams wizard adds the picked services itself, enabled with empty credentials.
    const want = serviceId ? [{ id: serviceId, enabled: true, credentials: {} }] : [];
    if (JSON.stringify(cfg.services) !== JSON.stringify(want)) throw new Error(`unexpected services for ${serviceId}: ${JSON.stringify(cfg.services)}`);
    delete cfg.services;
    const text = JSON.stringify(cfg);
    if (DIRECTIVE.test(text)) throw new Error('generated config contains template directive syntax');
    for (const k of Object.keys(cfg)) { if (!keyFns.has(k)) keyFns.set(k, new Fn()); }
    for (const [k, fn] of keyFns) fn.set(c, cfg[k]);
    c++;
  }
  return keyFns;
}

/** True if, within `list`, two combos differing only in dim d have different known values. */
function dependsOn(ids, list, d) {
  const seen = new Map();
  for (const c of list) {
    const id = ids[c];
    if (id === DONT_CARE) continue;
    const other = c - digit(c, d) * STRIDES[d];
    const prev = seen.get(other);
    if (prev === undefined) seen.set(other, id);
    else if (prev !== id) return true;
  }
  return false;
}

const leaf = v => (v === undefined ? { __remove: true } : v);
const caseKey = v => String(v);

function tree(fn, list, dimStart) {
  const known = new Set();
  for (const c of list) if (fn.ids[c] !== DONT_CARE) known.add(fn.ids[c]);
  if (known.size === 0) return null;
  if (known.size === 1) return leaf(fn.table[[...known][0]]);
  for (let d = dimStart; d < DIMS.length; d++) {
    if (!dependsOn(fn.ids, list, d)) continue;
    const groups = DIMS[d].values.map(() => []);
    for (const c of list) groups[digit(c, d)].push(c);
    const children = groups.map(g => tree(fn, g, d + 1));
    return switchNode(d, children);
  }
  throw new Error('value varies but depends on no dimension');
}

function switchNode(d, children) {
  const dim = DIMS[d];
  const counts = new Map();
  children.forEach((ch, i) => {
    if (ch === null) return;
    // The service default also serves several services at once, so never default to P2P.
    if (dim.id === 'service' && dim.values[i] === '') return;
    const k = JSON.stringify(ch);
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  const nonNull = children.filter(ch => ch !== null);
  const defKey = counts.size ? [...counts].sort((a, b) => b[1] - a[1])[0][0] : JSON.stringify(nonNull[0]);
  const cases = {};
  children.forEach((ch, i) => { if (ch !== null && JSON.stringify(ch) !== defKey) cases[caseKey(dim.values[i])] = ch; });
  const def = JSON.parse(defKey);
  if (!Object.keys(cases).length) return def;
  return { __switch: dim.ref, cases, default: def };
}

const ALL = Int32Array.from({ length: N }, (_, i) => i);
const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Compile a value function, descending into objects whose shape holds wherever they exist. */
function compile(fn, list = ALL) {
  const known = new Set();
  for (const c of list) if (fn.ids[c] !== DONT_CARE) known.add(fn.ids[c]);
  const vals = [...known].map(id => fn.table[id]);
  if (vals.length > 1 && vals.every(isPlainObject) && vals.some(v => Object.keys(v).length)) {
    const keys = [...new Set(vals.flatMap(v => Object.keys(v)))];
    const out = {};
    for (const k of keys) {
      const sub = new Fn();
      for (const c of list) { if (fn.ids[c] === DONT_CARE) sub.ids[c] = DONT_CARE; else sub.set(c, fn.table[fn.ids[c]][k]); }
      const node = compile(sub, list);
      if (node !== null) out[k] = node;
    }
    return out;
  }
  return tree(fn, list, 0);
}

// ── presence formulas (__if) ────────────────────────────────────────────────
function atom(d, v) {
  const dim = DIMS[d];
  if (dim.id === 'service') return v === '' ? '!services' : `services.${v}`;
  if (typeof v === 'boolean') return v ? dim.ref : `!${dim.ref}`;
  return `${dim.ref} == ${v}`;
}

function presenceFormula(bits) {
  const fn = { ids: bits };
  const deps = DIMS.map((_, d) => d).filter(d => dependsOn(bits, ALL, d));
  if (!deps.length) return bits[0] ? '' : null;
  // Every true assignment of the dims it depends on, then merge terms that cover a whole dim.
  let terms = [];
  const walk = (i, c, term) => {
    if (i === deps.length) { if (bits[c]) terms.push(term); return; }
    const d = deps[i];
    DIMS[d].values.forEach((_, v) => walk(i + 1, c + v * STRIDES[d], { ...term, [d]: v }));
  };
  walk(0, 0, {});
  let merged = true;
  while (merged) {
    merged = false;
    for (const d of deps) {
      const byRest = new Map();
      for (const t of terms) {
        if (!(d in t)) continue;
        const { [d]: _, ...rest } = t;
        const k = JSON.stringify(rest);
        (byRest.get(k) || byRest.set(k, { rest, vals: new Set() }).get(k)).vals.add(t[d]);
      }
      for (const { rest, vals } of byRest.values()) {
        if (vals.size !== SIZES[d]) continue;
        terms = terms.filter(t => !(d in t && JSON.stringify((({ [d]: _, ...r }) => r)(t)) === JSON.stringify(rest)));
        terms.push(rest);
        merged = true;
      }
      if (merged) break;
    }
  }
  if (terms.some(t => !Object.keys(t).length)) return '';
  return terms.map(t => Object.entries(t).map(([d, v]) => atom(+d, DIMS[+d].values[v])).join(' and ')).join(' or ');
}

function compilePresets(fn) {
  // One order that every generated preset list agrees with.
  const after = new Map();
  const first = new Map();
  let n = 0;
  for (const arr of fn.table.slice(1)) {
    const seen = new Set();
    arr.forEach((p, i) => {
      if (!p.instanceId || seen.has(p.instanceId)) throw new Error(`preset without a unique instanceId: ${JSON.stringify(p).slice(0, 80)}`);
      seen.add(p.instanceId);
      if (!first.has(p.instanceId)) first.set(p.instanceId, n++);
      if (!after.has(p.instanceId)) after.set(p.instanceId, new Set());
      if (i > 0) after.get(p.instanceId).add(arr[i - 1].instanceId);
    });
  }
  const order = [];
  const placed = new Set();
  const pending = [...first.keys()].sort((a, b) => first.get(a) - first.get(b));
  while (pending.length) {
    const i = pending.findIndex(id => [...after.get(id)].every(p => placed.has(p)));
    if (i < 0) throw new Error('preset order differs between builds');
    const [id] = pending.splice(i, 1);
    order.push(id); placed.add(id);
  }
  return order.map(instanceId => {
    const item = new Fn();
    const bits = new Int32Array(N);
    for (let c = 0; c < N; c++) {
      const p = fn.table[fn.ids[c]].find(x => x.instanceId === instanceId);
      if (p) { item.set(c, p); bits[c] = 1; } else item.ids[c] = DONT_CARE;
    }
    const node = compile(item);
    const cond = presenceFormula(bits);
    const isSwitch = isPlainObject(node) && '__switch' in node;
    if (cond === '') return isSwitch ? { __value: node } : node;
    return isSwitch ? { __if: cond, __value: node } : { __if: cond, ...node };
  });
}

export function compileSmartTemplate() {
  const keyFns = buildAll();
  const config = {};
  for (const [k, fn] of keyFns) {
    const node = k === 'presets' ? compilePresets(fn) : compile(fn);
    if (node !== null) config[k] = node;
  }
  // The wizard fills these with the picked services.
  config.services = [];
  return {
    metadata: {
      id: 'core-builds',
      name: 'Core Builds',
      description: 'One Core Builds setup for any device and service. Answer a few questions (device, picture, what matters most, language) and pick your service; you get the same config the Core Builds configurator would build.',
      author: 'Brevity',
      version: TEMPLATE_VERSION,
      category: 'Debrid',
      services: SERVICES.map(([id]) => id),
      serviceRequired: false,
      setToSaveInstallMenu: true,
      sourceUrl: RAW_URL,
      changelogUrl: 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/CHANGELOG.md',
      inputs: INPUTS,
    },
    config,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const tpl = compileSmartTemplate();
  const text = JSON.stringify(tpl, null, 2) + '\n';
  if (process.argv.includes('--stdout')) process.stdout.write(text);
  else {
    mkdirSync(dirname(ROOT + OUT_PATH), { recursive: true });
    writeFileSync(ROOT + OUT_PATH, text);
    console.error(`wrote ${OUT_PATH}: ${(text.length / 1024).toFixed(1)} KB from ${N} builds in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
