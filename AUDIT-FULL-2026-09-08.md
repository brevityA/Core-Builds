# Full repository security audit — 2026-09-08

Scope: every tracked surface of `brevityA/Core-Builds` — the Cloudflare
Worker, the configurator + account-tools + standalone tool pages, all GitHub
Actions workflows, all Python/shell/JS scripts, every JSON template/data file,
and repository hygiene (ignore rules, secret scanning, SECURITY.md).
Method: whole-tree high-confidence secret-pattern scan (incl. git history),
credential-shaped data scan of template stores, workflow supply-chain review
(events, permissions, secrets, `pull_request_target`, script injection),
external-dependency review (npm audit × 3, pinned versions), per-surface code
review of credential flows and DOM sinks. Result: **no live credentials found
anywhere in the tree or its history.**

This file records the complete pass. Findings already fixed in earlier passes
on this branch are marked ✅ (commits below); everything new from this pass is
marked 🆕. Owner actions that only you can perform are listed at the end.

Branch commits this report covers (PR #740):
`3e371c6` stats hostname filter · `36d0ee9` worker minimal disclosure +
lane scopes · `65591d8` webhook CI tripwire · `02ebb4e` configurator CSP/XSS
· `b7ecfe4` configurator audit report · plus the commits from this pass.

---

## 1. Credential exposure (whole tree + history)

| Check | Result |
|---|---|
| GitHub tokens (`ghp_`, `github_pat_`, `gho_`, `ghu_`, `ghs_`, `ghr_`) | ✅ none |
| Slack tokens (`xoxb/a/p/r/s`), Stripe (`sk_live`/`pk_live`), GitLab `glpat_`, generic `geheim_` | ✅ none |
| AWS (`AKIA`/`ASIA`), Google (`AIza`, `ya29.` OAuth), private keys (RSA/EC/OpenSSH/DSA/PGP) | ✅ none |
| Discord webhook URLs (plaintext **and** base64/base64url, incl. git history) | ✅ none — CI gate added 09-08 (`secret-scan.yml`) blocks all forms |
| URL-embedded credentials (`https://user:pass@host`) | ✅ none |
| Env-style secret assignments (`SECRET_KEY=…`, `DATABASE_URL=…`, `TOKEN=…`) in code/scripts | ✅ none (only all-zero test fixtures) |
| Credential-shaped values in template JSON (`apiKey`/`token`/`password` fields, 4 MB collection incl.) | ✅ all `<template_placeholder>` / empty — no real values |
| `.env` / `.dev.vars` / `.npmrc` / `.pypirc` / `.netrc` / `.pem` / `.key` tracked | ✅ none tracked; 🆕 `.dev.vars`, `.env`, `.env.local` added to `.gitignore` (previous pass) |
| Reddit/Discord/webhook secrets in workflows | ✅ referenced by name only (`${{ secrets.* }}`); scripts read env, never echo |

🆕 **CI now enforces this**: `secret-scan.yml` (push to main + every PR) blocks
Discord webhooks in plaintext/base64 and the full high-confidence credential
shape set above (binary files excluded; markdown included). Verified: passes
clean on the current tree; catches planted plaintext and encoded webhooks.

Recommended (owner, needs GitHub settings or a binary we cannot run here):
- Enable **push protection** for secret scanning (Settings → Code security &
  analysis) so secrets never reach a commit in the first place.
- Add **gitleaks** (`gitleaks/gitleaks-action`) as a second engine — stronger
  entropy rules than the regex set. Skipped in this pass only because the
  sandbox could not download the binary to pre-tune its false-positive
  allowlist against this tree.

## 2. Cloudflare Worker (`cloudflare-worker/`) — ✅ hardened on this branch

Prior findings all fixed in commits `3e371c6` + `36d0ee9` (see
`cloudflare-worker/EXPOSURE-CHECK-2026-09-07.md`):
- `/api/stats` public = `{visits, generates}` only; full counters/breakdowns
  moved behind `Authorization: Bearer ADMIN_TOKEN` (env secret, ≥16 chars or
  disabled, constant-time compare, never cached).
- `/healthz` public = `{ok, version}`; bindings/breakers are operator-token-only.
- Allowlisted hosts are lane-scoped (AIOStreams config/manifest surface,
  WuPlay genie endpoints, TorBox speedtest); allowlisting alone grants no
  any-path relay; no fallback into the custom lane.
- Legacy private-hostname/SSRF-canary KV keys no longer published (filtered
  at read time; KV purge optional, script on request).
- 81/81 unit tests pass. Deploy + `wrangler secret put ADMIN_TOKEN` still
  pending (owner).

## 3. Configurator (`configurator/`) — ✅ hardened on this branch

See `configurator/reports/04-exposure-check-2026-09-08.md`. Fixes in commit
`02ebb4e` (484/484 unit tests pass):
- CSP: added `frame-src 'none'; object-src 'none'; worker-src 'none';
  frame-ancestors 'none'`; added `Referrer-Policy: no-referrer`
  (manifest URLs carry `<uuid>/<password>`).
- Update banner now escapes changelog versions/bodies + `p.from`/`p.to`
  (remote, template-controlled content reached the DOM unescaped before).

Verified-solid (no action): import/share links strip credentials recursively
before any upload; error logger is local-only with masked context; Stremio
creds go only to `api.strem.io`; beacons carry no credential data.

## 4. account-tools — 🆕 light hardening applied

Manages Stremio addon collections. Findings:
- ✅ Stremio authKey/email held **in memory only** (no localStorage); CSP
  present; connect-src restricted to `api.strem.io`; no external assets.
- 🆕 **Fixed**: added `frame-src 'none'`, `object-src 'none'`,
  `worker-src 'none'`, `img-src 'self' data: https:` and a
  `Referrer-Policy: no-referrer` meta. (The page stores no credentials and
  fetches only Stremio, but should it ever handle a session secret in a URL,
  no navigation may leak it.)
- npm audit: 0 vulnerabilities.

## 5. GitHub Actions supply-chain review — 🆕 hardened

Reviewed all 33 workflows for: dangerous events, missing permissions,
secrets in PR-triggered contexts, script injection via `github.event.*`,
checkout of untrusted refs, unpinned actions.

| Finding | Status |
|---|---|
| `welcome.yml` uses `pull_request_target` | ✅ Safe pattern: `actions/first-interaction` only, no checkout, no `run:`, token scoped `issues/pull-requests: write`. Left as-is |
| No `github.event.*` interpolated into `run:`/`env:` anywhere | ✅ none (one maintainer-only `release.tag_name` usage in `release.yml` — insider context, noted) |
| All jobs declare job-level `permissions:` | ✅ good baseline |
| 🆕 12 workflows had no **workflow-level** default `permissions:` | 🆕 **Fixed**: added `permissions: contents: read` default to auto-responder, bulk-release, codeql, issue-labeler, labeler, reddit-post, release, stale, sync-labels, sync-upstream, watch-aiostreams, welcome — defense-in-depth so any future job added without explicit scopes runs least-privileged. Job-level overrides unchanged; all 12 files YAML-validated |
| Dependabot | ✅ present for github-actions (monthly) + npm (weekly × 3 packages) |
| Actions pinned to tags (not SHAs) | ⚠️ Recommendation (owner): enable dependabot security updates for actions and consider SHA-pinning critical workflows. Tags + dependabot is acceptable for this repo's risk level |

## 6. Scripts (Python/shell/Node) — ✅ no issues

- `.github/scripts/bulk_release.py`, `post_to_reddit.py`: env-only secrets,
  argv-based subprocess calls (no `shell=True` with untrusted input).
- `scripts/announce-discord.sh`: reads `$WEBHOOK_URL` from env, never echoes;
  workflows pass it from secrets only.
- `scripts/aios-regen/` (upstream template regeneration): no credentials in
  code; `sync-upstream.yml` fetches one pinned upstream regex file.
- `push-and-open-prs.sh`: `--force-with-lease` only (safe force), no tokens.
- Root Python (`validate_templates.py`, `generate_pdf_v7.py`, build scripts):
  covered by the whole-tree secret scan — clean.
- `requirements.txt`: pytest only.

## 7. Standalone tool pages (`tools/*`, `Assets/*`) — findings & note

Sampled all 18 HTML pages: **most have no CSP meta and no referrer policy**
(badges, speedtest, preflight, genies, banner-studio, inspector …). They are
static single-file apps on GitHub Pages holding no credentials (keys stay in
the user's session/memory or go straight to the worker proxy), so exposure is
low — but they have no clickjacking/XSS-blast-radius defense and `tools/
badges/index.html` loads JSZip from cdnjs **without SRI**.

⚠️ Owner recommendations (not auto-applied — each page's CSP needs its real
fetch list, and an SRI hash must match cdnjs exactly):
1. Add per-page CSP metas (`frame-ancestors 'none'`, `object-src 'none'` at
   minimum) + `no-referrer` — start with pages that navigate to manifest URLs
   (genies, preflight) or post data (badges).
2. Add `integrity="sha384-…"` + `crossorigin="anonymous"` to the cdnjs JSZip
   include in `tools/badges/index.html` (compute against the exact 3.10.1
   artifact). Sandbox egress to cdnjs was blocked, so the hash was not
   fabricated here.

## 8. Dependencies — ✅ clean

- `configurator`: npm audit **0 vulnerabilities** (484/484 unit tests).
- `account-tools`: npm audit **0 vulnerabilities**.
- `cli`: npm audit **0 vulnerabilities**.
- Python: pytest only, no pinned third-party runtime deps in this repo.

## 9. Hygiene — ✅ good

- SECURITY.md with private reporting path (GitHub advisory + Ko-fi) ✅.
- CODEOWNERS present; `.gitattributes` present.
- Secret-scan CI gate added (section 1) 🆕.
- Git history is shallow (single import commit + this branch) — no historical
  secret layers beyond what was scanned.

---

## Owner actions checklist (only you can do these)

1. **Deploy the worker**: `cd cloudflare-worker && npx wrangler deploy`, then
   `npx wrangler secret put ADMIN_TOKEN` (≥16 chars, `openssl rand -hex 24`),
   per environment. Optionally mirror as GitHub secret `STATS_ADMIN_TOKEN`.
2. **Rotate the Discord webhook** in Discord if not done since 2026-09-03 (the
   old deleted `worker-contact-endpoint.js` history held a live URL), then keep
   it secret-only.
3. **Delete the orphaned live `core-builds-counter` worker** in the Cloudflare
   dashboard (older build sharing the production STATS KV).
4. **Enable GitHub push protection** for secret scanning; consider the
   gitleaks action and SHA-pinning of actions (section 5).
5. **Tool pages**: add CSP + `no-referrer` per page and SRI to the cdnjs
   include (section 7).
6. Optional: purge legacy `proxy:*`/`proxy_err:*` KV canary keys (script on
   request); badge-builder `/upload` → `/paste` one-liner
   (`tools/badges/index.html:1029`).
