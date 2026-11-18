"""Official Core Nuvio badge packs are valid Fusion documents."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "tools" / "badges" / "published"
PACKS = (
    "core-neon-universal.json",
    "core-neon-enhanced.json",
    "core-nodv-universal.json",
)


def load(name: str) -> dict:
    return json.loads((PUB / name).read_text(encoding="utf-8"))


def test_three_official_packs_exist():
    for name in PACKS:
        assert (PUB / name).is_file(), name


def test_packs_are_nuvio_shaped():
    for name in PACKS:
        pack = load(name)
        assert set(pack) >= {"groups", "filters"}
        assert pack["groups"] and pack["filters"]
        group_ids = [g["id"] for g in pack["groups"]]
        assert len(group_ids) == len(set(group_ids))
        filter_ids = [f["id"] for f in pack["filters"]]
        assert len(filter_ids) == len(set(filter_ids))
        for filt in pack["filters"]:
            assert filt["groupId"] in group_ids
            assert filt["name"] and filt["pattern"]
            assert filt["imageURL"].startswith("https://raw.githubusercontent.com/brevityA/Core-Builds/")
            assert filt["imageURL"].endswith(".png")
            assert re.fullmatch(r"#[0-9A-Fa-f]{8}", filt["tagColor"])
            assert re.fullmatch(r"#[0-9A-Fa-f]{8}", filt["borderColor"])


def test_counts_and_no_dv_pack():
    uni = load("core-neon-universal.json")
    enh = load("core-neon-enhanced.json")
    nodv = load("core-nodv-universal.json")
    assert len(uni["filters"]) == 55
    assert len(enh["filters"]) == 55
    assert len(nodv["filters"]) == 54
    assert any(f["id"] == "vis-dv" for f in uni["filters"])
    assert all(f["id"] != "vis-dv" for f in nodv["filters"])


def test_universal_patterns_compile():
    pack = load("core-neon-universal.json")
    for filt in pack["filters"]:
        source = filt["pattern"]
        flags = 0
        if source.startswith("(?i)"):
            flags |= re.IGNORECASE
            source = source[4:]
        re.compile(source, flags)


def test_stacks_name_the_urls():
    stacks = ROOT / "tools" / "genies" / "stacks"
    text = "\n".join(p.read_text(encoding="utf-8") for p in stacks.glob("*.md"))
    assert "core-neon-universal.json" in text
    assert "core-neon-enhanced.json" in text
    assert "core-nodv-universal.json" in text


ASSETS = ROOT / "tools" / "badges" / "assets"
RAW_ASSETS = "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/tools/badges/assets/"


def test_badge_index_lists_every_image_with_the_licence():
    index = load("badges.json")
    assert index["license"] == "CC-BY-4.0"
    assert "Core Builds" in index["attribution"] and "CC BY 4.0" in index["attribution"]
    ids = [badge["id"] for badge in index["badges"]]
    assert len(ids) == len(set(ids)) == 111
    groups = {group["id"] for group in index["groups"]}
    for badge in index["badges"]:
        assert badge["group"] in groups
        assert badge["name"] and badge["label"]
        for kind in ("png", "svg"):
            url = badge[kind]
            assert url == f"{RAW_ASSETS}{badge['id']}.{kind}"
            # Installed packs load these URLs: a published file is never renamed or deleted.
            assert (ASSETS / f"{badge['id']}.{kind}").is_file(), url


def test_every_pack_image_exists():
    for name in PACKS:
        for filt in load(name)["filters"]:
            file = filt["imageURL"].rsplit("/", 1)[1]
            assert (ASSETS / file).is_file(), f"{name}: {file}"


def test_artwork_licence_is_cc_by():
    text = (ASSETS / "LICENSE.md").read_text(encoding="utf-8")
    assert "CC BY 4.0" in text
    assert "creativecommons.org/licenses/by/4.0" in text
    assert "Badge artwork: Core Builds (brevityA/Core-Builds), CC BY 4.0" in text


def main() -> int:
    tests = [
        test_three_official_packs_exist,
        test_packs_are_nuvio_shaped,
        test_counts_and_no_dv_pack,
        test_universal_patterns_compile,
        test_stacks_name_the_urls,
        test_badge_index_lists_every_image_with_the_licence,
        test_every_pack_image_exists,
        test_artwork_licence_is_cc_by,
    ]
    failed = 0
    for test in tests:
        try:
            test()
            print(f"ok  {test.__name__}")
        except Exception as exc:
            failed += 1
            print(f"FAIL {test.__name__}: {exc}")
    print(f"{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
