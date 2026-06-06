from validate_templates import validate_list, VALID


def test_all_valid_values_returns_empty():
    assert validate_list(["1080p", "720p"], VALID["resolutions"]) == []


def test_invalid_value_is_returned():
    assert validate_list(["1080p", "8K"], VALID["resolutions"]) == ["8K"]


def test_multiple_invalid_values_all_returned():
    bad = validate_list(["8K", "4K"], VALID["resolutions"])
    assert set(bad) == {"8K", "4K"}


def test_empty_list_returns_empty():
    assert validate_list([], VALID["resolutions"]) == []


def test_none_returns_empty():
    assert validate_list(None, VALID["resolutions"]) == []


def test_matching_is_case_sensitive():
    # "1080P" with uppercase P is not in the valid set
    assert validate_list(["1080P"], VALID["resolutions"]) == ["1080P"]


def test_valid_audio_tags():
    assert validate_list(["Atmos", "DTS-HD MA"], VALID["audio_tags"]) == []


def test_invalid_audio_tag():
    assert validate_list(["Dolby"], VALID["audio_tags"]) == ["Dolby"]


def test_valid_dedup_modes():
    for mode in ("single_result", "per_service", "per_addon", "disabled"):
        assert validate_list([mode], VALID["dedup_modes"]) == []


def test_invalid_dedup_mode():
    assert validate_list(["ALL"], VALID["dedup_modes"]) == ["ALL"]


def test_ac4_is_valid_audio_tag():
    assert validate_list(["AC-4"], VALID["audio_tags"]) == []


def test_vp9_is_valid_encode():
    assert validate_list(["VP9"], VALID["encodes"]) == []


def test_vp9_with_other_valid_encodes():
    assert validate_list(["AV1", "VP9", "HEVC"], VALID["encodes"]) == []


def test_ac4_mixed_with_other_valid_audio_tags():
    assert validate_list(["Atmos", "AC-4", "TrueHD"], VALID["audio_tags"]) == []
