# Upstream snapshots — Vidhin05/Releases-Regex

These files are **pinned snapshots of third-party upstream**, not Core Builds content:

| Snapshot | Upstream |
|---|---|
| `vidhin05-regexes.snapshot.json` | [`Vidhin05/Releases-Regex@main/English/regexes.json`](https://github.com/Vidhin05/Releases-Regex/blob/main/English/regexes.json) |
| `vidhin05-expressions.snapshot.json` | [`Vidhin05/Releases-Regex@main/English/expressions.json`](https://github.com/Vidhin05/Releases-Regex/blob/main/English/expressions.json) |

## Why they exist

41/48 active templates — and every configurator-generated template — live-sync ranked
regex and ranked stream expressions from these upstream URLs, and elfhosted validates
regex patterns against `regexes.json` by **exact string equality**. Any push upstream
changes ranking for every Core Builds user immediately.

The templates sync `@main` regardless of what we do here, so these snapshots don't
*pin* behaviour — they make upstream changes a **reviewed event**: the
`upstream-drift-watch.yml` workflow compares live upstream against these files daily
and opens an issue on drift, so we can review changes, re-generate affected templates,
and update `Filtering/ranked-regex-patterns.json` (the inline Core Builds subset that
must keep matching the whitelist) instead of finding out from user reports.

## Checking and updating

```bash
node scripts/check_upstream_drift.mjs            # compare live upstream vs snapshots
node scripts/check_upstream_drift.mjs --update   # re-pin after reviewing the drift
```

After `--update`: review `git diff`, commit the snapshots, and check whether
`Filtering/ranked-regex-patterns.json` needs re-syncing with any renamed/changed
whitelist patterns (drifted pattern strings cause "X/183 regexes not allowed" import
errors on elfhosted).
