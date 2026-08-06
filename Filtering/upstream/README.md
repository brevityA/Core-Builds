# Upstream snapshots — Vidhin05/Releases-Regex

These files are **reviewed third-party regex snapshots**, not Core Builds content.

| Snapshot | Upstream |
|---|---|
| `vidhin05-regexes.snapshot.json` | [`Vidhin05/Releases-Regex@main/English/regexes.json`](https://github.com/Vidhin05/Releases-Regex/blob/main/English/regexes.json) |

## Local-expression policy

Core Builds does **not** use synced stream-expression URLs. In particular, it must not
ship values in any of these fields:

- `syncedRankedStreamExpressionUrls`
- `syncedPreferredStreamExpressionUrls`
- `syncedIncludedStreamExpressionUrls`
- `syncedExcludedStreamExpressionUrls`

Local expressions and any local ranked-expression tiers must be committed directly to
the template and validated before release.

## Why the regex snapshot exists

Some host configurations validate regex patterns against upstream content. The snapshot
makes an upstream regex change a reviewed event rather than a silent dependency change.
It does not authorise synced stream expressions or external SEL runtime dependencies.

## Checking and updating the regex snapshot

```bash
node scripts/check_upstream_drift.mjs            # compare live regexes vs snapshot
node scripts/check_upstream_drift.mjs --update   # re-pin after review
```

After `--update`, review `git diff` and confirm whether
`Filtering/ranked-regex-patterns.json` needs a deliberate local update.
