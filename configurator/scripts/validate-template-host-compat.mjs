#!/usr/bin/env node
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
const IGNORED_DIRECTORIES = new Set(['Legacy', 'Personal']);
const PUBLIC_HOST_IDS = Object.keys(HOST_BASE_URLS);

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
    const localRegexKeys = [
      'rankedRegexPatterns',
      'excludedRegexPatterns',
      'preferredRegexPatterns',
    ];

    for (const key of localRegexKeys) {
      if (Array.isArray(config[key]) && config[key].length > 0) {
        issues.push(
          `${templateId}: local "${key}" are not permitted on ${hostId}, which restricts user regex`
        );
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
