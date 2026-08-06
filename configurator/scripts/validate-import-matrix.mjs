#!/usr/bin/env node
/**
 * Validate the sanitized manual-import matrix. This is intentionally a schema
 * and privacy gate, not an import executor.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const configuratorRoot = resolve(here, '..');
const defaultPath = resolve(configuratorRoot, 'reliability/import-matrix.v1.json');
const path = resolve(process.argv[2] || defaultPath);
const matrix = JSON.parse(readFileSync(path, 'utf8'));
const failures = [];
const allowedStatuses = new Set(['pending', 'blocked', 'passed', 'failed']);
const allowedVersions = new Set(['2.31.1', '2.32.0']);
const allowedDeliveries = new Set(['local-json', 'import-url', 'direct-install']);
const allowedProfiles = new Set(['reliable-v3-stable', 'legacy-torbox-search-to-newznab']);
const forbiddenKey = /(password|credential|token|api.?key|authorization|manifest|uuid|secret)/i;
const forbiddenValue = /(?:https?:\/\/|bearer\s|[a-f0-9]{32,})/i;

function inspect(value, pathLabel = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${pathLabel}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && forbiddenValue.test(value)) {
      failures.push(`${pathLabel}: contains a URL, bearer value, or token-like value`);
    }
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenKey.test(key)) failures.push(`${pathLabel}.${key}: forbidden sensitive field name`);
    inspect(nested, `${pathLabel}.${key}`);
  }
}

if (matrix.schemaVersion !== 1) failures.push('schemaVersion must be 1');
if (!Array.isArray(matrix.lanes) || !matrix.lanes.length) failures.push('lanes must be a non-empty array');
const byId = new Map();
for (const lane of matrix.lanes || []) {
  if (!lane?.id || typeof lane.id !== 'string') {
    failures.push('every lane needs a string id');
    continue;
  }
  if (byId.has(lane.id)) failures.push(`duplicate lane id: ${lane.id}`);
  byId.set(lane.id, lane);
  if (!allowedStatuses.has(lane.status)) failures.push(`${lane.id}: invalid status ${lane.status}`);
  if (!allowedVersions.has(lane.version)) failures.push(`${lane.id}: invalid version ${lane.version}`);
  if (!allowedDeliveries.has(lane.delivery)) failures.push(`${lane.id}: invalid delivery ${lane.delivery}`);
  if (!allowedProfiles.has(lane.profile)) failures.push(`${lane.id}: invalid profile ${lane.profile}`);
}
for (const lane of matrix.lanes || []) {
  for (const dependency of lane.requires || []) {
    if (!byId.has(dependency)) failures.push(`${lane.id}: unknown prerequisite ${dependency}`);
    if (lane.status === 'passed' && byId.get(dependency)?.status !== 'passed') {
      failures.push(`${lane.id}: cannot be passed while prerequisite ${dependency} is not passed`);
    }
  }
}
inspect(matrix);

if (failures.length) {
  console.error('Sanitized import matrix: FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Sanitized import matrix: ${matrix.lanes.length} lanes valid; no sensitive values recorded.`);
}
