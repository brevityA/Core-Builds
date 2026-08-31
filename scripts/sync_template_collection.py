#!/usr/bin/env python3
"""
Regenerate core-builds-template-collection.json from the active template suite
(non-Legacy, non-Deprecated, non-Nightly) so the host-preload collection stays
in sync with the templates it references.

Usage:
  python3 scripts/sync_template_collection.py            # write (regenerate)
  python3 scripts/sync_template_collection.py --check    # exit 1 if the committed
                                                          # file is stale (CI gate)
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / 'Templates'
OUT = ROOT / 'core-builds-template-collection.json'

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
