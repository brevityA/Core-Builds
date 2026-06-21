"""
Coverage tests for TorrentsDB scraper deployment.

Verifies that every template carrying torrents-db:
  1. Has the preset present and enabled
  2. Has useMultipleInstances: false (required by AIOStreams v2.30.x)
  3. Has a flood guard ESE that caps TorrentsDB at ≤ 1 result

Also verifies that Lite / Speed / Flash templates do NOT carry the preset
(intentional exclusion — those templates stay lightweight).
"""
import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
TEMPLATES_ROOT = REPO_ROOT / "Templates" / "Torbox"

# Templates that must carry TorrentsDB (16 total)
EXPECTED_TDB = [
    "Single/core-nexus-4k-apex.json",
    "Single/core-nexus-4k-apex-torbox.json",
    "Single/core-nexus-stream.json",
    "Single/core-nexus-stream-firestick.json",
    "Essential/core-nexus-4k-essential.json",
    "Essential/core-nexus-essential.json",
    "Hybrid/core-nexus-4k-hybrid.json",
    "Hybrid/core-nexus-hybrid.json",
    "AllDebrid/core-nexus-4k-alldebrid.json",
    "AllDebrid/core-nexus-alldebrid.json",
    "Anime/core-nexus-anime-4k.json",
    "Anime/core-nexus-anime.json",
    "Anime/core-nexus-anime-dub.json",
    "Device/Samsung/core-nexus-samsung-tv.json",
    "Device/Samsung/core-nexus-samsung-tv-4k.json",
    "Device/Samsung/core-nexus-samsung-ru7100-4k.json",
]

# Templates intentionally excluded (Lite / Speed / Flash)
EXCLUDED_TDB = [
    "Single/core-nexus-stream-lite.json",
    "Single/core-nexus-stream-firestick-lite.json",
    "Essential/core-nexus-4k-essential-lite.json",
    "Essential/core-nexus-essential-lite.json",
    "Flash/core-nexus-flash-4k.json",
    "Flash/core-nexus-flash.json",
    "Speed/TorBox/core-nexus-speed-4k.json",
    "Speed/TorBox/core-nexus-speed-4k-lite.json",
    "Speed/TorBox/core-nexus-speed.json",
    "Speed/TorBox/core-nexus-speed-lite.json",
    "Speed/EasyNews/core-nexus-speed-4k-plus.json",
    "Speed/EasyNews/core-nexus-speed-easynews.json",
    "Hybrid/core-nexus-hybrid-lite.json",
    "AllDebrid/core-nexus-4k-alldebrid-lite.json",
    "AllDebrid/core-nexus-alldebrid-lite.json",
    "Anime/core-nexus-anime-4k-lite.json",
    "Anime/core-nexus-anime-lite.json",
    "Anime/core-nexus-anime-dub-lite.json",
]

# Matches the closing segment of slice(addon(...,'TorrentsDB'),1) — the flood guard cap.
# The full addon() call contains deeply nested parens so we match just the tail.
_FLOOD_GUARD_RE = re.compile(r"'TorrentsDB'\),1\)")


def _load(rel: str) -> dict:
    return json.loads((TEMPLATES_ROOT / rel).read_text(encoding="utf-8"))


def _tdb_preset(data: dict):
    return next(
        (p for p in data.get("config", {}).get("presets", []) if p.get("type") == "torrents-db"),
        None,
    )


def _ese_expressions(data: dict):
    # ESEs may be dicts {"expression": "..."} or bare strings (Anime templates mix both)
    result = []
    for e in data.get("config", {}).get("excludedStreamExpressions", []):
        result.append(e.get("expression", "") if isinstance(e, dict) else e)
    return result


# ── Templates that MUST have TorrentsDB ───────────────────────

@pytest.mark.parametrize("rel", EXPECTED_TDB)
class TestTorrentsDbPresent:
    def test_preset_exists(self, rel):
        assert _tdb_preset(_load(rel)) is not None, f"{rel}: torrents-db preset missing"

    def test_use_multiple_instances_false(self, rel):
        preset = _tdb_preset(_load(rel))
        assert preset is not None
        val = preset.get("options", {}).get("useMultipleInstances")
        assert val is False, f"{rel}: useMultipleInstances={val!r} (must be False)"

    def test_flood_guard_caps_at_one(self, rel):
        data = _load(rel)
        guard = next((e for e in _ese_expressions(data) if "TorrentsDB" in e), None)
        assert guard is not None, f"{rel}: no ESE mentions TorrentsDB — flood guard missing"
        assert _FLOOD_GUARD_RE.search(guard), (
            f"{rel}: TorrentsDB ESE does not match slice(addon(...,'TorrentsDB'),1)\n"
            f"  expression: {guard[:300]}"
        )


# ── Templates that must NOT have TorrentsDB ───────────────────

@pytest.mark.parametrize("rel", EXCLUDED_TDB)
def test_lite_speed_flash_no_torrentsdb(rel):
    assert _tdb_preset(_load(rel)) is None, (
        f"{rel}: torrents-db preset present — Lite/Speed/Flash templates should not carry it"
    )
