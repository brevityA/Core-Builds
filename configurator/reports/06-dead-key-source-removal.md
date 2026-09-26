# 06 — Dead-key source removal + v2.34.1 pin (2026-09-22)

Intentional generation change, recorded per the `preflight-json-fixture` rule
("update fixtures and say why in reports/").

## What changed in generated JSON

`applyNativeFilters` (both copies of `output-profile-policy.js`) wrote the dead
key `excludedStreamSources`; it now writes the live `excludedStreamTypes`
(`['youtube']`, merged with whatever the host gate appends). This is the ONLY
behavioural change to generated output:

- 14 Stable/Balanced goldens gain `youtube` in `excludedStreamTypes`
  (prepended — the policy runs before the host gate appends `http`/`p2p`).
- 4 Advanced/Labs goldens byte-identical (those profiles never call the filter).
- The dead-key emission removals (builders + `setResultLimits`) change no
  golden: the gate already stripped those keys, so output is identical.

## Why the key order is right

`excludedStreamTypes` moved from gate-appended-last to policy-inserted (right
after `excludedVisualTags`). Verified by construction: the policy creates no
other keys between its insertion point and the next key creation, and the gate
creates no other top-level keys at all.

## Regen proof (no browsers in sandbox)

Playwright CDN is unreachable from this environment, so regeneration ran
through a headless jsdom run of the freshly built bundle — one fresh app
instance per combo, matching the spec's per-page isolation (same procedure as
the 3.7.0 rebaseline recorded in the root CHANGELOG). Result: **18/18
reproduce byte-identically**, including key order. The CLI equivalence suite
(75/0) independently agrees with the same fixtures through the packages/core
pipeline.

## Pin bump (same release)

UPSTREAM.pin v2.34.0 e694b6a → v2.34.1 c1d044c2. `sync-upstream --accept` and
`--check` both green; all seven generated files differ by header stamps only.
The single upstream change inside the pinned sources (besides the version) is
a pure refactor (`MEDIA_INFO_QUALITY_TIERS` extraction in `ParsedFileSchema`,
not the user config) — confirmed via direct `git diff` of the two tags.
`LibraryPreset.supportedServices`, the regex-gate mirror and the safe-addon
audit were each re-verified identical at the new pin.
