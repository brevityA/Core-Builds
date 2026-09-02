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


def main() -> int:
    tests = [
        test_three_official_packs_exist,
        test_packs_are_nuvio_shaped,
        test_counts_and_no_dv_pack,
        test_universal_patterns_compile,
        test_stacks_name_the_urls,
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
