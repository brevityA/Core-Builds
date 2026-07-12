#!/usr/bin/env python3
"""
sync-docs.py — Sync template versions from JSON source-of-truth into all docs.

Reads metadata.version from every template JSON, then patches:
  - CLAUDE.md         (inventory lines, heading version)
  - README.md         (badge, footer, Labs table)
  - Templates/Torbox/README.md (banner, section heading, detail cards, tables)
  - Guides/LABS.md    (Labs version table)
  - docs/introduction.mdx       (version badge)
  - docs/template-directory.mdx (frontmatter, per-template headings)
  - docs/nightly-and-labs.mdx   (per-template headings/version lines)

Usage:
  python scripts/sync-docs.py          # dry-run (show what would change)
  python scripts/sync-docs.py --apply  # write changes to disk
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = ROOT / "Templates" / "Torbox"

# ─── 1. Read all template versions ───────────────────────────────────────────

def load_template_versions():
    """Return {relative_path: version} for all template JSONs."""
    versions = {}
    for json_file in sorted(TEMPLATES_DIR.rglob("*.json")):
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            version = data.get("metadata", {}).get("version")
            if version:
                rel = str(json_file.relative_to(TEMPLATES_DIR))
                versions[rel] = version
        except (json.JSONDecodeError, KeyError):
            continue
    return versions


# ─── 2. Generic patching helpers ─────────────────────────────────────────────

class DocPatcher:
    def __init__(self, dry_run=True):
        self.dry_run = dry_run
        self.changes = []  # [(file, old_line, new_line), ...]

    def patch_file(self, filepath, replacements):
        """Apply a list of (pattern, replacement_fn[, flags]) to a file.
        replacement_fn(match) -> new string.
        """
        path = ROOT / filepath
        if not path.exists():
            print(f"  SKIP {filepath} (not found)")
            return

        text = path.read_text(encoding="utf-8")
        original = text

        for entry in replacements:
            pattern, repl_fn = entry[0], entry[1]
            flags = entry[2] if len(entry) > 2 else 0
            text = re.sub(pattern, repl_fn, text, flags=flags)

        if text != original:
            diff_lines = self._diff(original, text, filepath)
            self.changes.extend(diff_lines)
            if not self.dry_run:
                path.write_text(text, encoding="utf-8")
                print(f"  UPDATED {filepath} ({len(diff_lines)} change(s))")
            else:
                print(f"  WOULD UPDATE {filepath} ({len(diff_lines)} change(s))")
        else:
            print(f"  OK {filepath} (no changes needed)")

    def _diff(self, old, new, filepath):
        """Return list of (file, old_line, new_line) for changed lines."""
        old_lines = old.splitlines()
        new_lines = new.splitlines()
        changes = []
        for o, n in zip(old_lines, new_lines, strict=False):
            if o != n:
                changes.append((filepath, o.strip(), n.strip()))
        return changes


# ─── 3. Build filename→version lookup for doc matching ───────────────────────

def build_lookup(versions):
    """Build multiple lookup keys for matching doc references to versions."""
    lookup = {}
    for rel_path, ver in versions.items():
        # Full relative path: "Single/core-nexus-4k-apex.json"
        lookup[rel_path] = ver
        # Filename only: "core-nexus-4k-apex.json"
        lookup[Path(rel_path).name] = ver
        # Stem: "core-nexus-4k-apex"
        lookup[Path(rel_path).stem] = ver
    return lookup


# ─── 4. Patch CLAUDE.md ──────────────────────────────────────────────────────

def patch_claude_md(patcher, versions, release_version):
    """Patch CLAUDE.md inventory lines and heading."""
    lookup = build_lookup(versions)

    def replace_inventory_line(match):
        path_in_doc = match.group(1)  # e.g. "Single/core-nexus-4k-apex.json"
        old_ver = match.group(2)
        desc = match.group(3)
        new_ver = lookup.get(path_in_doc, old_ver)
        return f"- `{path_in_doc}` v{new_ver} —{desc}"

    def replace_heading(match):
        return f"## Active Template Inventory (as of v{release_version})"

    patcher.patch_file("CLAUDE.md", [
        # Inventory lines: - `Path/file.json` v1.2.3 — description
        (r'- `([^`]+\.json)` v([\d.]+) —(.*)', replace_inventory_line),
        # Heading: ## Active Template Inventory (as of vX.Y.Z)
        (r'## Active Template Inventory \(as of v[\d.]+\)', replace_heading),
    ])


# ─── 5. Patch README.md ─────────────────────────────────────────────────────

def patch_readme(patcher, versions, release_version):
    """Patch README.md badge, footer, and Labs table."""
    lookup = build_lookup(versions)

    # Labs template name→JSON mapping
    labs_names = {
        "Core Nexus 4K Apex Labs": "core-nexus-4k-apex-labs",
        "Core Nexus Stream Labs": "core-nexus-stream-labs",
        "Core Nexus All-Rounder Labs": "core-nexus-all-rounder-labs",
        "Core Nexus 4K Essential Labs": "core-nexus-4k-essential-labs",
        "Core Nexus Essential Labs": "core-nexus-essential-labs",
        "Core Nexus Anime 4K Labs": "core-nexus-anime-4k-labs",
    }

    def replace_labs_row(match):
        prefix = match.group(1)
        name = match.group(2)
        mid = match.group(3)
        old_ver = match.group(4)
        rest = match.group(5)
        stem = labs_names.get(name.strip())
        new_ver = lookup.get(stem, old_ver) if stem else old_ver
        return f"{prefix}{name}**{mid}| v{new_ver} |{rest}"

    patcher.patch_file("README.md", [
        # Badge: RELEASE-vX.Y.Z-
        (r'RELEASE-v[\d.]+-', lambda m: f"RELEASE-v{release_version}-"),
        # Footer: Current: **`vX.Y.Z`**
        (r'Current: \*\*`v[\d.]+`\*\*', lambda m: f"Current: **`v{release_version}`**"),
        # Labs table rows: | **Name** emoji | vX.Y.Z | ...
        (r'(\| \*\*)(.+?)\*\*(.+?)\| v([\d.]+) \|(.*)', replace_labs_row),
    ])


# ─── 6. Patch Templates/Torbox/README.md ────────────────────────────────────

def patch_torbox_readme(patcher, versions, release_version):
    """Patch Templates/Torbox/README.md banner, heading, detail cards."""
    lookup = build_lookup(versions)

    def replace_detail_card(match):
        old_ver = match.group(1)
        # Find which template this belongs to by scanning context
        # Detail cards: | **Version** | vX.Y.Z |
        return f"| **Version** | v{match.group(1)} |"

    patcher.patch_file("Templates/Torbox/README.md", [
        # Banner: **Current version: vX.Y.Z**
        (r'\*\*Current version: v[\d.]+\*\*', lambda m: f"**Current version: v{release_version}**"),
        # Section heading: (vX.Y.Z)
        (r'Common to All Templates \(v[\d.]+\)', lambda m: f"Common to All Templates (v{release_version})"),
    ])


# ─── 7. Patch Mintlify docs ─────────────────────────────────────────────────

def patch_mintlify_docs(patcher, versions, release_version):
    """Patch docs/*.mdx files with current versions."""
    lookup = build_lookup(versions)

    # Template heading name→stem mapping for template-directory.mdx
    heading_map = {
        "4K Apex": "core-nexus-4k-apex",
        "4K Apex (TorBox-only)": "core-nexus-4k-apex-torbox",
        "4K Hybrid": "core-nexus-4k-hybrid",
        "Samsung TV 4K": "core-nexus-samsung-tv-4k",
        "Samsung TV": "core-nexus-samsung-tv",
        "Samsung RU7100 4K": "core-nexus-samsung-ru7100-4k",
        "Stream": "core-nexus-stream",
        "Hybrid": "core-nexus-hybrid",
        "4K Essential": "core-nexus-4k-essential",
        "Essential": "core-nexus-essential",
        "Flash 4K": "core-nexus-flash-4k",
        "Flash": "core-nexus-flash",
        "Speed 4K": "core-nexus-speed-4k",
        "Speed": "core-nexus-speed",
        "Speed 4K+": "core-nexus-speed-4k-plus",
        "Speed EasyNews": "core-nexus-speed-easynews",
        "Anime 4K": "core-nexus-anime-4k",
        "Anime": "core-nexus-anime",
        "Anime Dub": "core-nexus-anime-dub",
        "4K AllDebrid": "core-nexus-4k-alldebrid",
        "AllDebrid": "core-nexus-alldebrid",
        "Ultrawide": "core-nexus-ultrawide",
    }

    labs_heading_map = {
        "4K Apex Labs": "core-nexus-4k-apex-labs",
        "Stream Labs": "core-nexus-stream-labs",
        "All-Rounder Labs": "core-nexus-all-rounder-labs",
        "4K Essential Labs": "core-nexus-4k-essential-labs",
        "Essential Labs": "core-nexus-essential-labs",
        "Anime 4K Labs": "core-nexus-anime-4k-labs",
        "Nightly Apple TV 4K": "core-nexus-apple-tv-4k",
    }

    # template-directory.mdx: ### Template Name — vX.Y.Z
    def replace_template_heading(match):
        name = match.group(1)
        old_ver = match.group(2)
        stem = heading_map.get(name.strip())
        new_ver = lookup.get(stem, old_ver) if stem else old_ver
        return f"### {name}— v{new_ver}"

    # template-directory.mdx frontmatter
    def replace_frontmatter_ver(match):
        return f'Current version: v{release_version}"'

    # introduction.mdx version badge
    def replace_intro_badge(match):
        return f'>v{release_version}<'

    # nightly-and-labs.mdx: ### Template (vX.Y.Z)
    def replace_labs_heading(match):
        name = match.group(1)
        old_ver = match.group(2)
        stem = labs_heading_map.get(name.strip())
        new_ver = lookup.get(stem, old_ver) if stem else old_ver
        return f"### {name}(v{new_ver})"

    # nightly-and-labs.mdx: vX.Y.Z — description (line after heading)
    def replace_nightly_version_line(match):
        old_ver = match.group(1)
        desc = match.group(2)
        apple_tv_ver = lookup.get("core-nexus-apple-tv-4k", old_ver)
        return f"v{apple_tv_ver} —{desc}"

    patcher.patch_file("docs/template-directory.mdx", [
        (r'Current version: v[\d.]+"', replace_frontmatter_ver),
        (r'### (.+?)— v([\d.]+)', replace_template_heading),
    ])

    patcher.patch_file("docs/introduction.mdx", [
        (r'>v[\d.]+<', replace_intro_badge),
    ])

    patcher.patch_file("docs/nightly-and-labs.mdx", [
        (r'### (.+?)\(v([\d.]+)\)', replace_labs_heading),
        (r'^v([\d.]+) —(.*)$', replace_nightly_version_line, re.MULTILINE),
    ])


# ─── 8. Patch Guides/LABS.md ────────────────────────────────────────────────

def patch_labs_guide(patcher, versions, release_version):
    """Patch Guides/LABS.md version table."""
    lookup = build_lookup(versions)

    labs_names = {
        "4K Apex Labs": "core-nexus-4k-apex-labs",
        "Stream Labs": "core-nexus-stream-labs",
        "All-Rounder Labs": "core-nexus-all-rounder-labs",
        "4K Essential Labs": "core-nexus-4k-essential-labs",
        "Essential Labs": "core-nexus-essential-labs",
        "Anime 4K Labs": "core-nexus-anime-4k-labs",
    }

    def replace_labs_table_row(match):
        prefix = match.group(1)  # | **
        name = match.group(2)    # 4K Apex Labs
        old_ver = match.group(3) # 0.14.0
        rest = match.group(4)    # | 4K + 1080p | ...
        stem = labs_names.get(name.strip())
        new_ver = lookup.get(stem, old_ver) if stem else old_ver
        return f"{prefix}{name}** | v{new_ver} {rest}"

    patcher.patch_file("Guides/LABS.md", [
        (r'(\| \*\*)(.+?)\*\* \| v([\d.]+) (\|.*)', replace_labs_table_row),
    ])


# ─── 9. Detect current release version ──────────────────────────────────────

def get_release_version():
    """Read the latest release version from CHANGELOG.md."""
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    match = re.search(r'^## ([\d.]+)', changelog, re.MULTILINE)
    if match:
        return match.group(1)
    return "0.0.0"


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    apply = "--apply" in sys.argv
    dry_run = not apply

    print("=" * 60)
    print(f"  sync-docs.py {'(DRY RUN)' if dry_run else '(APPLYING)'}")
    print("=" * 60)

    versions = load_template_versions()
    release_version = get_release_version()

    print(f"\nRelease version: v{release_version}")
    print(f"Templates found: {len(versions)}")
    print()

    patcher = DocPatcher(dry_run=dry_run)

    print("── CLAUDE.md ──")
    patch_claude_md(patcher, versions, release_version)

    print("\n── README.md ──")
    patch_readme(patcher, versions, release_version)

    print("\n── Templates/Torbox/README.md ──")
    patch_torbox_readme(patcher, versions, release_version)

    print("\n── Guides/LABS.md ──")
    patch_labs_guide(patcher, versions, release_version)

    print("\n── Mintlify docs ──")
    patch_mintlify_docs(patcher, versions, release_version)

    # Summary
    print("\n" + "=" * 60)
    if patcher.changes:
        print(f"  {len(patcher.changes)} version(s) {'updated' if apply else 'would be updated'}:")
        for filepath, old, new in patcher.changes:
            print(f"    {filepath}")
            print(f"      - {old}")
            print(f"      + {new}")
        if dry_run:
            print(f"\n  Run with --apply to write changes.")
    else:
        print("  All docs are in sync. Nothing to do.")
    print("=" * 60)


if __name__ == "__main__":
    main()
