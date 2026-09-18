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


# ── What's New card titles ────────────────────────────────────────────────────
#
# docs/whats-new.mdx builds each <Card> by splitting an item on its first " — ".
# v3.9 shipped two cards with ~300-character titles and two whose title and body
# were the same paragraph twice, because the items led straight into prose. These
# pin both halves of the fix: the renderer degrades safely, and the linter blocks
# a new offender in the entry being cut.


def test_card_title_body_keeps_a_well_formed_lead():
    title, body = sync.card_title_body("Landing page rebuilt — a Lean preset row on first visit.", 0)
    assert title == "Landing page rebuilt"
    assert body == "a Lean preset row on first visit."


def test_card_title_body_derives_a_short_title_when_there_is_no_lead():
    item = (
        "The landing page is rebuilt: a Lean / Standard / Maximum preset row on a first "
        "visit, a wall showing the real stream cards each formatter draws, and copy that "
        "says the install can write the whole stack into your Stremio account."
    )
    title, body = sync.card_title_body(item, 0)
    assert len(title) <= sync.CARD_TITLE_DERIVED_MAX + 1  # +1 for the ellipsis
    assert title.strip() != body.strip(), "title and body must never be the same text"
    assert body == item, "the full item is kept as the body, nothing is dropped"


def test_card_title_body_does_not_cut_at_a_leading_category_colon():
    # "Fixed:" / "Security:" openers must not yield a one-word title naming the
    # category instead of the change.
    title, _ = sync.card_title_body("Fixed: EasyNews-only Direct Install no longer fails.", 0)
    assert title.lower() not in ("fixed", "fixed:")


def test_no_generated_card_repeats_its_body_as_its_title():
    page = (ROOT / "docs" / "whats-new.mdx").read_text(encoding="utf-8")
    dupes = [
        m.group(1)
        for m in re.finditer(r'<Card title="([^"]*)" icon="[^"]*">\n\s*(.*?)\n\s*</Card>', page, re.S)
        if m.group(1).strip() == m.group(2).strip()
    ]
    assert dupes == [], f"cards printing their own title as the body: {dupes}"


def test_no_generated_card_title_is_absurdly_long():
    page = (ROOT / "docs" / "whats-new.mdx").read_text(encoding="utf-8")
    long = [t for t in re.findall(r'<Card title="([^"]*)"', page) if len(t) > sync.CARD_TITLE_MAX]
    assert long == [], f"card titles over {sync.CARD_TITLE_MAX} chars: {long}"


def test_check_changelog_items_flags_a_missing_separator():
    bad = [{"v": "9.9", "date": "x", "items": ["One long sentence with no lead title at all."]}]
    problems = sync.check_changelog_items(bad)
    assert len(problems) == 1 and "no \" — \" separator" in problems[0]


def test_check_changelog_items_flags_an_overlong_lead():
    bad = [{"v": "9.9", "date": "x", "items": [("x" * 120) + " — body"]}]
    problems = sync.check_changelog_items(bad)
    assert len(problems) == 1 and "lead title is 120 characters" in problems[0]


def test_check_changelog_items_only_judges_the_newest_entry():
    entries = [
        {"v": "9.9", "date": "x", "items": ["Good title — body"]},
        {"v": "9.8", "date": "x", "items": ["a legacy item with no separator"]},
    ]
    assert sync.check_changelog_items(entries) == []


def test_the_committed_changelog_passes_its_own_linter():
    assert sync.check_changelog_items(sync.parse_config_changelog()) == []
