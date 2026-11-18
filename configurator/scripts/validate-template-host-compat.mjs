#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HOST_BASE_URLS,
  HOST_META,
  MIN_AIOSTREAMS_VERSION,
} from '../src/data/hosts.js';
import {
  FEATURE_MIN_VERSIONS,
  HOST_CAPABILITY_OVERRIDES,
  PRESET_MIN_VERSIONS,
} from '../src/data/host-capabilities.js';
import {
  DEFAULT_TEMPLATE_ROUTING,
  TEMPLATE_HOST_ROUTING,
} from '../src/data/template-host-routing.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES_ROOT = resolve(ROOT, '..', 'Templates');
// Legacy is a pinned compatibility lane, Personal is never published, and
// Deprecated holds retired templates that are not offered for any host.
const IGNORED_DIRECTORIES = new Set(['Deprecated', 'Legacy', 'Personal']);
const PUBLIC_HOST_IDS = Object.keys(HOST_BASE_URLS);

// Pinned copies of the regex sources an allowlisting host publishes. On a
// `regexAccess: 'none'` host an inline pattern is accepted when it matches an
// entry of an allowlisted source word for word (upstream isRegexAllowed), so a
// pattern is checked against these snapshots, not refused for being inline.
// Refresh with `node scripts/check_upstream_drift.mjs --update`.
const REGEX_SOURCE_SNAPSHOTS = {
  'https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json':
    resolve(ROOT, '..', 'Filtering', 'upstream', 'vidhin05-regexes.snapshot.json'),
};
const LOCAL_REGEX_KEYS = ['rankedRegexPatterns', 'excludedRegexPatterns', 'preferredRegexPatterns'];
const snapshotCache = new Map();

function loadSnapshotPatterns(url) {
  if (!snapshotCache.has(url)) {
    const file = REGEX_SOURCE_SNAPSHOTS[url];
    let patterns = null;
    if (file) {
      const entries = JSON.parse(readFileSync(file, 'utf8'));
      patterns = new Set(entries.map((entry) => entry?.pattern).filter(Boolean));
    }
    snapshotCache.set(url, patterns);
  }
  return snapshotCache.get(url);
}

/** Patterns a host accepts inline, or null when no allowlisted source has a pinned copy. */
export function allowedInlinePatterns(capability) {
  const sets = (capability.allowedRegexUrls || []).map(loadSnapshotPatterns).filter(Boolean);
  if (!sets.length) return null;
  return new Set(sets.flatMap((set) => [...set]));
}

function patternOf(entry) {
  if (typeof entry === 'string') return { pattern: entry, label: entry };
  if (entry && typeof entry === 'object' && typeof entry.pattern === 'string') {
    return { pattern: entry.pattern, label: entry.name || entry.pattern };
  }
  return null;
}

/** True when a template carries AIOStreams template directives (__if / __switch). */
export function hasTemplateDirectives(value) {
  if (Array.isArray(value)) return value.some(hasTemplateDirectives);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => key === '__if' || key === '__switch' || hasTemplateDirectives(child));
}

const UPSTREAM_REMOVED_PRESET_IDS = new Set(['torbox', 'usa-tv', 'debridio-watchtower']);
const PRESET_REFERENCE_KEYS = new Set(['preset', 'presetId', 'presetType']);

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

async function listJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      files.push(...(await listJsonFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectPresetReferences(value, references = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPresetReferences(item, references);
    }
    return references;
  }

  if (!value || typeof value !== 'object') {
    return references;
  }

  for (const [key, child] of Object.entries(value)) {
    if (PRESET_REFERENCE_KEYS.has(key) && typeof child === 'string') {
      references.push({ key, value: child });
    }

    collectPresetReferences(child, references);
  }

  return references;
}

export function resolveCompatibleHosts(templateId) {
  const routing = TEMPLATE_HOST_ROUTING[templateId] || DEFAULT_TEMPLATE_ROUTING;
  const includedHosts = routing.hosts === 'all' ? PUBLIC_HOST_IDS : routing.hosts;
  const excluded = new Set(routing.excludedHosts || []);

  return includedHosts.filter((hostId) => !excluded.has(hostId));
}

export function evaluateTemplate(template, hostId) {
  const issues = [];
  const capability = HOST_CAPABILITY_OVERRIDES[hostId];
  const meta = HOST_META[hostId];
  const config = template.config || {};
  const templateId = template.metadata?.id || 'unknown-template';

  if (!capability || !meta) {
    issues.push(`${hostId}: missing host capability or metadata`);
    return issues;
  }

  const presets = Array.isArray(config.presets) ? config.presets : [];
  const presetTypes = presets.map((preset) => preset?.type).filter(Boolean);

  for (const presetType of presetTypes) {
    if (UPSTREAM_REMOVED_PRESET_IDS.has(presetType)) {
      issues.push(`${templateId}: uses upstream-removed preset "${presetType}"`);
    }

    if (capability.disabledPresetIds.includes(presetType)) {
      issues.push(
        `${templateId}: preset "${presetType}" is disabled on ${hostId}`
      );
    }

    const minimumVersion = PRESET_MIN_VERSIONS[presetType];
    if (minimumVersion && compareVersions(meta.aiostreamsVersion, minimumVersion) < 0) {
      issues.push(
        `${templateId}: preset "${presetType}" requires AIOStreams ${minimumVersion}, but ${hostId} runs ${meta.aiostreamsVersion}`
      );
    }
  }

  if (capability.regexAccess === 'none') {
    // 'none' means "only what this host publishes", not "no regex". Without a
    // pinned copy of any allowlisted source there is nothing to compare against,
    // and absence of data is not a violation.
    const allowed = allowedInlinePatterns(capability);

    if (allowed) {
      for (const key of LOCAL_REGEX_KEYS) {
        for (const entry of Array.isArray(config[key]) ? config[key] : []) {
          const parsed = patternOf(entry);
          if (parsed && !allowed.has(parsed.pattern)) {
            const label = parsed.label.length > 60 ? `${parsed.label.slice(0, 57)}...` : parsed.label;
            issues.push(
              `${templateId}: local "${key}" pattern "${label}" is not on ${hostId}'s regex allowlist`
            );
          }
        }
      }
    }

    const allowedUrls = new Set(capability.allowedRegexUrls || []);
    for (const url of config.syncedRankedRegexUrls || []) {
      if (!allowedUrls.has(url)) {
        issues.push(
          `${templateId}: synced regex URL is not allowlisted on ${hostId}: ${url}`
        );
      }
    }
  }

  const blockedStreamTypes = new Set(capability.blockedStreamTypes || []);
  const cacheAndPlayTypes = config.cacheAndPlay?.streamTypes || [];

  for (const streamType of cacheAndPlayTypes) {
    if (blockedStreamTypes.has(streamType)) {
      issues.push(
        `${templateId}: cache-and-play stream type "${streamType}" is blocked on ${hostId}`
      );
    }
  }

  for (const [feature, minimumVersion] of Object.entries(FEATURE_MIN_VERSIONS)) {
    if (config[feature] !== undefined) {
      if (compareVersions(meta.aiostreamsVersion, minimumVersion) < 0) {
        issues.push(
          `${templateId}: feature "${feature}" requires AIOStreams ${minimumVersion}, but ${hostId} runs ${meta.aiostreamsVersion}`
        );
      }
    }
  }

  return issues;
}

export async function validateTemplates() {
  const files = await listJsonFiles(TEMPLATES_ROOT);
  const errors = [];
  const results = [];

  for (const filePath of files) {
    const relativePath = relative(TEMPLATES_ROOT, filePath);

    try {
      const template = JSON.parse(await readFile(filePath, 'utf8'));
      const templateId = template.metadata?.id || relativePath;

      // Directive templates (the smart template) resolve per answer and service;
      // a preset behind `__if: "!services"` is not in every config. They are
      // checked by packages/core/tests/smart-template.test.mjs and the save test.
      if (hasTemplateDirectives(template)) {
        results.push({ templateId, file: relativePath, compatibleHosts: [], issues: [], skipped: 'template directives' });
        continue;
      }
      const compatibleHosts = resolveCompatibleHosts(templateId);
      const hostIssues = [];

      for (const hostId of compatibleHosts) {
        for (const issue of evaluateTemplate(template, hostId)) {
          hostIssues.push(issue);
        }
      }

      results.push({
        templateId,
        file: relativePath,
        compatibleHosts,
        issues: hostIssues,
      });

      errors.push(...hostIssues);
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON — ${error.message}`);
    }
  }

  return {
    templateRoot: TEMPLATES_ROOT,
    files,
    results,
    errors,
  };
}

async function main() {
  const result = await validateTemplates();

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(error);
    }

    console.error(
      `Template host-compatibility validation failed with ${result.errors.length} error(s).`
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Validated ${result.files.length} template JSON file(s) across their compatible hosts.`
    );
  }
}

// Run only as a script: importing this module (the tests do) must not set exitCode.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
