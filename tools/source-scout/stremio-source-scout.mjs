#!/usr/bin/env node
/**
 * Evidence-first discovery of public Stremio add-on/source pages.
 * Search snippets are treated as unverified leads, never as playback or rights proof.
 */
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';

const BRAVE_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
const GITHUB_ENDPOINT = 'https://api.github.com/search/repositories';
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const SENSITIVE_QUERY_KEY = /(?:token|key|auth|password|secret|cookie|credential|signature|config|profile|session)/i;
const RESERVED_HOST = /(?:^|\.)(?:localhost|local|internal|intranet|lan|corp|home|private|test|example|invalid|onion|arpa)$/i;
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
const PRIVATE_PATH_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;
const SECRET_ASSIGNMENT = /\b(token|access[_-]?token|api[_-]?key|auth(?:orization)?|password|passwd|cookie|secret|session|config(?:uration)?[_-]?token)(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s&;,]+)/gi;
const BEARER_CREDENTIAL = /\bBearer\s+[A-Za-z0-9._~+\/-]{16,}={0,2}/gi;

function safeText(value, max = 1200) {
  return String(value ?? '').replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function isPrivateManifestPath(url) {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.at(-1)?.toLowerCase() !== 'manifest.json') return false;
  return segments.slice(0, -1).some((segment) => {
    let decoded = segment;
    try { decoded = decodeURIComponent(segment); } catch { return true; }
    return PRIVATE_PATH_TOKEN.test(decoded);
  });
}

function sanitizeHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
    if (url.username || url.password) {
      return { url: `${url.protocol}//${host}/`, credentialsRedacted: true, pathRedacted: false };
    }
    let credentialsRedacted = false;
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEY.test(key)) {
        url.searchParams.delete(key);
        credentialsRedacted = true;
      }
    }
    const pathRedacted = isPrivateManifestPath(url);
    if (pathRedacted) url.pathname = '/';
    url.hash = '';
    return { url: url.toString(), credentialsRedacted, pathRedacted };
  } catch {
    return null;
  }
}

function redactSensitiveText(value, max = 1200) {
  let text = safeText(value, max);
  text = text.replace(SECRET_ASSIGNMENT, (_match, label, separator) => `${label}${separator}[redacted]`);
  text = text.replace(BEARER_CREDENTIAL, 'Bearer [redacted]');
  text = text.replace(/https?:\/\/[^\s<>"']+/gi, (rawUrl) => {
    const trailing = rawUrl.match(/[),.;!?]+$/)?.[0] || '';
    const candidate = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
    const safe = sanitizeHttpUrl(candidate);
    if (!safe) return '[URL redacted]' + trailing;
    if (safe.credentialsRedacted || safe.pathRedacted) return `${safe.url} [credentials redacted]${trailing}`;
    return safe.url + trailing;
  });
  return text;
}

/** Keep public HTTPS references; redact bearer-like manifest paths and secrets. */
export function safePublicUrl(value) {
  let original;
  try { original = new URL(value); } catch { return null; }
  if (original.username || original.password) return null;
  const safe = sanitizeHttpUrl(value);
  if (!safe) return null;
  let parsed;
  try { parsed = new URL(safe.url); } catch { return null; }
  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  if (parsed.protocol !== 'https:' || isIP(host) || host === 'localhost' || RESERVED_HOST.test(host)) return null;
  return safe;
}

async function readJsonBounded(response) {
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error('Search provider response exceeded the 2 MiB limit.');
  }
  const reader = response.body?.getReader?.();
  if (!reader) throw new Error('Search provider returned no response body.');
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        try { await reader.cancel(); } catch {}
        throw new Error('Search provider response exceeded the 2 MiB limit.');
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('Search provider returned invalid JSON.');
  }
}

async function fetchJson(url, options, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, { ...options, redirect: 'error' });
  } catch {
    throw new Error('Search provider request failed before response.');
  }
  if (!response.ok) {
    try { await response.body?.cancel(); } catch {}
    throw new Error(`Search provider request failed with HTTP ${response.status}.`);
  }
  return readJsonBounded(response);
}

export async function searchBrave(query, apiKey, { count = 10, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('Set BRAVE_SEARCH_API_KEY in your local environment to use web search.');
  const url = new URL(BRAVE_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  url.searchParams.set('safesearch', 'moderate');
  url.searchParams.set('text_decorations', 'false');
  const payload = await fetchJson(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
    signal: AbortSignal.timeout(12_000),
  }, fetchImpl);
  const results = Array.isArray(payload?.web?.results) ? payload.web.results : [];
  return results.flatMap((item) => {
    const safe = safePublicUrl(item.url);
    if (!safe) return [];
    return [{
      kind: 'web_search_result',
      evidenceLabel: 'search-index snippet — unverified lead',
      query: redactSensitiveText(query, 200),
      title: redactSensitiveText(item.title, 240),
      url: safe.url,
      snippet: redactSensitiveText(item.description, 1800),
      indexAge: redactSensitiveText(item.page_age, 100) || null,
      credentialsRedacted: safe.credentialsRedacted || safe.pathRedacted,
      pathRedacted: safe.pathRedacted,
    }];
  });
}

export async function searchGitHubRepositories(query, { count = 10, fetchImpl = fetch } = {}) {
  const url = new URL(GITHUB_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('per_page', String(Math.min(count, 100)));
  url.searchParams.set('sort', 'updated');
  const payload = await fetchJson(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Core-Builds-source-scout',
    },
    signal: AbortSignal.timeout(12_000),
  }, fetchImpl);
  return (Array.isArray(payload?.items) ? payload.items : []).flatMap((repo) => {
    const safe = safePublicUrl(repo.html_url);
    if (!safe) return [];
    return [{
      kind: 'github_repository',
      evidenceLabel: 'GitHub repository metadata — not a stream or rights verification',
      query: redactSensitiveText(query, 200),
      title: redactSensitiveText(repo.full_name, 240),
      url: safe.url,
      snippet: redactSensitiveText(repo.description, 1800),
      updatedAt: safeText(repo.updated_at, 40) || null,
      pushedAt: safeText(repo.pushed_at, 40) || null,
      archived: typeof repo.archived === 'boolean' ? repo.archived : null,
      stars: Number.isSafeInteger(repo.stargazers_count) ? repo.stargazers_count : null,
      credentialsRedacted: safe.credentialsRedacted || safe.pathRedacted,
      pathRedacted: safe.pathRedacted,
    }];
  });
}

export function mergeFindings(results) {
  const byUrl = new Map();
  for (const result of results) {
    const existing = byUrl.get(result.url);
    if (!existing) {
      byUrl.set(result.url, { ...result, foundBy: [result.query] });
      continue;
    }
    if (!existing.foundBy.includes(result.query)) existing.foundBy.push(result.query);
    // Retain each provider's record as separately-labelled evidence; neither provider is authoritative for the other.
    existing.evidence = existing.evidence ?? [stripQuery(existing)];
    existing.evidence.push(stripQuery(result));
  }
  return [...byUrl.values()].map((item) => ({
    ...item,
    evidence: item.evidence ?? [stripQuery(item)],
  }));
}

function stripQuery(item) {
  const { foundBy, evidence, ...copy } = item;
  return copy;
}

function markdownEscape(value) {
  const htmlEscaped = redactSensitiveText(value, 1800)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return htmlEscaped.replace(/[\\`*_{}\[\]()#+.!|]/g, '\\$&');
}

function markdownUrlDestination(value) {
  const safe = safePublicUrl(value);
  return safe ? `<${safe.url.replace(/[<>\r\n]/g, (char) => encodeURIComponent(char))}>` : '<#>';
}

export function renderMarkdown(report) {
  const lines = [
    '# Stremio source discovery',
    '',
    `- Run time: ${report.generatedAt}`,
    `- Queries: ${report.queries.map((query) => `\`${markdownEscape(query)}\``).join(', ')}`,
    `- Sources searched: ${report.providers.join(', ')}`,
    `- Candidate pages: ${report.findings.length}`,
    '',
    '> Evidence warning: web-search snippets are discovery leads, not verified page contents. GitHub metadata verifies only repository fields returned by GitHub. Nothing here verifies a working Stremio manifest, a playable stream, content rights, or permission to aggregate/share a source. Open and review each primary source before use.',
    '',
  ];
  for (const finding of report.findings) {
    const evidence = finding.evidence?.length ? finding.evidence : [finding];
    lines.push(`## [${markdownEscape(finding.title)}](${markdownUrlDestination(finding.url)})`, '');
    lines.push(`- Evidence: ${evidence.map((entry) => markdownEscape(entry.evidenceLabel)).join('; ')}`);
    if (finding.foundBy?.length) lines.push(`- Search queries: ${finding.foundBy.map((q) => `\`${markdownEscape(q)}\``).join(', ')}`);
    for (const entry of evidence) {
      if (entry.snippet) lines.push(`- Description (${markdownEscape(entry.evidenceLabel)}; unverified as a claim): ${markdownEscape(entry.snippet)}`);
      if (entry.indexAge) lines.push(`- Search-index page age: ${markdownEscape(entry.indexAge)} (not a live-health check)`);
      if (entry.archived !== undefined && entry.archived !== null) lines.push(`- GitHub archived flag: ${entry.archived}`);
      if (entry.pushedAt) lines.push(`- GitHub last push: ${markdownEscape(entry.pushedAt)}`);
      if (entry.updatedAt) lines.push(`- GitHub last update: ${markdownEscape(entry.updatedAt)}`);
      if (entry.stars !== undefined && entry.stars !== null) lines.push(`- GitHub stars: ${entry.stars}`);
    }
    if (evidence.some((entry) => entry.credentialsRedacted || entry.pathRedacted)) {
      lines.push('- URL note: sensitive query parameters and/or a credential-like manifest path were removed from the displayed reference.');
    }
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

export function parseArgs(argv) {
  const queries = [];
  let count = 10;
  let includeGitHub = false;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--query' || arg === '-q') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a query.`);
      queries.push(value.trim());
    } else if (arg.startsWith('--query=')) {
      queries.push(arg.slice('--query='.length).trim());
    } else if (arg === '--count') {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1 || value > 20) throw new Error('--count must be an integer from 1 to 20.');
      count = value;
    } else if (arg.startsWith('--count=')) {
      const value = Number(arg.slice('--count='.length));
      if (!Number.isInteger(value) || value < 1 || value > 20) throw new Error('--count must be an integer from 1 to 20.');
      count = value;
    } else if (arg === '--github') {
      includeGitHub = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--help' || arg === '-h') {
      return { help: true };
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!queries.length) throw new Error('Provide at least one --query.');
  if (queries.length > 5) throw new Error('Use no more than five queries per run.');
  return { queries, count, includeGitHub, json };
}

export function usage() {
  return [
    'Usage: node tools/source-scout/stremio-source-scout.mjs --query "Stremio HTTP stream addon" [options]',
    '',
    'Options:',
    '  -q, --query <text>  Search query (repeat up to five times)',
    '      --count <1-20>  Results per provider and query (default: 10)',
    '      --github         Also query GitHub public repository metadata',
    '      --json           Emit the evidence-labelled JSON report',
    '  -h, --help           Show this help',
    '',
    'Web search requires BRAVE_SEARCH_API_KEY in the local environment. GitHub search is public and rate limited.',
  ].join('\n');
}

export async function run(argv, env = process.env, fetchImpl = fetch) {
  const options = parseArgs(argv);
  if (options.help) return { help: true, output: usage() };
  if (!env.BRAVE_SEARCH_API_KEY) throw new Error('BRAVE_SEARCH_API_KEY is not set; no web requests were made.');
  const results = [];
  const providers = ['Brave web search'];
  for (const query of options.queries) {
    results.push(...await searchBrave(query, env.BRAVE_SEARCH_API_KEY, { count: options.count, fetchImpl }));
    if (options.includeGitHub) {
      providers.push('GitHub repository search API');
      results.push(...await searchGitHubRepositories(query, { count: options.count, fetchImpl }));
    }
  }
  const findings = mergeFindings(results);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    queries: options.queries.map((query) => redactSensitiveText(query, 200)),
    providers: [...new Set(providers)],
    findings,
    limitations: [
      'Search snippets are unverified leads and may be stale, incomplete, or misleading.',
      'GitHub repository metadata does not prove a repo is a working add-on or that its upstreams are authorized.',
      'A reachable manifest does not prove that stream results resolve or play.',
      'No result establishes licensing, copyright permission, terms compliance, or permission to share credentials.',
    ],
  };
  return {
    report,
    output: options.json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report),
  };
}

async function main() {
  try {
    const result = await run(process.argv.slice(2));
    process.stdout.write(result.output);
  } catch (error) {
    process.stderr.write(`source-scout: ${safeText(error?.message || 'request failed', 300)}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
