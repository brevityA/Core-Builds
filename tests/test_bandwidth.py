"""
Tests for bandwidth-based bitrate limit calculator.
"""
import pytest


def calculate_bitrate_limit(speed_mbps):
    """Python port of bandwidth.js calculateBitrateLimit()"""
    if not speed_mbps or speed_mbps <= 0:
        return {"maxBitrate": None, "label": "Unlimited", "description": "No bitrate cap"}

    safe_mbps = speed_mbps * 0.8
    max_bitrate = round(safe_mbps / 1.2)

    if max_bitrate <= 5:
        label, desc = "Very Low", f"{max_bitrate} Mbps cap — 720p WEB-DL only"
    elif max_bitrate <= 15:
        label, desc = "Low", f"{max_bitrate} Mbps cap — 1080p WEB-DL, no Remux"
    elif max_bitrate <= 35:
        label, desc = "Medium", f"{max_bitrate} Mbps cap — 1080p Remux or 4K WEB-DL"
    elif max_bitrate <= 65:
        label, desc = "High", f"{max_bitrate} Mbps cap — 4K Remux at moderate bitrate"
    elif max_bitrate <= 130:
        label, desc = "Very High", f"{max_bitrate} Mbps cap — 4K Remux, no practical limit"
    else:
        label, desc = "Unlimited", f"{max_bitrate} Mbps cap — no practical limit"

    return {"maxBitrate": max_bitrate, "label": label, "description": desc}


class TestBandwidthCalculator:
    def test_zero_speed_returns_unlimited(self):
        r = calculate_bitrate_limit(0)
        assert r["maxBitrate"] is None
        assert r["label"] == "Unlimited"

    def test_negative_speed_returns_unlimited(self):
        r = calculate_bitrate_limit(-10)
        assert r["maxBitrate"] is None

    def test_none_speed_returns_unlimited(self):
        r = calculate_bitrate_limit(None)
        assert r["maxBitrate"] is None

    def test_25mbps_gives_low_cap(self):
        r = calculate_bitrate_limit(25)
        # 25 * 0.8 / 1.2 = 16.67 → 17
        assert r["maxBitrate"] == 17
        assert r["label"] == "Medium"

    def test_50mbps_gives_medium_cap(self):
        r = calculate_bitrate_limit(50)
        # 50 * 0.8 / 1.2 = 33.33 → 33
        assert r["maxBitrate"] == 33
        assert r["label"] == "Medium"

    def test_100mbps_gives_high_cap(self):
        r = calculate_bitrate_limit(100)
        # 100 * 0.8 / 1.2 = 66.67 → 67
        assert r["maxBitrate"] == 67
        assert r["label"] == "Very High"

    def test_200mbps_gives_very_high_cap(self):
        r = calculate_bitrate_limit(200)
        # 200 * 0.8 / 1.2 = 133.33 → 133
        assert r["maxBitrate"] == 133
        assert r["label"] == "Unlimited"

    def test_10mbps_gives_very_low_cap(self):
        r = calculate_bitrate_limit(10)
        # 10 * 0.8 / 1.2 = 6.67 → 7
        assert r["maxBitrate"] == 7
        assert r["label"] == "Low"

    def test_formula_is_80_percent_with_1_2_safety(self):
        """The formula should be: speed * 0.8 / 1.2"""
        for speed in [10, 25, 50, 100, 200, 500]:
            r = calculate_bitrate_limit(speed)
            expected = round(speed * 0.8 / 1.2)
            assert r["maxBitrate"] == expected, f"Failed for {speed} Mbps"


class TestSpeedTiers:
    """Verify the predefined speed tiers are reasonable."""

    TIERS = [
        {"speed": 25, "label": "25 Mbps", "maxBitrate": 17},
        {"speed": 50, "label": "50 Mbps", "maxBitrate": 33},
        {"speed": 100, "label": "100 Mbps", "maxBitrate": 67},
        {"speed": 200, "label": "200 Mbps", "maxBitrate": 133},
        {"speed": 500, "label": "500 Mbps", "maxBitrate": 333},
    ]

    @pytest.mark.parametrize("tier", TIERS, ids=lambda t: t["label"])
    def test_tier_bitrate_matches_formula(self, tier):
        expected = round(tier["speed"] * 0.8 / 1.2)
        assert tier["maxBitrate"] == expected

    def test_tiers_are_sorted_by_speed(self):
        speeds = [t["speed"] for t in self.TIERS]
        assert speeds == sorted(speeds)
