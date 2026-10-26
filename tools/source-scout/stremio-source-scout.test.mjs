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
  const text = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === 'content-length' ? String(Buffer.byteLength(text)) : null },
    text: async () => text,
  };
}

test('safePublicUrl keeps public HTTPS links and removes credentials from query/hash', () => {
  assert.deepEqual(safePublicUrl('https://example.org/page?q=ok&api_key=private#section'), {
    url: 'https://example.org/page?q=ok',
    credentialsRedacted: true,
  });
  assert.equal(safePublicUrl('http://example.org/page'), null);
  assert.equal(safePublicUrl('https://user:pass@example.org/page'), null);
  assert.equal(safePublicUrl('https://127.0.0.1/page'), null);
  assert.equal(safePublicUrl('https://service.internal/page'), null);
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

test('GitHub adapter refuses oversized and non-JSON provider responses', async () => {
  await assert.rejects(searchGitHubRepositories('x', {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => String(3 * 1024 * 1024) },
      text: async () => '{}',
    }),
  }), /2 MiB limit/);
  await assert.rejects(searchGitHubRepositories('x', {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => '<html>not json</html>',
    }),
  }), /invalid JSON/);
});

test('merge retains different evidence types and Markdown explains limitations', () => {
  const results = [
    { kind: 'web_search_result', evidenceLabel: 'search snippet', query: 'q1', title: 'Candidate', url: 'https://github.com/owner/addon', snippet: 'May stream', indexAge: 'Yesterday', credentialsRedacted: false },
    { kind: 'github_repository', evidenceLabel: 'GitHub metadata', query: 'q2', title: 'owner/addon', url: 'https://github.com/owner/addon', archived: true, credentialsRedacted: false },
  ];
  const [finding] = mergeFindings(results);
  assert.equal(finding.evidence.length, 2);
  const markdown = renderMarkdown({ generatedAt: '2026-10-26T00:00:00.000Z', queries: ['q1'], providers: ['Brave'], findings: [finding] });
  assert.match(markdown, /not verified page contents/);
  assert.match(markdown, /Nothing here verifies a working Stremio manifest/);
  assert.match(markdown, /not a live-health check/);
});

test('run refuses missing credentials before network access', async () => {
  let called = false;
  await assert.rejects(
    run(['--query', 'Stremio HTTP'], {}, async () => { called = true; }),
    /no web requests were made/,
  );
  assert.equal(called, false);
});
