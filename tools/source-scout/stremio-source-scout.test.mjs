import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeFindings,
  renderMarkdown,
  run,
  safePublicUrl,
  searchBrave,
  searchGitHubRepositories,
} from './stremio-source-scout.mjs';

function jsonResponse(payload, { status = 200 } = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('safePublicUrl keeps public HTTPS links and removes credentials from query/hash', () => {
  assert.deepEqual(safePublicUrl('https://example.org/page?q=ok&api_key=private#section'), {
    url: 'https://example.org/page?q=ok',
    credentialsRedacted: true,
    pathRedacted: false,
  });
  assert.equal(safePublicUrl('http://example.org/page'), null);
  assert.equal(safePublicUrl('https://user:pass@example.org/page'), null);
  for (const key of ['pwd', 'pass', 'pw']) {
    const safe = safePublicUrl(`https://example.org/page?${key}=private`);
    assert.equal(safe.credentialsRedacted, true);
    assert.equal(new URL(safe.url).search, '');
  }
  assert.equal(safePublicUrl('https://127.0.0.1/page'), null);
  for (const host of ['service.internal', 'router.lan', 'service.corp', 'nas.home', 'proxy.intranet']) {
    assert.equal(safePublicUrl(`https://${host}/page`), null);
  }
  const privatePath = 'b'.repeat(48);
  assert.deepEqual(safePublicUrl(`https://example.org/${privatePath}/manifest.json`), {
    url: 'https://example.org/',
    credentialsRedacted: false,
    pathRedacted: true,
  });
  for (const token of ['c'.repeat(129), `${'d'.repeat(129)}==`]) {
    const safe = safePublicUrl(`https://example.org/${token}/manifest.json`);
    assert.equal(safe.url, 'https://example.org/');
    assert.equal(safe.pathRedacted, true);
  }
});

test('Brave adapter labels results as leads, drops unsafe URLs, and keeps API key out of output', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url: String(url), options };
    return jsonResponse({ web: { results: [
      { title: 'Candidate', url: 'https://addon.org/page?token=private', description: 'A source claim', page_age: 'Today' },
      { title: 'Unsafe', url: 'http://127.0.0.1/manifest', description: 'skip' },
    ] } });
  };
  const results = await searchBrave('HTTP addon', 'secret-api-key', { count: 3, fetchImpl });
  assert.equal(results.length, 1);
  assert.equal(results[0].evidenceLabel, 'search-index snippet — unverified lead');
  assert.equal(results[0].url, 'https://addon.org/page');
  assert.equal(results[0].credentialsRedacted, true);
  assert.equal(new URL(request.url).searchParams.get('q'), 'HTTP addon');
  assert.equal(request.options.headers['X-Subscription-Token'], 'secret-api-key');
  assert.equal(request.options.redirect, 'error');
  assert.equal(JSON.stringify(results).includes('secret-api-key'), false);
});

test('scout redacts credentials in path tokens, snippets, titles, and query output', async () => {
  const pathToken = 'c'.repeat(48);
  const secret = 'this-must-not-appear';
  const results = await searchBrave(`addon token=${secret}`, 'api-key', {
    fetchImpl: async () => jsonResponse({ web: { results: [{
      title: `Private token=${secret}`,
      url: `https://addon.org/${pathToken}/manifest.json?session=${secret}`,
      description: `Install at https://addon.org/${pathToken}/manifest.json?token=${secret}; API_KEY=${secret}`,
    }] } }),
  });
  assert.equal(results[0].url, 'https://addon.org/');
  assert.equal(results[0].pathRedacted, true);
  assert.equal(results[0].credentialsRedacted, true);
  assert.equal(JSON.stringify(results).includes(secret), false);
  assert.match(results[0].snippet, /\[redacted\]/);
});

test('JSON and Markdown reports redact long and padded manifest path tokens', async () => {
  for (const token of ['x'.repeat(129), `${'y'.repeat(129)}==`]) {
    const results = await searchBrave('authorized stream source', 'local-test-key', {
      fetchImpl: async () => jsonResponse({ web: { results: [{
        title: 'Candidate',
        url: `https://addon.example.org/${token}/manifest.json`,
        description: 'Candidate lead',
      }] } }),
    });
    const findings = mergeFindings(results);
    const report = { generatedAt: '2026-10-27T00:00:00.000Z', queries: ['authorized stream source'], providers: ['Brave'], findings };
    assert.equal(JSON.stringify(report).includes(token), false);
    assert.equal(renderMarkdown(report).includes(token), false);
  }
});

test('Brave adapter makes no request without a key', async () => {
  let called = false;
  await assert.rejects(
    searchBrave('test', '', { fetchImpl: async () => { called = true; } }),
    /BRAVE_SEARCH_API_KEY/,
  );
  assert.equal(called, false);
});

test('GitHub adapter reports repository metadata with a narrow evidence label', async () => {
  const fetchImpl = async () => jsonResponse({ items: [{
    full_name: 'owner/addon',
    html_url: 'https://github.com/owner/addon',
    description: 'Public repository',
    updated_at: '2026-10-26T00:00:00Z',
    pushed_at: '2026-10-25T00:00:00Z',
    archived: true,
    stargazers_count: 12,
  }] });
  const [repo] = await searchGitHubRepositories('stremio addon', { fetchImpl });
  assert.equal(repo.archived, true);
  assert.equal(repo.stars, 12);
  assert.match(repo.evidenceLabel, /not a stream or rights verification/);
});

test('GitHub adapter enforces its size cap while streaming and rejects non-JSON responses', async () => {
  await assert.rejects(searchGitHubRepositories('x', {
    fetchImpl: async () => new Response(new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); },
    }), { headers: { 'content-length': '1' } }),
  }), /2 MiB limit/);
  await assert.rejects(searchGitHubRepositories('x', {
    fetchImpl: async () => new Response('<html>not json</html>'),
  }), /invalid JSON/);
});

test('merge retains different evidence types and Markdown explains limitations', () => {
  const results = [
    { kind: 'web_search_result', evidenceLabel: 'search snippet', query: 'q1', title: 'Candidate', url: 'https://github.com/owner/addon_(evil)', snippet: '<img src=x onerror=alert(1)> **bold** `code`', indexAge: 'Yesterday', credentialsRedacted: false },
    { kind: 'github_repository', evidenceLabel: 'GitHub metadata', query: 'q2', title: 'owner/addon', url: 'https://github.com/owner/addon_(evil)', archived: true, pushedAt: '2026-10-25', stars: 12, credentialsRedacted: false },
  ];
  const [finding] = mergeFindings(results);
  assert.equal(finding.evidence.length, 2);
  const markdown = renderMarkdown({ generatedAt: '2026-10-26T00:00:00.000Z', queries: ['q1'], providers: ['Brave'], findings: [finding] });
  assert.match(markdown, /not verified page contents/);
  assert.match(markdown, /Nothing here verifies a working Stremio manifest/);
  assert.match(markdown, /not a live-health check/);
  assert.match(markdown, /GitHub archived flag: true/);
  assert.match(markdown, /GitHub last push: 2026-10-25/);
  assert.match(markdown, /GitHub stars: 12/);
  assert.ok(markdown.includes('](<https://github.com/owner/addon_(evil)>)'));
  assert.ok(!markdown.includes('](https://github.com/owner/addon_(evil))'));
  assert.ok(markdown.includes('&lt;img src=x onerror=alert\\(1\\)&gt;'));
  assert.ok(markdown.includes('\\*\\*bold\\*\\*'));
  assert.ok(markdown.includes('\\`code\\`'));
  assert.ok(!markdown.includes('<img src=x'));
});

test('run refuses missing credentials before network access', async () => {
  let called = false;
  await assert.rejects(
    run(['--query', 'Stremio HTTP'], {}, async () => { called = true; }),
    /no web requests were made/,
  );
  assert.equal(called, false);
});
