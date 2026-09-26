// Mirrored from the pinned AIOStreams contract. configuration-doctor.test.mjs
// compares these exports with generated upstream data so a release bump cannot
// silently leave this standalone tool behind.
export const DOCTOR_SORT_CRITERIA = Object.freeze(["quality","resolution","language","subtitle","visualTag","audioTag","audioChannel","streamType","encode","size","service","seeders","private","age","addon","regexPatterns","cached","library","keyword","streamExpressionMatched","streamExpressionScore","regexScore","seadex","bitrate","releaseGroup"]);
export const DOCTOR_RESOLUTIONS = Object.freeze(["2160p","1440p","1080p","720p","576p","480p","360p","240p","144p","Unknown"]);
export const DOCTOR_QUALITIES = Object.freeze(["BluRay REMUX","BluRay","WEB-DL","WEBRip","HDRip","HC HD-Rip","DVD REMUX","DVDRip","HDTV","CAM","TS","TC","SCR","Unknown"]);
export const DOCTOR_VISUAL_TAGS = Object.freeze(["HDR+DV","DV Only","HDR Only","HDR10+","HDR10","DV","HDR","HLG","10bit","3D","IMAX","AI","Upscaled","SDR","H-OU","H-SBS","Unknown"]);
export const DOCTOR_AUDIO_TAGS = Object.freeze(["Atmos","DD+","DD","DTS:X","DTS-HD MA","DTS-HD","DTS-ES","DTS","TrueHD","PCM","OPUS","FLAC","AAC","Unknown"]);
export const DOCTOR_AUDIO_CHANNELS = Object.freeze(["2.0","5.1","6.1","7.1","Unknown"]);

const SENSITIVE_KEY = /(?:api.?key|access.?token|authorization|auth.?key|password|secret|token)/i;
const SECRET_URL_PARAM = /(?:api_?key|token|auth|password|secret|key)=([^&#]+)/i;
const REMOVED_PRESETS = new Set(['torbox-search']);
const MAX_PAYLOAD_BYTES = 102400;
const WARN_PAYLOAD_BYTES = 92160;

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function unwrap(input) {
  if (Array.isArray(input)) {
    const found = input.find(v => v && typeof v === 'object' && (v.config || v.presets));
    return found ? unwrap(found) : { root: {}, config: {} };
  }
  if (!input || typeof input !== 'object') return { root: {}, config: {} };
  return input.config && typeof input.config === 'object'
    ? { root: input, config: input.config }
    : { root: input, config: input };
}

function bytes(value) {
  const text = JSON.stringify(value);
  return typeof TextEncoder === 'function' ? new TextEncoder().encode(text).length : text.length;
}

function finding(id, severity, title, detail, path = '', repair = null) {
  return Object.freeze({ id, severity, title, detail, path, repair });
}

function walk(value, visit, path = '$') {
  if (Array.isArray(value)) return value.forEach((item, i) => walk(item, visit, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    visit(key, child, childPath);
    walk(child, visit, childPath);
  }
}

/** Analyze without mutating or transmitting the input. */
export function diagnoseTemplate(input) {
  const { root, config } = unwrap(input);
  const findings = [];
  const add = (...args) => findings.push(finding(...args));

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return Object.freeze({ findings:[finding('invalid-root','blocker','No configuration object found','Import a JSON object containing `config`, or a bare AIOStreams config.','$')], summary:{blocker:1,warning:0,advisory:0,total:1}, payloadBytes:0, repairCount:0 });
  }

  const payloadBytes = bytes(root);
  if (payloadBytes > MAX_PAYLOAD_BYTES) add('payload-over-limit','blocker','Payload exceeds the AIOStreams save limit',`${Math.ceil(payloadBytes/1024)} KB exceeds the 100 KB limit.`,'$',{ type:'none' });
  else if (payloadBytes > WARN_PAYLOAD_BYTES) add('payload-near-limit','advisory','Payload is close to the save limit',`${Math.ceil(payloadBytes/1024)} KB of 100 KB is already used.`,'$');

  let secretCount = 0;
  walk(root, (key, value, path) => {
    const isPublicRpdb = key === 'rpdbApiKey' && value === 't0-free-rpdb';
    if (!isPublicRpdb && SENSITIVE_KEY.test(key) && typeof value === 'string' && value.trim()) {
      secretCount += 1;
      add(`secret:${path}`,'warning','Credential-shaped value is embedded','Sharing this file may expose a key, token, or password.',path,{ type:'redact-path', path });
    } else if (typeof value === 'string' && /^https?:\/\//i.test(value) && SECRET_URL_PARAM.test(value)) {
      secretCount += 1;
      add(`secret-url:${path}`,'warning','URL appears to contain a credential','Tokens in custom manifest URLs are easy to leak through reports or shared templates.',path,{ type:'redact-url', path });
    }
  });

  const presets = Array.isArray(config.presets) ? config.presets : [];
  if (!Array.isArray(config.presets)) add('missing-presets','blocker','Preset list is missing','AIOStreams has no addon definitions to query.','$.config.presets');

  const ids = new Map();
  presets.forEach((preset, index) => {
    const base = root.config ? '$.config.presets' : '$.presets';
    const path = `${base}[${index}]`;
    if (!preset || typeof preset !== 'object') {
      add(`invalid-preset:${index}`,'blocker','Invalid preset entry','Preset entries must be objects.',path,{ type:'remove-preset', index });
      return;
    }
    if (REMOVED_PRESETS.has(preset.type)) add(`removed-preset:${index}`,'blocker','Removed TorBox Search preset',`The preset type “${preset.type}” is rejected by current AIOStreams versions.`,`${path}.type`,{ type:'remove-preset', index });
    if (preset.enabled !== false && !preset.instanceId) add(`missing-instance:${index}`,'warning','Enabled preset has no instance ID','A stable unique ID is required for grouping, deduplication, and migration.',`${path}.instanceId`,{ type:'assign-instance', index });
    if (preset.instanceId) {
      const previous = ids.get(preset.instanceId);
      if (previous !== undefined) add(`duplicate-instance:${index}`,'blocker','Duplicate preset instance ID',`“${preset.instanceId}” is also used by preset ${previous + 1}.`,`${path}.instanceId`,{ type:'assign-instance', index });
      else ids.set(preset.instanceId, index);
    }
    const timeout = Number(preset.options?.timeout);
    if (Number.isFinite(timeout) && timeout > 15000) add(`long-timeout:${index}`,'warning','Very long addon timeout',`${Math.round(timeout/1000)} seconds can make a failed dependency hold the request open.`,`${path}.options.timeout`,{ type:'cap-timeout', index, value:10000 });
  });

  if (presets.filter(p => p?.enabled !== false).length > 20) add('addon-fanout','warning','High addon fan-out',`${presets.filter(p=>p?.enabled!==false).length} enabled presets increase rate-limit and timeout exposure.`,'$.config.presets');

  if (config.titleMatching?.mode === 'exact') add('exact-title','warning','Exact title matching can starve results','Alternate punctuation, translations, and release naming can all be valid.', '$.config.titleMatching.mode',{ type:'set', path:'titleMatching.mode', value:'fuzzy' });
  if (Number(config.titleMatching?.similarityThreshold) >= 0.9) add('strict-title-threshold','warning','Title similarity is very strict','A threshold at or above 0.90 can discard legitimate variations.','$.config.titleMatching.similarityThreshold',{ type:'set', path:'titleMatching.similarityThreshold', value:0.85 });
  for (const [field, label] of [['yearMatching','year'],['seasonEpisodeMatching','season/episode']]) {
    if (config[field]?.strict === true) add(`strict-${field}`,'warning',`Strict ${label} matching can hide valid releases`,'Metadata and release filenames do not always agree exactly.',`$.config.${field}.strict`,{ type:'set', path:`${field}.strict`, value:false });
  }

  const requiredLanguages = Array.isArray(config.requiredLanguages) ? config.requiredLanguages : [];
  if (requiredLanguages.length) add('required-languages','advisory','Required languages are a hard filter',`${requiredLanguages.join(', ')} must be detected or the stream is removed.`,'$.config.requiredLanguages');

  const expressions = [
    ...(config.includedStreamExpressions || []),
    ...(config.excludedStreamExpressions || []),
    ...(config.preferredStreamExpressions || []),
  ];
  expressions.forEach((expr, i) => {
    if (typeof expr?.expression === 'string' && /\bnot\s*\(/.test(expr.expression)) add(`legacy-not:${i}`,'blocker','SEL uses unsupported not()','Current expression syntax uses negate().','$.config.*StreamExpressions',{ type:'replace-sel-not' });
  });

  const rank = { blocker:0, warning:1, advisory:2 };
  findings.sort((a,b) => rank[a.severity]-rank[b.severity] || a.id.localeCompare(b.id));
  const summary = findings.reduce((out, item) => { out[item.severity] += 1; out.total += 1; return out; }, { blocker:0, warning:0, advisory:0, total:0 });
  return Object.freeze({ findings:Object.freeze(findings), summary:Object.freeze(summary), payloadBytes, repairCount:findings.filter(f=>f.repair && f.repair.type !== 'none').length, secretCount });
}

function setPath(root, dotted, value) {
  const parts = dotted.split('.');
  let cursor = root;
  for (let i=0; i<parts.length-1; i += 1) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  cursor[parts.at(-1)] = value;
}

function redactUrl(raw) {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) if (SENSITIVE_KEY.test(key) || /^(?:key|auth)$/i.test(key)) url.searchParams.set(key, '<redacted>');
    return url.toString();
  } catch { return '<redacted-url>'; }
}

/** Apply only explicitly selected, deterministic repair IDs to a clone. */
export function applyRepairs(input, selectedIds) {
  const output = clone(input);
  const { config } = unwrap(output);
  const diagnosis = diagnoseTemplate(output);
  const selected = new Set(selectedIds || []);
  const repairs = diagnosis.findings.filter(f => selected.has(f.id) && f.repair && f.repair.type !== 'none');
  const remove = new Set(repairs.filter(f=>f.repair.type==='remove-preset').map(f=>f.repair.index));

  for (const item of repairs) {
    const repair = item.repair;
    if (repair.type === 'set') setPath(config, repair.path, repair.value);
    if (repair.type === 'assign-instance' && config.presets?.[repair.index]) {
      const preset = config.presets[repair.index];
      const base = String(preset.type || 'preset').replace(/[^a-z0-9-]/gi,'-').toLowerCase();
      let id = `${base}-${repair.index+1}`;
      const used = new Set(config.presets.map(p=>p?.instanceId).filter(Boolean));
      while (used.has(id)) id += '-fixed';
      preset.instanceId = id;
    }
    if (repair.type === 'cap-timeout' && config.presets?.[repair.index]?.options) config.presets[repair.index].options.timeout = repair.value;
    if (repair.type === 'replace-sel-not') {
      for (const key of ['includedStreamExpressions','excludedStreamExpressions','preferredStreamExpressions']) {
        for (const expr of config[key] || []) if (typeof expr?.expression === 'string') expr.expression = expr.expression.replace(/\bnot\s*\(/g,'negate(');
      }
    }
  }
  if (remove.size && Array.isArray(config.presets)) config.presets = config.presets.filter((_, i) => !remove.has(i));

  // Credential findings use absolute display paths. Walk with the mutable parent
  // so array indexes and nested preset options are redacted correctly.
  if (repairs.some(r => r.repair.type === 'redact-path' || r.repair.type === 'redact-url')) {
    const selectedRepairIds = new Set(repairs.map(r=>r.id));
    const redactSelected = (value, path = '$') => {
      if (!value || typeof value !== 'object') return;
      for (const key of Object.keys(value)) {
        const childPath = Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`;
        if (selectedRepairIds.has(`secret:${childPath}`)) value[key] = '<redacted>';
        else if (selectedRepairIds.has(`secret-url:${childPath}`)) value[key] = redactUrl(value[key]);
        else redactSelected(value[key], childPath);
      }
    };
    redactSelected(output);
  }
  return output;
}

export function repairedJson(input, selectedIds) {
  return JSON.stringify(applyRepairs(input, selectedIds), null, 2);
}
