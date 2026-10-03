// Writes stub.env: every external addon URL AIOStreams knows about, pointed at the
// local stub. Read from the pinned image itself so the list cannot drift from it.
// Usage: node gen-env.mjs [image] [stubBase]   (needs docker)
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const IMAGE = process.argv[2] || 'ghcr.io/viren070/aiostreams:v2.35.7';
const STUB = (process.argv[3] || 'http://127.0.0.1:4100').replace(/\/$/, '');
const DIST = '/app/packages/core/dist/config/schema';

const read = (file) => {
  const id = execFileSync('docker', ['create', IMAGE], { encoding: 'utf8' }).trim();
  try { return execFileSync('docker', ['cp', `${id}:${DIST}/${file}`, '-'], { encoding: 'latin1', maxBuffer: 64 << 20 }); }
  finally { execFileSync('docker', ['rm', id], { stdio: 'ignore' }); }
};
const slug = (env) => env.replace(/^DEFAULT_|_URL$/g, '').toLowerCase().replace(/_/g, '-');

const lines = [];
// Presets: basicPreset({ default: [...], envBase: 'X_URL' }). A default that is a
// full manifest URL is fetched as-is (e.g. USA TV Next), so the stub URL must be too.
const presets = read('presets.js');
for (const m of presets.matchAll(/default:\s*\[([^\]]*)\],\s*envBase:\s*'([A-Z_]+)'/g)) {
  const manifest = /manifest\.json['"]/.test(m[1]) ? '/manifest.json' : '';
  lines.push(`${m[2]}=${STUB}/${slug(m[2])}${manifest}`);
}
// Built-ins with no default URL are DISABLED until one is set (Bitmagnet). Built-ins
// that ship a default keep it: AIOStreams does not fetch them on save.
const builtins = read('builtins.js');
for (const m of builtins.matchAll(/default:\s*null,\s*label:\s*'[^']*',\s*env:\s*'(BUILTIN_[A-Z_]+_URL)'/g)) lines.push(`${m[1]}=${STUB}/${slug(m[1].replace(/^BUILTIN_/, ''))}`);

if (lines.length < 40) throw new Error(`only ${lines.length} URL envs found; the image layout changed`);
writeFileSync(new URL('./stub.env', import.meta.url), lines.sort().join('\n') + '\n');
console.log(`wrote ${lines.length} envs to stub.env`);
