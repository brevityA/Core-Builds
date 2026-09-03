# Generation snapshots

`*.json` here are full snapshots of `generateTemplate()` output for the fixed
inputs in `../preflight-json-fixture.test.mjs`. They exist to prove the
pre-flight refinement is **read-only**: it must not change generated JSON.

## Provenance

Captured from generation modules verified byte-identical to base commit
`81c802b`:

```
git diff --quiet 81c802b -- \
  src/core/generate-template.js src/core/assemble-template.js \
  src/core/sort-policy.js src/core/filter-policy.js
```

That check is what makes these a valid *pre-change* baseline rather than a
snapshot of whatever the code happens to do now.

## Why snapshots and not hashes

These were originally four sha256 digests. CodeQL flagged that as
`js/insufficient-password-hash` (high severity): `tmdbApiKey` reached a fast
digest. Filtering the credential fields inside the hash helper did **not** clear
the alert — the tainted object still reaches the crypto sink, and a static
analyser cannot know a runtime filter removed the sensitive fields.

The underlying mistake was using a cryptographic hash for something that is not
a security operation. This is change detection, so a committed snapshot is the
honest tool. It removes the crypto sink entirely and gives a readable diff when
output genuinely changes, instead of reporting that two hex strings differ.

Credential-shaped fields (`apikey|token|password|secret|passwd|credential`, case
insensitive) are stripped from these files and asserted separately by name in
the test, so a leaked secret fails with the offending field rather than a
mystery diff.

## Equivalence to the previous baseline

The original full-object sha256 values still reproduce exactly over the same
generated output, which is what confirms only the *comparison method* changed:

| fixture | legacy sha256 (first 16) |
| --- | --- |
| `torbox-4k-shield-clean` | `d7e2938bc8fc7ed7` |
| `torbox-1080p-firestick-hd-blocked-device` | `ea2ddb65ecd6903b` |
| `torbox-4k-firestick-hd-conflict` | `f1d6f71b3276b2ea` |
| `p2p-1080p-free` | `f91821cea7f8d032` |

## Regenerating

Only when a change to generated output is **intentional**. Update the snapshot,
explain why in `reports/`, and re-verify the provenance command above.
