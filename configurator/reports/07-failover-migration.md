# 07 — nzbFailover → failover migration (2026-09-22)

Intentional generation change, recorded per the `preflight-json-fixture` rule.

## Why (two live save rejections, one dead setting)

Upstream renamed `nzbFailover` to the generic `failover` (Usenet + debrid) and
migrates the legacy spelling inside `applyMigrations`, which runs BEFORE
`UserDataSchema.safeParse` (`validateConfig`, utils/config.ts). The migration
passes `position` through blindly into the new enum
(`beforeSEL` / `beforeLimiting` / `last`). Core Builds emitted two values
outside that enum:

- the before-torrents Fine-Tune option wrote `position: 'first'` (builders);
- `Templates/Core-Builds-Base-Config.json` carried `position: 'after'`.

Both reject the whole save at the host (zod enum violation, unconditional on
`enabled`). Separately, the Fine-Tune count was emitted as `maxFailoverNzbs`,
which upstream never reads (the migration reads `.count`) — the v3.0 known gap.

## The migration

- Builders (app.js + both packages/core builders) emit `failover` directly:
  `{enabled:true, contentTypes:['usenet','debrid'], maxAttempts:<count>}` plus
  `position:'beforeLimiting'` only for before-torrents; after-torrents omits
  position (= upstream default `last`). Disabled stays `{enabled:false}`.
  `maxAttempts`/`parallel` are left unset-or-explicit so the host's userLimits
  validation (which THROWS above the ceiling, defaults 5/2) cannot fire on
  defaults.
- All 60 active static templates renamed in place (31 enabled gain Usenet +
  debrid coverage; the invalid `after` is dropped).
- C12 conflict check reads `failover?.enabled ?? nzbFailover?.enabled` and
  names whichever key is present (stale imports keep working).
- `validate_templates.py` warns on legacy `nzbFailover` in active lanes and
  errors on out-of-enum `failover.position`, `maxAttempts`/`parallel` < 1,
  and bad `contentTypes`. Legacy/Deprecated/Community lanes are excluded from
  the nag (frozen or third-party).
- UI relabelled to the generic feature (values stable for shared links).

## Regen proof

18/18 goldens reproduce byte-identically through the jsdom harness; the golden
diff is exactly the key rename (3 bytes × 18). CLI equivalence 75/0.

## Deliberately deferred (rival-template gaps needing live runs)

`excludedKeywords`, `episodeTitleMatching`, `requiredSeederRange` and
`languageInference` (all valid at v2.34.1, all used by a rival) can only REMOVE
streams — adopting them blind risks false-positive filtering the benchmark
variants were created to measure. They stay as single-variable variants until
a live run unblocks. `alwaysPrecache` (ang3lo) is NOT a gap: it is the legacy
spelling of `precacheSelector`, which 56/60 Core templates already ship.
