# Core Builds — SEL Expression Rules & Pitfalls

Reference for writing and validating Stream Expression Language (SEL) expressions across Core Builds templates. Covers rules that have caused real failures in production.

---

## Expression Types

| Field | Purpose | Evaluated |
|---|---|---|
| `preferredStreamExpressions` (PSE) | Rank streams — returns streams to show in priority order | Per tier, highest first |
| `excludedStreamExpressions` (ESE) | Remove streams — returns streams to exclude | Each active expression |
| `includedStreamExpressions` (ISE) | Passthrough streams — returns streams to exempt from exclusion | Each active expression |
| `rankedStreamExpressions` (RSE) | Define named tiers referenced by `rseMatched()` | Named, loaded externally |

---

## Rule 1 — Parenthesis Balance

**Every expression must have equal opening and closing parentheses.**

The AIOStreams expression parser uses the `expr-eval` library. When `closes > opens`, the parser completes a valid sub-expression at the balance point, then hits the extra `)` and throws:

```
parse error [1:N]: Expected EOF
```

**How to check:**

```python
expr = '...'
assert expr.count('(') == expr.count(')')
```

**Common mistake — nested ternary with extra wrapper paren:**

```js
// ❌ WRONG — one extra ) at end
count(...)>=4 ? IQR_expr : count(...)>0 ? minmax_expr : ((count(fallback)>=1 ? fallback_expr : []))

// ✓ CORRECT
count(...)>=4 ? IQR_expr : count(...)>0 ? minmax_expr : ((count(fallback)>=1 ? fallback_expr : []))
//                                                        ^^ opens 2              close 2 ^^ ✓
```

The IQR three-tier PSE pattern uses `:(( ... ))` — two opening parens require exactly two closing parens after the `[]` else branch. Adding one extra `)` to close the outer ternary incorrectly produces `:[)))` instead of `:[))`.

**Audit script (run before committing):**

```python
import json, glob

for f in glob.glob('Templates/Torbox/**/*.json', recursive=True):
    if 'Deprecated' in f: continue
    d = json.load(open(f))
    cfg = d.get('config', {})
    for field in ['preferredStreamExpressions', 'excludedStreamExpressions',
                  'includedStreamExpressions']:
        for e in cfg.get(field, []):
            if not isinstance(e, dict): continue
            expr = e.get('expression', '')
            opens, closes = expr.count('('), expr.count(')')
            if opens != closes:
                print(f'IMBALANCED: {f} [{field}] diff={closes-opens}')
                print(f'  {expr[:80]}')
```

---

## Rule 2 — No `rseMatched` With Tier Names in Inline Expressions

`rseMatched(streams, 'Tier Name', ...)` references RSE tier names that are loaded from `syncedRankedStreamExpressionUrls`. On public AIOStreams instances (elfhosted, fortheweak.cloud), that URL is blocked — the RSE tiers are never defined — and any `rseMatched` call with a tier name throws:

```
Invalid stream expression: /*expression label*/...
```

**Bad (broken on public instances):**
```js
// ❌ References RSE tier names that may not be loaded
count(rseMatched(resolution(streams, '2160p'), 'BD T1', 'Remux T1', 'Web T1')) == 0
```

**Good replacements by use case:**

| Original intent | Safe replacement |
|---|---|
| Check for any quality anime 4K | `count(seadex(resolution(streams, '2160p'))) == 0` |
| Check for 4K Remux present | `count(quality(resolution(streams, '2160p'), 'Bluray REMUX')) == 0` |
| Check for 1080p Remux present | `count(quality(resolution(streams, '1080p'), 'Bluray REMUX')) == 0` |
| PSE tier fallback | Replace `rseMatched(streams, 'T1', 'T2', ...)` with bare `streams` |

**Audit:**

```python
import re
pattern = re.compile(r"rseMatched\([^,]+,\s*'[A-Z]")  # tier names start uppercase
for e in expressions:
    if pattern.search(e.get('expression', '')):
        print('RSE TIER REF:', e.get('expression', '')[:80])
```

---

## Rule 3 — Synced URL Blocking on Public Instances

Public AIOStreams instances block certain external URLs in synced config fields:

| Field | Blocked on public | Safe alternative |
|---|---|---|
| `syncedRankedRegexUrls` | ✗ Always blocked | Embed patterns inline in `rankedRegexPatterns` |
| `syncedRankedStreamExpressionUrls` (Vidhin05) | ✗ Blocked | Remove; inline RSE tiers or remove `rseMatched` references |
| `syncedPreferredStreamExpressionUrls` (Core Builds PSEs) | ⚠ Works if RSE URL works | Keep; but fix any `rseMatched` in synced PSEs |
| `syncedIncludedStreamExpressionUrls` (Core Builds ISEs) | ✓ Works | Keep |
| `syncedRankedRegexUrls` (jsdelivr CDN) | ✓ Works | Safe to use |

**Key constraint:** If `syncedRankedStreamExpressionUrls` is blocked and synced PSEs call `rseMatched(streams, 'tier_name')`, every one of those PSEs will fail.

---

## Rule 4 — Context Variables Are Version-Dependent

Some SEL context variables were added in later AIOStreams versions. Using them on an instance running an older version throws "Invalid stream expression" even if the syntax is valid.

| Variable | Notes |
|---|---|
| `daysSinceRelease` | Used in pow() decay tier; verify AIOStreams version supports it |
| `isAnime` | Available in all current versions |
| `originalLanguage` | Available in all current versions |
| `ongoingSeason` | Available in all current versions |
| `queryType` | Available in all current versions |
| `daysSinceLastAired` | Available in all current versions |
| `daysUntilNextEpisode` | Available in all current versions |
| `genres` | Available in all current versions |

**The `daysSinceRelease` pow() decay pattern** — used in Core Builds IQR PSEs:

```js
// Tier 3 (0-peer fallback): exponential decay window
((count(bitrate(streams, median*(1-0.4*pow(0.95,daysSinceRelease)),
                          median*(1+0.4*pow(0.95,daysSinceRelease))))>=1
  ? bitrate(streams, median*(1-0.4*pow(0.95,daysSinceRelease)))
  : []))
```

- Day 0: ±40% window around median
- Day 30: ±9%
- Day 60: ±2%
- Day 90+: effectively 0% (no results → falls through to next PSE tier)

---

## Rule 5 — Ternary Chain Parenthesization

The AIOStreams SEL parser follows standard operator precedence. Chained ternaries (`a ? b : c ? d : e`) are right-associative, but adding explicit parentheses prevents ambiguity and makes nesting explicit.

**Core Builds IQR three-tier pattern:**

```js
count(PEER_EXPR) >= 4
  ? /* Tier 1: IQR Tukey fence */
    bitrate(STREAMS, q1(values(STREAMS,'bitrate')) - 1.5*iqr(values(STREAMS,'bitrate')),
                     q3(values(STREAMS,'bitrate')) + 1.5*iqr(values(STREAMS,'bitrate')))
  : count(PEER_EXPR) > 0
    ? /* Tier 2: min/max ±20% */
      bitrate(STREAMS, min(values(STREAMS,'bitrate'))*0.80,
                       max(values(STREAMS,'bitrate'))*1.20)
    : /* Tier 3: pow() decay or [] */
      ((count(bitrate(STREAMS, MEDIAN*(1-0.4*pow(0.95,daysSinceRelease)),
                               MEDIAN*(1+0.4*pow(0.95,daysSinceRelease))))>=1
        ? bitrate(STREAMS, MEDIAN*(1-0.4*pow(0.95,daysSinceRelease)))
        : []))       // ← exactly 2 ) after []
```

The `:(( ... ))` wrapper around the third tier uses exactly two opening parens and must close with exactly two `)` after `[]`.

---

## Rule 6 — ESE Expressions Return Streams to EXCLUDE

An active ESE expression that returns a non-empty list **removes those streams** from results. Returning `[]` means "exclude nothing based on this rule."

```js
// ESE that excludes all CAM streams
quality(streams, 'CAM', 'SCR', 'TS', 'TC')

// ESE that excludes nothing (placeholder / label-only)
/*Standard ESE v2.0*/[]
```

`passthrough(streams, 'excluded')` inside an ESE marks the returned streams as **exempt from exclusion** (bypasses other ESEs), not excluded.

---

## Rule 7 — ISE / RSE Cannot Use passthrough

`passthrough()` is only valid in ESE context. Using it in an ISE or RSE will be silently ignored or cause unexpected behavior.

---

## Quick Reference — Audit Commands

```bash
# Run full test suite (validates JSON structure, not expression syntax)
python3 -m pytest tests/ -q

# Check paren balance across all active templates
python3 -c "
import json, glob
ok = True
for f in sorted(glob.glob('Templates/Torbox/**/*.json', recursive=True)):
    if 'Deprecated' in f: continue
    d = json.load(open(f))
    cfg = d.get('config', {})
    for field in ['preferredStreamExpressions','excludedStreamExpressions','includedStreamExpressions']:
        for e in cfg.get(field, []):
            if not isinstance(e, dict): continue
            expr = e.get('expression','')
            if expr.count('(') != expr.count(')'):
                print('UNBALANCED:', f, expr[:60])
                ok = False
print('All balanced' if ok else 'Issues found')
"

# Check for rseMatched tier-name references
python3 -c "
import json, glob, re
pat = re.compile(r\"rseMatched\([^,]+,\s*'\")
for f in sorted(glob.glob('Templates/Torbox/**/*.json', recursive=True)):
    if 'Deprecated' in f: continue
    d = json.load(open(f))
    cfg = d.get('config', {})
    for field in ['preferredStreamExpressions','excludedStreamExpressions','includedStreamExpressions']:
        for e in cfg.get(field, []):
            if isinstance(e, dict) and pat.search(e.get('expression','')):
                print('RSE REF:', f, e.get('expression','')[:70])
print('Scan done')
"
```

---

## Changelog

| Version | Change |
|---|---|
| v2.8.2 | Removed `rseMatched` tier references from all inline PSEs and ESEs (98 expressions, 23 templates) |
| v2.8.2 | Fixed extra `)` in IQR pow() PSEs — parse error at position ~1988 (24 expressions, 6 templates) |
| v2.8.1 | Hard resolution ESE added to `core-nexus-stream` — PSEs rank but do not exclude |
