"""Contracts for the checked-in Core Stable baseline templates."""

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
STABLE_DIR = ROOT / "Templates" / "Stable"


@pytest.mark.parametrize(
    "filename, expected_resolution, expected_limit",
    [
        ("core-stable-torbox-1080p.json", "1080p", 10),
        ("core-stable-torbox-4k.json", "2160p", 12),
    ],
)
def test_core_stable_templates_stay_within_the_stable_contract(filename, expected_resolution, expected_limit):
    template = json.loads((STABLE_DIR / filename).read_text())
    metadata = template["metadata"]
    config = template["config"]

    assert metadata["coreBuildsProfile"] == "stable"
    assert metadata["coreBuildsVersion"] == "2.89"
    assert metadata["author"] == "Branding-Brevity"
    # 1.0.2: the 2.34.1 schema alignment. Five settings AIOStreams no longer
    # defines were dropped (maxResults, maxResultsPerResolution, seadexBestOnly,
    # excludedStreamSources, nzbFailover) and failover + excludedStreamTypes took
    # their place, so the templates genuinely changed and had to bump — without it
    # the update banner never offers the corrected copy.
    assert metadata["version"] == "1.0.2"
    assert config["groups"]["enabled"] is False
    assert config["dynamicAddonFetching"]["enabled"] is False
    assert config["syncedRankedRegexUrls"] == []
    assert config["syncedRankedStreamExpressionUrls"] == []
    assert config["rankedRegexPatterns"] == []
    assert config["excludedRegexPatterns"] == []
    assert config["excludedStreamExpressions"]
    assert len(config["excludedStreamExpressions"]) == 1
    assert config["includedStreamExpressions"] == []
    assert config["preferredStreamExpressions"] == []
    assert config["resultLimits"]["global"] == expected_limit
    assert config["resultLimits"]["mode"] == "independent"
    assert config["hideErrors"] is False
    # Off deliberately: the stats cards render inside the stream list (above the
    # streams on Android TV), so they are not a diagnostics pane. hideErrors
    # stays False, which is what keeps real failures visible.
    assert config["statistics"]["enabled"] is False
    assert config["posterService"] == "none"
    assert expected_resolution in config["preferredResolutions"]


def test_1080p_core_stable_uses_native_higher_resolution_exclusions():
    template = json.loads((STABLE_DIR / "core-stable-torbox-1080p.json").read_text())
    excluded = template["config"]["excludedResolutions"]
    assert "2160p" in excluded
    assert "1440p" in excluded
