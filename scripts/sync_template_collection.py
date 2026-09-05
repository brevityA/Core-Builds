#!/usr/bin/env python3
"""
Regenerate core-builds-template-collection.json from the active template suite
(non-Legacy, non-Deprecated, non-Nightly) so the host-preload collection stays
in sync with the templates it references.

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
ALLOWLIST_OUT = ROOT / 'configurator' / 'src' / 'data' / 'regex-allowlist.js'

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


def collect():
    """Collect all active (non-Legacy, non-Deprecated, non-Nightly) templates."""
    entries = []
    for f in sorted(TEMPLATES.rglob('*.json')):
        parts = f.relative_to(TEMPLATES).parts
        if parts[0] in EXCLUDED_TOP or 'Nightly' in parts:
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


def render(entries):
    """Render template entries to compact JSON string."""
    return json.dumps(entries, separators=(',', ':'), ensure_ascii=False) + '\n'


def main():
    """Main entry point for syncing or checking the template collection."""
    if '--regex-allowlist' in sys.argv:
        want = render_allowlist()
        if '--check' in sys.argv:
            current = ALLOWLIST_OUT.read_text(encoding='utf-8') if ALLOWLIST_OUT.exists() else ''
            if current != want:
                print('❌ configurator/src/data/regex-allowlist.js is STALE vs the pinned snapshot. '
                      'Run: python3 scripts/sync_template_collection.py --regex-allowlist')
                sys.exit(1)
            print('✅ regex allowlist in sync with the pinned snapshot')
            return
        ALLOWLIST_OUT.write_text(want, encoding='utf-8')
        n = want.count('\n  "')
        print(f'✅ regenerated configurator/src/data/regex-allowlist.js ({n} patterns)')
        return
    entries = collect()
    out = render(entries)
    if '--check' in sys.argv:
        current = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
        if current != out:
            print(f'❌ core-builds-template-collection.json is STALE '
                  f'({len(entries)} active templates). '
                  f'Run: python3 scripts/sync_template_collection.py')
            sys.exit(1)
        print(f'✅ collection in sync ({len(entries)} active templates)')
        return
    OUT.write_text(out, encoding='utf-8')
    print(f'✅ regenerated core-builds-template-collection.json '
          f'({len(entries)} active templates, {len(out) // 1024} KB)')


if __name__ == '__main__':
    main()
