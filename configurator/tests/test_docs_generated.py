"""Guards against the Mintlify docs freezing again.

The docs site previously drifted for weeks (docs/changelog.mdx stuck at v2.9.7,
whats-new.mdx at v2.78) because nothing verified the auto-generated regions stayed
in sync with their sources. These tests re-derive the generated content with the
same functions sync-docs.py uses and assert the committed pages match — so a stale
generated page fails CI, and the sync-docs workflow keeps them current on every push.
"""
import json
import importlib.util
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).parent.parent

# scripts/sync-docs.py has a hyphenated name and scripts/ is not a package, so load by path.
_spec = importlib.util.spec_from_file_location("sync_docs", ROOT / "scripts" / "sync-docs.py")
sync = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sync)


def _top_changelog_version():
    text = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    m = re.search(r"^## ([\d][\d.\w\-+]*)", text, re.MULTILINE)
    return m.group(1) if m else None


def _top_config_version():
    text = (ROOT / "configurator" / "src" / "data" / "changelog.js").read_text(encoding="utf-8")
    m = re.search(r"v:'([^']+)'", text)
    return m.group(1) if m else None


def test_changelog_recent_index_matches_source():
    """The managed recent-releases index must equal a fresh generation from CHANGELOG.md,
    and must include the current top release (the exact symptom of the old freeze)."""
    page = (ROOT / "docs" / "changelog.mdx").read_text(encoding="utf-8")
    entries = sync.parse_root_changelog()
    expected = sync.gen_changelog_index_md(entries)
    region = sync._replace_managed_region(page, sync.CHANGELOG_BEGIN, sync.CHANGELOG_END, expected)
    assert region is not None, "docs/changelog.mdx is missing the AUTO:RECENT_RELEASES markers"
    assert region == page, "docs/changelog.mdx recent-releases index is stale — run scripts/sync-docs.py --apply"

    top = _top_changelog_version()
    assert top and top in page, f"top CHANGELOG version {top} not reflected in docs/changelog.mdx"


def test_roadmap_shipped_table_matches_source():
    page = (ROOT / "docs" / "roadmap.mdx").read_text(encoding="utf-8")
    entries = sync.parse_root_changelog()
    expected = sync.gen_roadmap_shipped_md(entries)
    region = sync._replace_managed_region(page, sync.ROADMAP_BEGIN, sync.ROADMAP_END, expected)
    assert region is not None, "docs/roadmap.mdx is missing the AUTO:SHIPPED markers"
    assert region == page, "docs/roadmap.mdx shipped table is stale — run scripts/sync-docs.py --apply"

    top = _top_changelog_version()
    assert top and top in page, f"top CHANGELOG version {top} not reflected in docs/roadmap.mdx"


def test_whats_new_matches_config_changelog():
    page = (ROOT / "docs" / "whats-new.mdx").read_text(encoding="utf-8")
    cfg = sync.parse_config_changelog()
    expected = sync.gen_whats_new_page(cfg)
    assert expected is not None, "could not parse configurator changelog.js"
    assert page == expected, "docs/whats-new.mdx is stale — run scripts/sync-docs.py --apply"

    top = _top_config_version()
    assert top and top in page, f"top configurator version {top} not reflected in docs/whats-new.mdx"


def test_nav_lists_generated_pages():
    """The three generated pages must remain in the Mintlify nav (else they 404)."""
    nav = json.loads((ROOT / "docs" / "docs.json").read_text(encoding="utf-8"))
    pages = {p for tab in nav["navigation"]["tabs"] for g in tab["groups"] for p in g["pages"]}
    for slug in ("changelog", "roadmap", "whats-new"):
        assert slug in pages, f"{slug} missing from docs.json navigation"


def test_root_roadmap_completed_matches_source():
    """The root ROADMAP.md managed 'Recently Completed' region must equal a fresh
    generation from CHANGELOG.md (else the hand-maintained table has rotted again)."""
    page = (ROOT / "ROADMAP.md").read_text(encoding="utf-8")
    entries = sync.parse_root_changelog()
    expected = sync.gen_root_roadmap_completed(entries)
    region = sync._replace_managed_region(page, sync.ROOT_ROADMAP_BEGIN, sync.ROOT_ROADMAP_END, expected)
    assert region is not None, "ROADMAP.md is missing the AUTO:ROOT_COMPLETED markers"
    assert region == page, "ROADMAP.md 'Recently Completed' is stale — run scripts/sync-docs.py --apply"
    top = _top_changelog_version()
    assert top and top in page, f"top CHANGELOG version {top} not reflected in ROADMAP.md"


def test_tools_whatsnew_matches_config_changelog():
    """The standalone Core Tools page (tools/index.html) 'What's New' block must equal a
    fresh generation from changelog.js — this is the page that froze at v2.84."""
    page = (ROOT / "tools" / "index.html").read_text(encoding="utf-8")
    cfg = sync.parse_config_changelog()
    expected = sync.gen_tools_whatsnew(cfg)
    region = sync._replace_managed_region(page, sync.TOOLS_WN_BEGIN, sync.TOOLS_WN_END, expected)
    assert region is not None, "tools/index.html is missing the AUTO:TOOLS_WHATSNEW markers"
    assert region == page, "tools/index.html 'What's New' is stale — run scripts/sync-docs.py --apply"
    top = _top_config_version()
    assert top and top in page, f"top configurator version {top} not reflected in tools/index.html"
    # the page must link to the configurator changelog (the missing-link bug report)
    assert "Full Configurator changelog" in page or "#changelog" in page, "tools page missing changelog link"


def test_tools_page_keeps_complete_tool_cards():
    """The managed What's New replacement must never truncate the static tool hub."""
    page = (ROOT / "tools" / "index.html").read_text()
    assert "... (truncated for brevity) ..." not in page
    for label in (
        "Template Builder",
        "Addon Backup",
        "Template Inspector",
        "Health Score",
        "Troubleshooter",
        "Account Manager",
        "CLI Tool",
    ):
        assert label in page
    assert "</main>" in page
    assert "</html>" in page
