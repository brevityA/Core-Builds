// Spike: POST generated configs to a throwaway AIOStreams and report each verdict.
// Usage: node save-test.mjs <file.json>...   (file = template {config} or bare config)
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const BASE = process.env.AIO_URL || 'http://localhost:3999';

// Dummy values that satisfy each upstream credential's format check. Nothing here
// is a real account; a service that verifies keys over the network will refuse it,
// which is itself a finding the spike needs to surface.
const DUMMY = { apiKey: 'dummy-api-key-0000', email: 'dummy@example.invalid', password: 'dummy-pass', username: 'dummy-user', encodedToken: 'dummy-token', url: 'https://dummy.invalid', authToken: 'dummy-token' };

export function withDummyCredentials(config, requiredByService) {
  for (const service of config.services || []) {
    if (!service.enabled) continue;
    const fields = requiredByService[service.id] || ['apiKey'];
    service.credentials = Object.fromEntries(fields.map(f => [f, service.credentials?.[f] || DUMMY[f] || 'dummy']));
  }
  return config;
}

export async function save(config) {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/v1/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, password: 'spike-password-1' }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body.success !== false, status: res.status, ms: Date.now() - started, error: body?.error?.message || '' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const required = JSON.parse(process.env.REQUIRED_CREDS || '{}');
  for (const file of process.argv.slice(2)) {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    const config = withDummyCredentials(structuredClone(raw.config || raw), required);
    const r = await save(config);
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${String(r.ms).padStart(5)}ms  ${basename(file)}${r.ok ? '' : `\n      ${r.status} ${r.error.slice(0, 300)}`}`);
  }
}
