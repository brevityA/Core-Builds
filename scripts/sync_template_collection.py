#!/usr/bin/env python3
"""
Regenerate core-builds-template-collection.json, the catalog operators add to
AIOStreams' TEMPLATE_URLS. It holds one entry: the Core Builds smart template
(Templates/Smart/core-builds.json, compiled by scripts/smart-template/compile.mjs),
which asks a few questions and builds the matching setup.

AIOStreams also whitelists every regex pattern and synced URL a trusted template
carries (registerTemplateTrust). So that operators keep trusting what the static
templates use, the entry carries their union in a __switch case keyed
"core-builds-trust": AIOStreams' trust scan reads every case, while the wizard
never selects it (it switches on the picked services, joined with commas), so the
resolved config is exactly the smart template's.

Usage:
  python3 scripts/sync_template_collection.py            # write (regenerate)
  python3 scripts/sync_template_collection.py --check    # exit 1 if the committed
                                                          # file is stale (CI gate)
  python3 scripts/sync_template_collection.py --regex-allowlist
  python3 scripts/sync_template_collection.py --regex-allowlist --check
              # regenerate (or verify) configurator/src/data/regex-allowlist.js
              # from Filtering/upstream/vidhin05-regexes.snapshot.json — the
              # documented source of the ElfHosted/ForTheWeak regex allowlist.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / 'Templates'
OUT = ROOT / 'core-builds-template-collection.json'
SNAPSHOT = ROOT / 'Filtering' / 'upstream' / 'vidhin05-regexes.snapshot.json'
ALLOWLIST_OUTS = [ROOT / 'configurator' / 'src' / 'data' / 'regex-allowlist.js',
                  ROOT / 'packages' / 'core' / 'src' / 'regex-allowlist.js']

_ALLOWLIST_HEADER = (
    '// Auto-generated from Filtering/upstream/vidhin05-regexes.snapshot.json\n'
    '// (the ElfHosted/ForTheWeak regex allowlist). Do not edit by hand.\n'
    '// Regenerate with scripts/sync_template_collection.py --regex-allowlist or the drift-watch workflow.\n'
)
_WRAP_RE = re.compile(r'^/(.*)/[a-z]*$', re.S)


def render_allowlist():
    """Map normalized upstream patterns to their names (first occurrence wins)."""
    entries = json.loads(SNAPSHOT.read_text(encoding='utf-8'))
    allow = {}
    for e in entries:
        pattern = str(e.get('pattern', '')).strip()
        m = _WRAP_RE.match(pattern)
        key = m.group(1) if m else pattern
        if key not in allow:
            allow[key] = e.get('name', '')
    lines = ',\n'.join(
        f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}'
        for k, v in allow.items()
    )
    return _ALLOWLIST_HEADER + 'export const REGEX_ALLOWLIST = {\n' + lines + ',\n};\n'

EXCLUDED_TOP = {'Legacy', 'Deprecated'}
SMART = TEMPLATES / 'Smart' / 'core-builds.json'
TRUST_CASE = 'core-builds-trust'
# Core Builds' own synced file, documented as whitelisted through this collection.
# Only a Personal template still references it, and those are no longer collected.
EXTRA_TRUST = {
    'syncedRankedRegexUrls': ['https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Filtering/ranked-regex-patterns.json'],
}
# The fields AIOStreams reads trust from (packages/core/src/utils/template-sanitise.ts).
TRUST_FIELDS = [
    'excludedRegexPatterns', 'includedRegexPatterns', 'requiredRegexPatterns',
    'preferredRegexPatterns', 'rankedRegexPatterns',
    'syncedExcludedStreamExpressionUrls', 'syncedIncludedStreamExpressionUrls',
    'syncedRequiredStreamExpressionUrls', 'syncedPreferredStreamExpressionUrls',
    'syncedRankedStreamExpressionUrls',
    'syncedExcludedRegexUrls', 'syncedIncludedRegexUrls', 'syncedRequiredRegexUrls',
    'syncedPreferredRegexUrls', 'syncedRankedRegexUrls',
]


def collect():
    """Collect all active (non-Legacy, non-Deprecated, non-Nightly) templates."""
    entries = []
    for f in sorted(TEMPLATES.rglob('*.json')):
        parts = f.relative_to(TEMPLATES).parts
        # Excluded lanes can nest below a service dir (e.g.
        # Templates/Torbox/Deprecated/Dual/), so check every path part —
        # a top-level-only check shipped 15 deprecated templates to hosts.
        if any(p in EXCLUDED_TOP for p in parts) or 'Nightly' in parts:
            continue
        # Personal templates are never exposed; the smart template is the entry itself.
        if parts[0] in ('Personal', 'Smart'):
            continue
        # Parent/base configs are inherited by children, not imported directly.
        if parts[0] == 'Base' or f.name == 'Core-Builds-Base-Config.json':
            continue
        if str(f).endswith('core-nexus-base-torbox.json'):
            continue
        try:
            d = json.loads(f.read_text(encoding='utf-8'))
        except Exception:
            continue
        if not isinstance(d, dict) or 'metadata' not in d or 'config' not in d:
            continue
        meta = d.get('metadata', {})
        if not meta.get('id') or not meta.get('version'):
            continue
        entries.append({'metadata': meta, 'config': d['config']})
    return entries


def trust_strings(entries):
    """Per trust field, every pattern or URL the active static templates carry, in first-seen order."""
    out = {}
    for field in TRUST_FIELDS:
        seen = list(EXTRA_TRUST.get(field, []))
        for e in entries:
            for item in e['config'].get(field) or []:
                value = item.get('pattern') if isinstance(item, dict) else item
                if isinstance(value, str) and value and value not in seen:
                    seen.append(value)
        if seen:
            out[field] = seen
    return out


def smart_entry(entries):
    """The smart template, carrying the static templates' trust in a case the wizard never picks."""
    tpl = json.loads(SMART.read_text(encoding='utf-8'))
    config = tpl['config']
    for field, values in trust_strings(entries).items():
        config[field] = {
            '__switch': 'services',
            'cases': {TRUST_CASE: values},
            'default': config[field] if field in config else {'__remove': True},
        }
    return {'metadata': tpl['metadata'], 'config': config}


def render(entries):
    """Render template entries to compact JSON string."""
    return json.dumps(entries, separators=(',', ':'), ensure_ascii=False) + '\n'


def main():
    """Main entry point for syncing or checking the template collection."""
    if '--regex-allowlist' in sys.argv:
        want = render_allowlist()
        n = want.count('\n  "')
        if '--check' in sys.argv:
            stale = []
            for out_path in ALLOWLIST_OUTS:
                current = out_path.read_text(encoding='utf-8') if out_path.exists() else ''
                if current != want:
                    stale.append(str(out_path.relative_to(ROOT)))
            if stale:
                print(f'❌ regex allowlist mirror(s) STALE vs the pinned snapshot: {", ".join(stale)}. '
                      'Run: python3 scripts/sync_template_collection.py --regex-allowlist')
                sys.exit(1)
            print('✅ regex allowlist in sync with the pinned snapshot (configurator + packages/core mirrors)')
            return
        for out_path in ALLOWLIST_OUTS:
            out_path.write_text(want, encoding='utf-8')
            print(f'✅ regenerated {out_path.relative_to(ROOT)} ({n} patterns)')
        return
    entries = [smart_entry(collect())]
    out = render(entries)
    if '--check' in sys.argv:
        current = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
        if current != out:
            print(f'❌ core-builds-template-collection.json is STALE '
                  f'(smart template + static-template trust). '
                  f'Run: python3 scripts/sync_template_collection.py')
            sys.exit(1)
        print('✅ collection in sync (smart template + static-template trust)')
        return
    OUT.write_text(out, encoding='utf-8')
    print(f'✅ regenerated core-builds-template-collection.json '
          f'(smart template + static-template trust, {len(out) // 1024} KB)')


if __name__ == '__main__':
    main()
