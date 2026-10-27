#!/usr/bin/env node
// Community addon directory drift watch (stremio-addons.net).
//
// The configurator routes installs to a hand-audited host registry
// (configurator/src/data/hosts.js). The community directory at
// stremio-addons.net keeps its own moderated list of public AIOStreams
// instances, exposed through an experimental read-only API
// (https://docs.stremio-addons.net/developers/api, CORS *, no stability
// guarantee). This script diffs the directory's approved AIOStreams instance
// origins against the registry so a newly listed public host cannot ship for
// weeks before anyone notices.
//
// Advisory only: the directory is neither authoritative nor complete (several
// routed hosts are simply unlisted there), so nothing here blocks a build or
// edits generated files. Findings are reported as a markdown issue by the
// addon-directory-drift workflow, and any candidate host still needs the normal
// capability / regex / stream-type audit before joining HOST_BASE_URLS.
//
//   node scripts/check-addon-directory-drift.mjs [--output reports/addon-directory-drift.md]
//
// Exit codes: 0 = no drift, or directory unreachable (soft pass, warns only),
//             1 = drift detected (directory-only and/or registry-only origins),
//             2 = usage error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_URL = 'https://stremio-addons.net/api/v0/addons/aiostreams';

const outputArg = process.argv.indexOf('--output');
const outputPath = outputArg > -1 && process.argv[outputArg + 1]
  ? resolve(process.cwd(), process.argv[outputArg + 1])
  : resolve(root, 'reports/addon-directory-drift.md');

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'user-agent': 'core-builds-drift-watch' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function esc(value) {
  // Markdown table-cell escaping: backslashes first so a literal "\" in the
  // third-party API data cannot neutralize the pipe escape we add after it.
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim() || '—';
}

try {
  let data;
  try {
    data = await fetchJson(API_URL);
  } catch (err) {
    // Soft pass: a third-party experimental API must not turn the schedule red.
    console.warn(`addon-directory: unreachable, skipping (${err.message || err})`);
    process.exit(0);
  }

  const instances = Array.isArray(data?.instances) ? data.instances : null;
  if (!instances) {
    console.warn('addon-directory: response had no instances[] — API contract may have changed; skipping');
    process.exit(0);
  }

  const { HOST_BASE_URLS } = await import(
    pathToFileURL(resolve(root, 'configurator/src/data/hosts.js')).href
  );
  const registry = new Map(
    Object.entries(HOST_BASE_URLS).map(([key, url]) => [originOf(url), key]),
  );

  const rows = [];
  const directoryOrigins = new Set();
  for (const instance of instances) {
    const origin = originOf(instance.manifestUrl);
    if (!origin) continue;
    directoryOrigins.add(origin);
    rows.push({
      name: instance.manifest?.name || instance.slug || origin,
      slug: instance.slug || '',
      origin,
      version: instance.manifest?.version || '',
      registryKey: registry.get(origin) || null,
      stars: typeof instance.stars === 'number' ? instance.stars : null,
    });
  }

  const directoryOnly = rows.filter(r => !r.registryKey);
  const registryOnly = [...registry.entries()]
    .filter(([origin]) => !directoryOrigins.has(origin))
    .map(([origin, key]) => ({ key, origin }));
  const matched = rows.filter(r => r.registryKey);

  const now = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# Addon directory drift — AIOStreams instances (${now})`);
  lines.push('');
  lines.push(`Advisory diff between [stremio-addons.net](${API_URL}) approved AIOStreams instances and the configurator host registry (\`configurator/src/data/hosts.js\`). The directory API is experimental and its list is moderated rather than authoritative, so this issue never blocks a build.`);
  lines.push('');
  lines.push(`- Directory instances: **${rows.length}**`);
  lines.push(`- Matched to a registry host: **${matched.length}**`);
  lines.push(`- Directory-only (candidate hosts needing the normal capability audit): **${directoryOnly.length}**`);
  lines.push(`- Registry-only (routed hosts the directory does not list — informational): **${registryOnly.length}**`);
  lines.push('');

  if (directoryOnly.length) {
    lines.push('## Directory-only origins — review before any registry addition');
    lines.push('');
    lines.push('| Name | Slug | Origin | Version | Stars |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const r of directoryOnly) {
      lines.push(`| ${esc(r.name)} | ${esc(r.slug)} | ${esc(r.origin)} | ${esc(r.version)} | ${esc(r.stars)} |`);
    }
    lines.push('');
    lines.push('A listing is not an endorsement: check `/api/v1/status`, blocked stream types, regex access level and rate limits against `src/data/host-capabilities.js` before adding anything to `HOST_BASE_URLS`. Nightly siblings of already-registered stable hosts are expected here.');
    lines.push('');
  }

  if (registryOnly.length) {
    lines.push('## Registry-only origins — no action needed');
    lines.push('');
    lines.push('These hosts route installs today but are not listed in the directory; keep the live `/api/v1/status` probe as the source of truth.');
    lines.push('');
    lines.push('| Registry key | Origin |');
    lines.push('| --- | --- |');
    for (const r of registryOnly) lines.push(`| ${esc(r.key)} | ${esc(r.origin)} |`);
    lines.push('');
  }

  lines.push('## Matched instances');
  lines.push('');
  lines.push('| Registry key | Name | Origin | Directory version |');
  lines.push('| --- | --- | --- | --- |');
  for (const r of matched) {
    lines.push(`| ${esc(r.registryKey)} | ${esc(r.name)} | ${esc(r.origin)} | ${esc(r.version)} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('Generated by `scripts/check-addon-directory-drift.mjs` (workflow: addon-directory-drift). This issue is re-opened per schedule while drift remains; close it once the diff is reviewed.');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, lines.join('\n'));
  console.log(`addon-directory: report written to ${outputPath}`);
  console.log(`addon-directory: ${directoryOnly.length} directory-only, ${registryOnly.length} registry-only, ${matched.length} matched`);

  if (directoryOnly.length || registryOnly.length) process.exit(1);
  process.exit(0);
} catch (err) {
  console.error(`addon-directory: ${err.stack || err}`);
  process.exit(2);
}
