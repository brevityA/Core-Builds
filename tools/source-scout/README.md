# Stremio source scout

This is a **source-discovery and evidence-capture tool**, not a stream scraper or a player. It searches public web-index results and, optionally, GitHub repository metadata. Results are deliberately labelled by evidence type so search snippets cannot be mistaken for verified statements.

## Quick start

Requires Node.js 20+ (built-in `fetch`; no npm dependencies). Web search needs a Brave Search API subscription key stored in your own local environment. Do not paste it into chat, a command argument, a report, or a repository file.

```sh
export BRAVE_SEARCH_API_KEY='your-local-key'
node tools/source-scout/stremio-source-scout.mjs \
  --query 'Stremio direct HTTP stream addon' \
  --query 'Stremio public domain films addon' \
  --count 10 \
  --github
```

The command prints a Markdown evidence report. Add `--json` for a machine-readable report. It writes nothing to disk by default. To save a report, redirect it locally to a file excluded from Git or to a private workspace; search queries and results can reveal research interests.

```sh
node tools/source-scout/stremio-source-scout.mjs --help
```

`--github` uses GitHub's public repository search API without a credential; it is subject to GitHub's unauthenticated rate limits. Each run accepts at most five queries and requests at most 20 results per provider/query. The tool caps provider responses at 2 MiB, applies 12-second request deadlines, refuses redirects, accepts only public-looking HTTPS result URLs, and strips sensitive query parameters from displayed links. It never fetches the discovered add-on pages or manifests.

## How to read its evidence

- **Brave web search:** title, snippet, and page-age are index metadata. They are leads, not verified page contents, and can be stale or misleading.
- **GitHub repository search API:** fields such as repository name, archived flag, stars, and push timestamp are facts returned by that API at query time. They do not establish that a project works, serves a live manifest, or has permission to use its upstream sources.
- **Repeated search hits:** are not independent corroboration. The tool groups exact URLs but does not infer ownership or agreement between claims.
- **Not established:** manifest reachability, stream resolution, client playback, media quality, privacy/security, legal rights, terms compliance, or permission to forward/share a user's private configuration.

The tool does not crawl or scrape streaming sites, extract media links, bypass access controls, or generate Core Streams provider configurations. For a candidate, manually review its primary documentation/repository, its service terms, whether it requires personal cookies/API keys, and whether the actual content may be used in the intended territory. Only then consider an authorized, low-volume benchmark. Never store personalized manifest URLs or credentials in this repository.

## Tests

```sh
node --test tools/source-scout/stremio-source-scout.test.mjs
```
