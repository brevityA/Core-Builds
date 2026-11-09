#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HOST_BASE_URLS,
  HOST_LABEL_MAP,
  HOST_META,
  MIN_AIOSTREAMS_VERSION,
} from '../src/data/hosts.js';
import {
  HOST_CAPABILITY_OVERRIDES,
  REGEX_ACCESS_LEVELS,
} from '../src/data/host-capabilities.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_JSON = resolve(ROOT, 'reports/host-compatibility.json');
const REPORT_MD = resolve(ROOT, 'docs/host-compatibility.md');
const SOURCE_AUDIT_DATE = '2026-10-22';

function compareVersions(left, right) {
  const parse = (value) => String(value).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function normaliseHost(id) {
  const url = HOST_BASE_URLS[id];
  const meta = HOST_META[id];
  const capability = HOST_CAPABILITY_OVERRIDES[id];
  const issues = [];

  if (!url) issues.push(`missing endpoint in HOST_BASE_URLS`);
  if (!meta) issues.push(`missing metadata in HOST_META`);
  if (!capability) issues.push(`missing capability override in HOST_CAPABILITY_OVERRIDES`);

  if (meta && capability) {
    if (!REGEX_ACCESS_LEVELS.includes(capability.regexAccess)) {
      issues.push(`invalid regexAccess: ${capability.regexAccess}`);
    }

    if (compareVersions(meta.aiostreamsVersion, MIN_AIOSTREAMS_VERSION) < 0) {
      issues.push(
        `AIOStreams ${meta.aiostreamsVersion} is below the supported minimum ${MIN_AIOSTREAMS_VERSION}`
      );
    }

    if (!meta.supportsP2P && !capability.blockedStreamTypes.includes('p2p')) {
      issues.push(`HOST_META disables P2P but the capability override does not block it`);
    }

    if (!meta.supportsHttp && !capability.blockedStreamTypes.includes('http')) {
      issues.push(`HOST_META disables HTTP but the capability override does not block it`);
    }

    if (capability.regexAccess === 'none') {
      for (const regexUrl of capability.allowedRegexUrls || []) {
        if (!regexUrl.startsWith('https://')) {
          issues.push(`allowlisted regex URL is not HTTPS: ${regexUrl}`);
        }
      }
    }
  }

  return {
    id,
    label: HOST_LABEL_MAP[id] || capability?.label || id,
    url: url || null,
    channel: meta?.channel || capability?.kind || 'unknown',
    priority: meta?.priority ?? Number.MAX_SAFE_INTEGER,
    aiostreamsVersion: meta?.aiostreamsVersion || null,
    supports: {
      p2p: Boolean(meta?.supportsP2P),
      http: Boolean(meta?.supportsHttp),
      debrid: Boolean(meta?.supportsDebrid),
      nuvioInstant: Boolean(meta?.supportsNuvioInstant),
    },
    regexAccess: capability?.regexAccess || null,
    rateLimited: Boolean(capability?.rateLimited),
    requiresProbe: Boolean(capability?.requiresProbe),
    disabledPresetIds: capability?.disabledPresetIds || [],
    allowedRegexUrls: capability?.allowedRegexUrls || [],
    issues,
  };
}

export function buildReport() {
  const publicHostIds = Object.keys(HOST_BASE_URLS).sort(
    (left, right) => (HOST_META[left]?.priority ?? 999) - (HOST_META[right]?.priority ?? 999)
  );

  const publicHosts = publicHostIds.map(normaliseHost);
  const internalProfileIds = Object.keys(HOST_CAPABILITY_OVERRIDES)
    .filter((id) => !Object.hasOwn(HOST_BASE_URLS, id))
    .sort();

  const internalProfiles = internalProfileIds.map((id) => {
    const capability = HOST_CAPABILITY_OVERRIDES[id];
    return {
      id,
      label: capability.label,
      kind: capability.kind,
      requiresProbe: Boolean(capability.requiresProbe),
      unverified: Boolean(capability.unverified),
    };
  });

  const issueCount = publicHosts.reduce((total, host) => total + host.issues.length, 0);

  return {
    schemaVersion: 1,
    sourceAuditDate: SOURCE_AUDIT_DATE,
    minAiostreamsVersion: MIN_AIOSTREAMS_VERSION,
    issueCount,
    publicHosts,
    internalProfiles,
  };
}

export function renderMarkdown(report) {
  const rows = report.publicHosts
    .map((host) => {
      const restrictions = host.disabledPresetIds.length
        ? host.disabledPresetIds.join(', ')
        : 'None';
      return `| ${host.label} | ${host.url || '—'} | ${host.channel} | ${
        host.aiostreamsVersion || '—'
      } | ${host.supports.p2p ? 'Yes' : 'No'} | ${host.supports.http ? 'Yes' : 'No'} | ${
        host.supports.debrid ? 'Yes' : 'No'
      } | ${host.supports.nuvioInstant ? 'Yes' : 'No'} | ${host.regexAccess || '—'} | ${restrictions} |`;
    })
    .join('\n');

  const internalRows = report.internalProfiles
    .map(
      (profile) =>
        `| ${profile.label} | ${profile.kind} | ${profile.requiresProbe ? 'Yes' : 'No'} | ${
          profile.unverified ? 'Unverified until probed' : 'Verified by live status probe when available'
        } |`
    )
    .join('\n');

  return `# Host compatibility

Generated from \`src/data/hosts.js\` and \`src/data/host-capabilities.js\`. Run \`npm run host-report\` after changing either file.

- Minimum supported AIOStreams version: **${report.minAiostreamsVersion}**
- Source audit date: **${report.sourceAuditDate}**
- Public hosts: **${report.publicHosts.length}**
- Compatibility issues: **${report.issueCount}**

## Public hosts

| Host | Endpoint | Channel | AIOStreams | P2P | HTTP | Debrid | Nuvio Instant | Regex access | Restrictions |
|---|---|---|---:|---:|---:|---:|---:|---|---|
${rows}

## Internal profiles

| Profile | Kind | Requires probe | Verification |
|---|---|---|---|
${internalRows}

## Regex policy

- \`none\`: only host-published allowlisted regex sources may be used.
- \`trusted\`: user-supplied regex is accepted under the host's trusted-regex policy.
- \`all\`: user-supplied regex is accepted without the trusted-regex restriction.

ElfHosted publishes one allowlisted regex source: \`https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json\`.

## Version gates

| Feature | Minimum AIOStreams version |
|---|---:|
| \`variants\` | 2.33.0 |
| \`activeVariants\` | 2.33.0 |
| \`variantSelectorLocation\` | 2.33.2 |
| \`anime-tosho-new\` preset | 2.36.0 |
`;
}

async function writeReport(report) {
  await mkdir(dirname(REPORT_JSON), { recursive: true });
  await mkdir(dirname(REPORT_MD), { recursive: true });
  await writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(REPORT_MD, renderMarkdown(report));
}

async function checkReport(report) {
  const [existingJson, existingMarkdown] = await Promise.all([
    readFile(REPORT_JSON, 'utf8'),
    readFile(REPORT_MD, 'utf8'),
  ]);
  const expectedJson = `${JSON.stringify(report, null, 2)}\n`;
  const expectedMarkdown = renderMarkdown(report);

  if (existingJson !== expectedJson) {
    console.error(`host-compatibility.json is stale; run: npm run host-report`);
    process.exitCode = 1;
  }

  if (existingMarkdown !== expectedMarkdown) {
    console.error(`host-compatibility.md is stale; run: npm run host-report`);
    process.exitCode = 1;
  }
}

const report = buildReport();

if (process.argv.includes('--check')) {
  await checkReport(report);
} else {
  await writeReport(report);
}

if (report.issueCount > 0) {
  for (const host of report.publicHosts) {
    for (const issue of host.issues) {
      console.error(`${host.id}: ${issue}`);
    }
  }
  process.exitCode = 1;
}
