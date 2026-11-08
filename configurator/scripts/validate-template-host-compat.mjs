#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES_ROOT = resolve(ROOT, '..', 'Templates');
const IGNORED_DIRECTORIES = new Set(['Legacy', 'Personal']);

/**
 * Preset types removed by the pinned AIOStreams upstream. A template containing
 * one of these values in an explicit preset reference cannot be saved by any
 * current AIOStreams host.
 */
const UPSTREAM_REMOVED_PRESET_IDS = new Set(['torbox', 'usa-tv', 'debridio-watchtower']);
const PRESET_REFERENCE_KEYS = new Set(['preset', 'presetId', 'presetType']);

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

function collectPresetReferences(value, filePath, references = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPresetReferences(item, filePath, references);
    }
    return references;
  }

  if (!value || typeof value !== 'object') {
    return references;
  }

  for (const [key, child] of Object.entries(value)) {
    if (PRESET_REFERENCE_KEYS.has(key) && typeof child === 'string') {
      references.push({ file: filePath, key, value: child });
    }

    collectPresetReferences(child, filePath, references);
  }

  return references;
}

export async function validateTemplates() {
  const files = await listJsonFiles(TEMPLATES_ROOT);
  const errors = [];
  const presetReferences = [];

  for (const filePath of files) {
    const relativePath = relative(TEMPLATES_ROOT, filePath);

    try {
      const contents = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(contents);
      presetReferences.push(...collectPresetReferences(parsed, relativePath));
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON — ${error.message}`);
    }
  }

  for (const reference of presetReferences) {
    if (UPSTREAM_REMOVED_PRESET_IDS.has(reference.value)) {
      errors.push(
        `${reference.file}: removed preset "${reference.value}" in "${reference.key}"`
      );
    }
  }

  return {
    templateRoot: TEMPLATES_ROOT,
    files,
    presetReferences,
    errors,
  };
}

const result = await validateTemplates();

if (result.errors.length > 0) {
  for (const error of result.errors) {
    console.error(error);
  }

  console.error(`Template host-compatibility validation failed with ${result.errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${result.files.length} template JSON file(s); no removed preset references found.`);
}
