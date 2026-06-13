"""
Checks that all raw.githubusercontent.com URLs referencing this repo
in markdown files point to files that actually exist in the local checkout.
Catches broken template import links, missing assets, and stale doc references.
"""
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
RAW_URL_PATTERN = re.compile(
    r"https://raw\.githubusercontent\.com/brevityA/Core-Builds/refs/heads/main/([^\s\)\"'>,`]+)"
)


def _collect_broken_urls():
    broken = []
    for md in REPO_ROOT.rglob("*.md"):
        # Skip historical release notes — URLs may reference renamed files
        if md.name.startswith("RELEASE_"):
            continue
        try:
            text = md.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for match in RAW_URL_PATTERN.finditer(text):
            rel_path = match.group(1)
            if not (REPO_ROOT / rel_path).exists():
                broken.append((str(md.relative_to(REPO_ROOT)), rel_path))
    return broken


def test_all_raw_github_urls_exist():
    """Every raw.githubusercontent.com URL in a markdown file must resolve to a real file."""
    broken = _collect_broken_urls()
    if broken:
        lines = [f"  {src}: {path}" for src, path in broken]
        pytest.fail("Broken raw GitHub URLs:\n" + "\n".join(lines))


def test_template_directory_lists_all_templates():
    """Every .json file in Templates/Torbox/ (non-deprecated) should appear in the master README."""
    readme = (REPO_ROOT / "Templates" / "Torbox" / "README.md").read_text(encoding="utf-8")
    missing = []
    for json_file in (REPO_ROOT / "Templates" / "Torbox").rglob("*.json"):
        # Skip deprecated templates
        if "Deprecated" in json_file.parts or "Nightly" in json_file.parts:
            continue
        if json_file.name not in readme:
            missing.append(str(json_file.relative_to(REPO_ROOT)))
    if missing:
        pytest.fail(
            "Templates not listed in Templates/Torbox/README.md:\n"
            + "\n".join(f"  {p}" for p in sorted(missing))
        )
