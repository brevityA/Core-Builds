// Snapshot a public host's regex allowlist into allowlist.<host>.json, so the
// restricted save test runs against the same rules without depending on the
// host being up. Reads only the public /api/v1/status; sends no credentials.
// Usage: node snapshot-allowlist.mjs [host-key] [base-url]
import { writeFileSync } from 'node:fs';

const KEY = process.argv[2] || 'elfhosted';
const BASE = (process.argv[3] || 'https://aiostreams.elfhosted.com').replace(/\/$/, '');

const res = await fetch(`${BASE}/api/v1/status`, { headers: { 'user-agent': 'Core-Builds-save-test' } });
if (!res.ok) throw new Error(`${BASE}/api/v1/status -> ${res.status}`);
const { data } = await res.json();
const access = data?.settings?.regexAccess;
if (!access || !Array.isArray(access.patterns)) throw new Error('status has no settings.regexAccess.patterns');

// Synced lists are reported as "<SYNCED: url>"; everything else is a literal pattern.
const urls = [], patterns = [];
for (const entry of access.patterns) {
  const synced = /^<SYNCED: (https?:\/\/[^>]+)>$/.exec(entry);
  (synced ? urls : patterns).push(synced ? synced[1] : entry);
}
const out = { host: KEY, version: data.version, level: access.level, capturedAt: new Date().toISOString().slice(0, 10), urls, patterns };
writeFileSync(new URL(`./allowlist.${KEY}.json`, import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`${KEY} ${data.version}: level=${access.level}, ${urls.length} synced URLs, ${patterns.length} literal patterns`);
