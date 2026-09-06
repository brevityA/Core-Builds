#!/usr/bin/env python3
"""Canonical regex re-sync for the standalone template fleet.

Pipeline position (see CLAUDE.md "Template Builder" / drift-watch sections):

    upstream live list
      └─ node scripts/check_upstream_drift.mjs --update     (re-pins the snapshot)
           └─ THIS SCRIPT (regenerates every derived copy from the snapshot)
                ├─ Filtering/ranked-regex-patterns.json    (reviewed subset, patterns refreshed)
                ├─ Templates/** active lanes               (inline copies refreshed + version/changelog)
                ├─ configurator/src/js/app.js              (embedded regex consts refreshed —
                │    the host-capability gate strips any embedded copy whose text has left the
                │    pinned snapshot, so these consts are derived data, not hand-maintained)
                ├─ cli/data/ranked-regex.json              (CLI mirror of the Common+UHD lists —
                │    must stay text-identical to the configurator copies or CLI/golden
                │    equivalence drifts the moment the allowlist moves)
                └─ exit codes / --check mode for CI

Why this exists: standalone templates embed an inline copy of Vidhin05's ranked
regex list (public hosts whitelist exactly that list; anything that drifted
between pins trips the "X/Y regexes are not allowed" save rejection — the
ElfHosted 6/182 class). The inline copies must never be hand-edited: they are
re-derived here from the re-pinned snapshot.

Derivation rules (deterministic, provenance-checked):
  * An embedded pattern is a "synced copy" iff its normalized text equals a
    pinned (--old-snapshot) entry's normalized text. Synced copies are replaced
    with the current-snapshot pattern for the same (name, occurrence-index)
    slot; "[B]"/"[C]" name suffixes in the reviewed list mean 2nd/3rd upstream
    entry of the base name (upstream reuses names for tier variants).
  * Patterns with no provenance in the old snapshot are Core-Builds custom
    (e.g. the Personal-lane file-extension blocker) and are left untouched.
  * Curated-list membership is a human-reviewed selection; this script NEVER
    adds or removes entries, it only refreshes pattern text of existing ones.
  * New upstream entries (FAND class) surface as report lines for review.

Lanes in scope: Templates/** except Legacy/ (frozen), Deprecated/ (archived;
ships #671-class stubs with no generator), and Personal/ (user-specific).

Usage:
  python3 scripts/sync_ranked_regex.py --apply --old-snapshot <file>
  python3 scripts/sync_ranked_regex.py --check          # exit 1 if any inline
                                                        # copy is stale vs snapshot
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / 'Filtering' / 'upstream' / 'vidhin05-regexes.snapshot.json'
RANKED = ROOT / 'Filtering' / 'ranked-regex-patterns.json'
TEMPLATES = ROOT / 'Templates'
APP_JS = ROOT / 'configurator' / 'src' / 'js' / 'app.js'
CLI_RANKED = ROOT / 'cli' / 'data' / 'ranked-regex.json'
APP_CONST_NAMES = ('EXCLUDED_REGEX', 'PREFERRED_REGEX_4K', 'RANKED_REGEX_COMMON', 'RANKED_REGEX_UHD')
APP_CONST_RE = re.compile(r'^const (' + '|'.join(APP_CONST_NAMES) + r') = (\[.*\]);$', re.M)

REGEX_FIELDS = ('rankedRegexPatterns', 'preferredRegexPatterns',
                'excludedRegexPatterns', 'regexOverrides')
OCC_RE = re.compile(r'^(.*?) (?:\[(B|C|D)\])$')


def norm(p):
    """Strip the /…/flags wrapper to compare pattern bodies."""
    s = str(p).strip()
    if s.startswith('/') and s.rfind('/') > 0:
        s = s[1:s.rfind('/')]
    return s


def wrapped_like(template_str, new_wrapped):
    """Return new_wrapped, or its unwrapped form if template_str was unwrapped."""
    if template_str.startswith('/') and template_str.rfind('/') > 0:
        return new_wrapped
    s = new_wrapped
    if s.startswith('/') and s.rfind('/') > 0:
        s = s[1:s.rfind('/')]
    return s


def slot_map(entries):
    """(name, occurrence) -> position for a pattern-list (upstream file order)."""
    counts, out = {}, []
    for i, e in enumerate(entries):
        base, occ = split_name(e.get('name', ''))
        k = (base, counts.get((base, occ), 0))
        counts[(base, occ)] = counts.get((base, occ), 0) + 1
        out.append((base, k[1]))
    return out, counts


def split_name(name):
    """'Radarr HD Bluray T1 [B]' -> ('Radarr HD Bluray T1', 1); '[C]' -> 2."""
    m = OCC_RE.match(name or '')
    if m:
        return m.group(1), 'BCD'.index(m.group(2)) + 1
    return (name or ''), 0


def build_old_map(old_entries):
    """norm(pattern) -> list of (name, occurrence) slots it occupies in old."""
    slots, _ = slot_map(old_entries)
    m = {}
    for i, e in enumerate(old_entries):
        m.setdefault(norm(e.get('pattern', '')), []).append(slots[i])
    return m


def build_new_lookup(new_entries):
    """(name, occurrence) -> raw pattern string, in current snapshot order."""
    slots, _ = slot_map(new_entries)
    lookup = {}
    by_norm = {norm(e.get('pattern', '')): e.get('pattern', '') for e in new_entries}
    for i, e in enumerate(new_entries):
        lookup.setdefault(slots[i], e.get('pattern', ''))
    return lookup, by_norm


def pattern_at(slot, old_entries, new_lookup, new_norm_set):
    """Current-snapshot pattern for an old slot, or None to leave the file alone."""
    base, occ = slot
    pat = new_lookup.get((base, occ))
    return pat


def sync_list(items, old_map, new_lookup, new_norm_set, new_entries, changes):
    """Update one config field's pattern list in place. items: list of str|dict."""
    touched = False
    if not items:
        return touched
    for idx, item in enumerate(items):
        if isinstance(item, dict):
            p = item.get('pattern')
        else:
            p = item
        if not isinstance(p, str) or not p.strip():
            continue
        slots = old_map.get(norm(p))
        if not slots:
            continue  # custom — leave untouched
        # pick the slot whose new text actually differs (and exists upstream now)
        replacement = None
        for slot in slots:
            pat = new_lookup.get(slot)
            if pat is not None and norm(pat) != norm(p):
                replacement = pat
                break
            if pat is None and norm(p) in new_norm_set:
                replacement = None  # still identical to something live — in sync
                break
        if replacement is not None:
            newp = wrapped_like(p, replacement)
            if isinstance(item, dict):
                item['pattern'] = newp
            else:
                items[idx] = newp
            changes.add(slot_display_name(slots[0]))
            touched = True
    return touched


def slot_display_name(slot):
    base, occ = slot
    return f'{base} [{chr(ord("A") + occ)}]' if occ else base


def dump(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False) + '\n'


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def _embed_lists():
    """Yield (label, items) for every derived embedded copy of the regex lists."""
    if APP_JS.exists():
        text = APP_JS.read_text(encoding='utf-8')
        for m in APP_CONST_RE.finditer(text):
            try:
                items = json.loads(m.group(2))
            except json.JSONDecodeError:
                print(f'note: app.js const {m.group(1)} is not JSON — left alone')
                continue
            if isinstance(items, list) and items:
                yield f'app.js:{m.group(1)}', items
    if CLI_RANKED.exists():
        obj = json.loads(CLI_RANKED.read_text(encoding='utf-8'))
        for key in ('common', 'uhd'):
            if isinstance(obj.get(key), list) and obj[key]:
                yield f'cli/data/ranked-regex.json:{key}', obj[key]


def check_embeds(new_norm_all):
    """Offenders for embedded copies — same rule as the template scan: any embedded
    pattern neither in the pinned snapshot nor a known custom is stale (the host gate
    strips it from generated output; CLI/golden equivalence silently diverges)."""
    offenders = []
    for label, items in _embed_lists():
        for item in items:
            p = item.get('pattern') if isinstance(item, dict) else item
            if isinstance(p, str) and p.strip():
                n = norm(p)
                if n not in new_norm_all and not is_known_custom(n):
                    offenders.append(f'{label}:{p[:48]}')
    return offenders


def sync_embeds(old_map, new_lookup, new_norm_set, new_entries, changes, apply):
    """Refresh the configurator/CLI embedded copies from the snapshot using the exact
    derivation rules already applied to templates (provenance-checked text refresh;
    membership/order never touched). Minimal diff: only the replaced string literals
    are rewritten, so const lines keep their original byte formatting."""
    n_files = 0
    if APP_JS.exists():
        text = APP_JS.read_text(encoding='utf-8')
        out, at, file_changed = [], 0, False
        for m in APP_CONST_RE.finditer(text):
            name, body = m.group(1), m.group(2)
            out.append(text[at:m.start(2)])
            try:
                before = json.loads(body)
            except json.JSONDecodeError:
                out.append(body); at = m.end(2); continue
            probe = json.loads(body)
            ch = set()
            if sync_list(probe, old_map, new_lookup, new_norm_set, new_entries, ch):
                for o, u in zip(before, probe):
                    os_ = o.get('pattern') if isinstance(o, dict) else o
                    us_ = u.get('pattern') if isinstance(u, dict) else u
                    if os_ != us_:
                        body = body.replace(json.dumps(os_, ensure_ascii=False),
                                            json.dumps(us_, ensure_ascii=False), 1)
                changes |= ch
                file_changed = True
                print(f'  ~ configurator/src/js/app.js:{name} ← {", ".join(sorted(ch))}')
            out.append(body)
            at = m.end(2)
        out.append(text[at:])
        if file_changed:
            n_files += 1
            if apply:
                APP_JS.write_text(''.join(out), encoding='utf-8')
    if CLI_RANKED.exists():
        raw = CLI_RANKED.read_text(encoding='utf-8')
        obj = json.loads(raw)
        file_changed = False
        for key in ('common', 'uhd'):
            items = obj.get(key)
            if not isinstance(items, list) or not items:
                continue
            before = [dict(x) if isinstance(x, dict) else x for x in items]
            ch = set()
            if sync_list(items, old_map, new_lookup, new_norm_set, new_entries, ch):
                for o, u in zip(before, items):
                    os_ = o.get('pattern') if isinstance(o, dict) else o
                    us_ = u.get('pattern') if isinstance(u, dict) else u
                    if os_ != us_:
                        raw = raw.replace(json.dumps(os_, ensure_ascii=False),
                                          json.dumps(us_, ensure_ascii=False), 1)
                changes |= ch
                file_changed = True
                print(f'  ~ cli/data/ranked-regex.json:{key} ← {", ".join(sorted(ch))}')
        if file_changed:
            n_files += 1
            if apply:
                # reparse the patched raw text so the file stays valid JSON, canonicalized
                json.loads(raw)
                CLI_RANKED.write_text(raw, encoding='utf-8')
    return n_files


def target_files(include_deprecated=False, include_personal=False):
    files = []
    for f in sorted(TEMPLATES.rglob('*.json')):
        parts = f.relative_to(TEMPLATES).parts
        rel = str(f.relative_to(ROOT))
        if parts[0] == 'Legacy':
            continue
        if parts[0] == 'Personal' and not include_personal:
            continue  # user-specific lane — skipped by default (see report)
        if 'Deprecated' in parts and not include_deprecated:
            continue
        files.append(f)
    return files


def git_show_head(path):
    return json.loads(subprocess.run(
        ['git', '-C', str(ROOT), 'show', f'HEAD:{path}'],
        capture_output=True, text=True, check=True).stdout)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--old-snapshot', default=None,
                    help='pre-update pinned snapshot json (default: git HEAD copy)')
    ap.add_argument('--include-deprecated', action='store_true')
    ap.add_argument('--include-personal', action='store_true',
                    help='also re-derive shared copies inside Templates/Personal (user lane)')
    args = ap.parse_args()
    if not (args.apply or args.check):
        ap.error('pick --apply or --check')

    new_entries = load(SNAPSHOT)
    if args.old_snapshot:
        old_entries = load(Path(args.old_snapshot))
    else:
        old_entries = git_show_head('Filtering/upstream/vidhin05-regexes.snapshot.json')

    old_map = build_old_map(old_entries)
    new_lookup, new_norm_set = build_new_lookup(new_entries)
    new_norm_all = {norm(e.get('pattern', '')) for e in new_entries}
    old_norm_all = {norm(e.get('pattern', '')) for e in old_entries}

    stale_now = sorted(new_norm_all - old_norm_all)   # added/changed upstream
    gone_now = sorted(old_norm_all - new_norm_all)

    if args.check:
        offenders = []
        scan_files = target_files(args.include_deprecated, args.include_personal)
        for f in scan_files:
            d = load(f)
            if not isinstance(d, dict) or 'config' not in d:
                continue
            for fld in REGEX_FIELDS:
                for item in (d['config'].get(fld) or []):
                    p = item.get('pattern') if isinstance(item, dict) else item
                    if isinstance(p, str) and p.strip():
                        n = norm(p)
                        if n not in new_norm_all and not is_known_custom(n):
                            offenders.append(f'{f.relative_to(ROOT)}:{fld}:{p[:40]}')
        offenders += check_embeds(new_norm_all)
        if offenders:
            print(f'❌ {len(offenders)} inline pattern(s) not synced to the pinned snapshot:')
            for o in offenders:
                print('   ', o)
            sys.exit(1)
        print(f'✅ every inline regex copy (templates, configurator consts, CLI data) '
              f'is synced to the pinned snapshot '
              f'({len(new_entries)} upstream patterns, '
              f'{len(scan_files)} files scanned; '
              f'custom patterns exempt: {len(CUSTOM_OK)})')
        return

    # ── --apply: regenerate derived artifacts ─────────────────────────────
    changes = set()
    updated_files, file_changes = [], {}

    # 1. reviewed ranked list (Filtering/ranked-regex-patterns.json)
    ranked = load(RANKED)
    rchanges = set()
    if sync_list(ranked, old_map, new_lookup, new_norm_set, new_entries, rchanges):
        if args.apply:
            RANKED.write_text(dump(ranked), encoding='utf-8')
        print(f'reranked: Filtering/ranked-regex-patterns.json refreshed {sorted(rchanges)}')
    # sanity: curated list must remain a subset of the snapshot
    assert {norm(e['pattern']) for e in ranked} <= new_norm_all, \
        'reviewed list contains a pattern that is neither upstream nor custom'

    # 2. active templates
    for f in target_files(args.include_deprecated, args.include_personal):
        d = load(f)
        if not isinstance(d, dict) or 'config' not in d:
            continue
        ch = set()
        for fld in REGEX_FIELDS:
            sync_list(d['config'].get(fld), old_map, new_lookup, new_norm_set, new_entries, ch)
        if ch:
            meta = d['metadata']
            v = meta.get('version', '1.0.0')
            bits = v.split('.')
            bits[-1] = str(int(bits[-1]) + 1)
            newv = '.'.join(bits)
            meta['version'] = newv
            meta['changelog'] = [{
                'date': '2026-09-05',
                'version': newv,
                'content': ('Inline regex sync: patterns re-derived from the current '
                           'Vidhin05 English ranked list (' + ', '.join(sorted(ch)) +
                           '). No filter/sort/formatter changes.'),
            }]
            fpath = str(f.relative_to(ROOT))
            if args.apply:
                f.write_text(dump(d), encoding='utf-8')
            updated_files.append(fpath)
            file_changes[fpath] = sorted(ch)
        changes |= ch

    # 3. configurator/CLI embedded copies (app.js regex consts + cli/data mirror)
    embed_changes = set()
    n_embed = sync_embeds(old_map, new_lookup, new_norm_set, new_entries, embed_changes, args.apply)
    changes |= embed_changes

    print(f'\n{"APPLIED" if args.apply else "DRY RUN"}: {len(updated_files)} template file(s) '
          f'changed; {n_embed} embedded copy(ies) refreshed; '
          f'upstream names refreshed: {len(changes or rchanges)}')
    for f in updated_files:
        print(f'   ~ {f}  ← {", ".join(file_changes[f])}')
    if stale_now:
        print(f'\nnote: {len(stale_now)} upstream pattern(s) added/changed at source '
              f'(reviewed-list membership is human-gated): {len(gone_now)} old pattern(s) no longer upstream')
    return 0


# Host-allowlisted custom patterns that are intentionally NOT in Vidhin05's list.
# Verified present in ElfHosted's live allowlist (status endpoint, 2026-09-05):
# the archive-extension blocker is a static entry on public hosts.
CUSTOM_PATTERNS_FILE = ROOT / 'Regex' / 'excluded-regex-patterns.json'


def _custom_norms():
    try:
        ents = load(CUSTOM_PATTERNS_FILE)
        return {norm(e['pattern'] if isinstance(e, dict) else e) for e in ents}
    except Exception:
        return set()


CUSTOM_OK = _custom_norms()


def is_known_custom(n):
    return n in CUSTOM_OK


if __name__ == '__main__':
    sys.exit(main() or 0)
