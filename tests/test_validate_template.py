"""
Unit tests for validate_template(). Each test targets a specific validation
branch and asserts that the returned (errors, warnings, passes) lists reflect
the expected outcome — no shared global state between calls.
"""
import json
from pathlib import Path
import pytest
from validate_templates import validate_template


# ── JSON Parsing ──────────────────────────────────────────────

class TestJsonParsing:
    def test_valid_json_produces_no_parse_error(self, write_template, base_template):
        path = write_template(base_template())
        errors, _, _ = validate_template(path)
        assert not any("INVALID JSON" in e for e in errors)

    def test_malformed_json_reports_error(self, tmp_path):
        p = tmp_path / "bad.json"
        p.write_text("{not valid json")
        errors, warnings, passes = validate_template(str(p))
        assert any("INVALID JSON" in e for e in errors)
        # Parse failure should short-circuit — no other checks run
        assert warnings == []
        assert passes == []

    def test_empty_file_reports_error(self, tmp_path):
        p = tmp_path / "empty.json"
        p.write_text("")
        errors, _, _ = validate_template(str(p))
        assert any("INVALID JSON" in e for e in errors)


# ── Metadata ──────────────────────────────────────────────────

class TestMetadata:
    def test_version_present_no_warning(self, write_template, base_template):
        path = write_template(base_template())
        _, warnings, _ = validate_template(path)
        assert not any("metadata.version" in w for w in warnings)

    def test_missing_version_warns(self, write_template, base_template):
        t = base_template()
        t["metadata"] = {}
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("metadata.version missing" in w for w in warnings)

    def test_no_metadata_key_warns(self, write_template, base_template):
        t = base_template()
        del t["metadata"]
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("metadata.version missing" in w for w in warnings)

    def test_missing_name_warns(self, write_template, base_template):
        t = base_template()
        t["metadata"] = {"version": "1.0.0"}
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("metadata.name missing" in w for w in warnings)

    def test_missing_description_warns(self, write_template, base_template):
        t = base_template()
        t["metadata"] = {"version": "1.0.0"}
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("metadata.description missing" in w for w in warnings)

    def test_missing_author_warns(self, write_template, base_template):
        t = base_template()
        t["metadata"] = {"version": "1.0.0"}
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("metadata.author missing" in w for w in warnings)

    def test_missing_category_warns(self, write_template, base_template):
        t = base_template()
        t["metadata"] = {"version": "1.0.0"}
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("metadata.category missing" in w for w in warnings)

    def test_full_metadata_no_warnings(self, write_template, base_template):
        t = base_template()
        t["metadata"] = {
            "version": "1.0.0",
            "name": "Test Template",
            "description": "A test template",
            "author": "Tester",
            "category": "Debrid",
        }
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert not any("metadata." in w for w in warnings)


# ── Sort Criteria ─────────────────────────────────────────────

class TestSortCriteria:
    def test_valid_sort_keys_pass(self, write_template, base_template):
        t = base_template(sortCriteria={
            "all": [{"key": "resolution", "order": "desc"},
                    {"key": "cached", "order": "desc"}]
        })
        path = write_template(t)
        errors, _, passes = validate_template(path)
        assert not any("sortCriteria" in e for e in errors)
        assert any("sortCriteria.all" in p and "valid" in p for p in passes)

    def test_invalid_sort_key_errors(self, write_template, base_template):
        t = base_template(sortCriteria={
            "all": [{"key": "BOGUS_KEY", "order": "desc"}]
        })
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert any("sortCriteria.all" in e and "BOGUS_KEY" in e for e in errors)

    def test_multiple_scopes_each_validated(self, write_template, base_template):
        t = base_template(sortCriteria={
            "all":    [{"key": "resolution"}],
            "movies": [{"key": "INVALID"}],
        })
        path = write_template(t)
        errors, _, passes = validate_template(path)
        assert not any("sortCriteria.all" in e for e in errors)
        assert any("sortCriteria.movies" in e and "INVALID" in e for e in errors)


# ── Preference / Exclusion Lists ──────────────────────────────

class TestPreferenceExclusionLists:
    def test_valid_excluded_resolutions_no_error(self, write_template, base_template):
        path = write_template(base_template(excludedResolutions=["240p", "360p"]))
        errors, _, _ = validate_template(path)
        assert not any("excludedResolutions" in e for e in errors)

    def test_invalid_excluded_resolution_errors(self, write_template, base_template):
        path = write_template(base_template(excludedResolutions=["8K"]))
        errors, _, _ = validate_template(path)
        assert any("excludedResolutions" in e and "8K" in e for e in errors)

    def test_invalid_excluded_quality_errors(self, write_template, base_template):
        path = write_template(base_template(excludedQualities=["NotAQuality"]))
        errors, _, _ = validate_template(path)
        assert any("excludedQualities" in e and "NotAQuality" in e for e in errors)

    def test_invalid_excluded_encode_errors(self, write_template, base_template):
        path = write_template(base_template(excludedEncodes=["H.264"]))
        errors, _, _ = validate_template(path)
        assert any("excludedEncodes" in e and "H.264" in e for e in errors)

    def test_invalid_visual_tag_errors(self, write_template, base_template):
        path = write_template(base_template(excludedVisualTags=["HDR12"]))
        errors, _, _ = validate_template(path)
        assert any("excludedVisualTags" in e and "HDR12" in e for e in errors)

    def test_invalid_audio_tag_errors(self, write_template, base_template):
        path = write_template(base_template(excludedAudioTags=["Dolby"]))
        errors, _, _ = validate_template(path)
        assert any("excludedAudioTags" in e and "Dolby" in e for e in errors)

    def test_invalid_audio_channel_errors(self, write_template, base_template):
        path = write_template(base_template(excludedAudioChannels=["8.0"]))
        errors, _, _ = validate_template(path)
        assert any("excludedAudioChannels" in e and "8.0" in e for e in errors)

    def test_empty_excluded_list_no_error(self, write_template, base_template):
        path = write_template(base_template(excludedResolutions=[]))
        errors, _, _ = validate_template(path)
        assert not any("excludedResolutions" in e for e in errors)

    def test_absent_field_no_error(self, write_template, base_template):
        # When the field is not present at all, there should be no error
        path = write_template(base_template())
        errors, _, _ = validate_template(path)
        assert not any("excludedResolutions" in e for e in errors)


# ── Presets ───────────────────────────────────────────────────

class TestPresets:
    def test_known_preset_type_no_warning(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "torbox-search", "instanceId": "p1", "enabled": True, "options": {}
        }])
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert not any("unknown type" in w for w in warnings)

    @pytest.mark.parametrize("preset_type", [
        "hdhub", "torrents-db", "sootio", "neko-bt",
        "animetosho", "dmm-cast", "easynews", "davex",
    ])
    def test_current_suite_preset_types_are_known(self, preset_type, write_template, base_template):
        t = base_template(presets=[{
            "type": preset_type, "instanceId": "p1", "enabled": True, "options": {}
        }])
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert not any("unknown type" in w for w in warnings)

    def test_unknown_preset_type_warns(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "future-addon", "instanceId": "p1", "enabled": True, "options": {}
        }])
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("future-addon" in w and "unknown type" in w for w in warnings)

    def test_peerflix_requires_explicit_use_multiple_instances_boolean(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "peerflix", "instanceId": "p1", "enabled": True,
            "options": {"name": "Peerflix", "timeout": 7000}
        }])
        path = write_template(t)
        errors, warnings, _ = validate_template(path)
        assert not any("unknown type" in w for w in warnings)
        assert any("peerflix" in e and "useMultipleInstances" in e for e in errors)

    def test_peerflix_accepts_explicit_false_use_multiple_instances(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "peerflix", "instanceId": "p1", "enabled": True,
            "options": {"name": "Peerflix", "timeout": 7000, "useMultipleInstances": False}
        }])
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert not any("peerflix" in e for e in errors)

    def test_subdl_requires_singular_language_array_and_hearing_impairment(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "subdl", "instanceId": "p1", "enabled": True,
            "options": {"name": "SubDL", "languages": ["en"]}
        }])
        path = write_template(t)
        errors, warnings, _ = validate_template(path)
        assert not any("unknown type" in w for w in warnings)
        assert any("subdl" in e and "language" in e for e in errors)
        assert any("subdl" in e and "hearingImpairment" in e for e in errors)

    def test_subdl_accepts_up_to_five_provider_language_codes(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "subdl", "instanceId": "p1", "enabled": True,
            "options": {"name": "SubDL", "language": ["EN", "IT", "FR"], "hearingImpairment": "hiInclude"}
        }])
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert not any("subdl" in e for e in errors)

    def test_stremthru_missing_timeout_errors(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "stremthruStore", "instanceId": "p1", "enabled": True,
            "options": {"name": "MyStore"}
        }])
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert any("stremthruStore" in e and "timeout" in e for e in errors)

    def test_stremthru_missing_name_errors(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "stremthruStore", "instanceId": "p1", "enabled": True,
            "options": {"timeout": 5000}
        }])
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert any("stremthruStore" in e and "name" in e for e in errors)

    def test_stremthru_with_both_required_options_no_error(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "stremthruStore", "instanceId": "p1", "enabled": True,
            "options": {"timeout": 5000, "name": "MyStore"}
        }])
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert not any("stremthruStore" in e for e in errors)

    def test_aiosubtitle_missing_languages_errors(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "aiosubtitle", "instanceId": "p1", "enabled": True,
            "options": {"timeout": 5000, "name": "Subs"}
        }])
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert any("aiosubtitle" in e and "languages" in e for e in errors)

    def test_aiosubtitle_with_languages_no_language_error(self, write_template, base_template):
        t = base_template(presets=[{
            "type": "aiosubtitle", "instanceId": "p1", "enabled": True,
            "options": {"timeout": 5000, "name": "Subs", "languages": ["en"]}
        }])
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert not any("aiosubtitle" in e and "languages" in e for e in errors)

    def test_preset_count_in_passes(self, write_template, base_template):
        t = base_template(presets=[
            {"type": "torbox-search", "instanceId": "p1", "enabled": True, "options": {}},
            {"type": "torbox-search", "instanceId": "p2", "enabled": False, "options": {}},
        ])
        path = write_template(t)
        _, _, passes = validate_template(path)
        assert any("presets: 2 total, 1 enabled" in p for p in passes)


# ── Groups ────────────────────────────────────────────────────

class TestGroups:
    def _template_with_group(self, base_template, preset_id="p1", enabled=True, condition="totalTimeTaken < 5000"):
        return base_template(
            presets=[{
                "type": "torbox-search", "instanceId": preset_id,
                "enabled": enabled, "options": {}
            }],
            groups={
                "enabled": True,
                "groups": [{
                    "name": "Group A",
                    "addonInstanceIds": [preset_id],
                    "condition": condition,
                }]
            }
        )

    def test_valid_group_no_error(self, write_template, base_template):
        path = write_template(self._template_with_group(base_template))
        errors, warnings, _ = validate_template(path)
        assert not any("Group A" in e for e in errors)
        assert not any("stale" in e for e in errors)

    def test_stale_instance_id_errors(self, write_template, base_template):
        t = base_template(
            presets=[],
            groups={
                "enabled": True,
                "groups": [{
                    "name": "Group A",
                    "addonInstanceIds": ["ghost-id"],
                    "condition": "totalTimeTaken < 5000",
                }]
            }
        )
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert any("Group A" in e and "stale" in e for e in errors)

    def test_disabled_preset_in_group_warns(self, write_template, base_template):
        path = write_template(self._template_with_group(base_template, enabled=False))
        _, warnings, _ = validate_template(path)
        assert any("Group A" in w and "disabled" in w for w in warnings)

    def test_condition_with_totalTimeTaken_no_warn(self, write_template, base_template):
        path = write_template(self._template_with_group(base_template, condition="totalTimeTaken < 5000"))
        _, warnings, _ = validate_template(path)
        assert not any("time safety net" in w for w in warnings)

    def test_condition_with_previousGroupTimeTaken_no_warn(self, write_template, base_template):
        path = write_template(self._template_with_group(base_template, condition="previousGroupTimeTaken < 3000"))
        _, warnings, _ = validate_template(path)
        assert not any("time safety net" in w for w in warnings)

    def test_condition_without_time_guard_warns(self, write_template, base_template):
        path = write_template(self._template_with_group(base_template, condition="someFlag == true"))
        _, warnings, _ = validate_template(path)
        assert any("Group A" in w and "time safety net" in w for w in warnings)

    def test_empty_condition_no_time_warning(self, write_template, base_template):
        path = write_template(self._template_with_group(base_template, condition=""))
        _, warnings, _ = validate_template(path)
        assert not any("time safety net" in w for w in warnings)

    def test_groups_disabled_skips_group_checks(self, write_template, base_template):
        # Even with a stale ID, disabled groups block should not produce errors
        t = base_template(
            presets=[],
            groups={
                "enabled": False,
                "groups": [{"name": "G", "addonInstanceIds": ["ghost"], "condition": ""}]
            }
        )
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert not any("stale" in e for e in errors)


# ── Deduplicator ──────────────────────────────────────────────

class TestDeduplicator:
    def test_valid_dedup_mode_no_error(self, write_template, base_template):
        path = write_template(base_template(deduplicator={"cached": "per_addon", "uncached": "per_service"}))
        errors, _, _ = validate_template(path)
        assert not any("deduplicator" in e for e in errors)

    def test_invalid_cached_mode_errors(self, write_template, base_template):
        path = write_template(base_template(deduplicator={"cached": "INVALID_MODE"}))
        errors, _, _ = validate_template(path)
        assert any("deduplicator.cached" in e and "INVALID_MODE" in e for e in errors)

    def test_invalid_uncached_mode_errors(self, write_template, base_template):
        path = write_template(base_template(deduplicator={"uncached": "all"}))
        errors, _, _ = validate_template(path)
        assert any("deduplicator.uncached" in e and "all" in e for e in errors)

    def test_missing_dedup_keys_no_error(self, write_template, base_template):
        path = write_template(base_template(deduplicator={}))
        errors, _, _ = validate_template(path)
        assert not any("deduplicator" in e for e in errors)


# ── Matching ──────────────────────────────────────────────────

class TestMatching:
    def test_exact_title_matching_warns(self, write_template, base_template):
        path = write_template(base_template(titleMatching={"mode": "exact"}))
        _, warnings, _ = validate_template(path)
        assert any("titleMatching.mode is 'exact'" in w for w in warnings)

    def test_non_exact_title_matching_no_warn(self, write_template, base_template):
        path = write_template(base_template(titleMatching={"mode": "fuzzy"}))
        _, warnings, _ = validate_template(path)
        assert not any("titleMatching.mode" in w for w in warnings)

    def test_high_similarity_threshold_warns(self, write_template, base_template):
        path = write_template(base_template(titleMatching={"similarityThreshold": 0.9}))
        _, warnings, _ = validate_template(path)
        assert any("similarityThreshold" in w and "very strict" in w for w in warnings)

    def test_threshold_exactly_at_boundary_no_warn(self, write_template, base_template):
        path = write_template(base_template(titleMatching={"similarityThreshold": 0.85}))
        _, warnings, _ = validate_template(path)
        assert not any("similarityThreshold" in w for w in warnings)

    def test_strict_year_matching_warns(self, write_template, base_template):
        path = write_template(base_template(yearMatching={"strict": True}))
        _, warnings, _ = validate_template(path)
        assert any("yearMatching.strict" in w for w in warnings)

    def test_non_strict_year_matching_no_warn(self, write_template, base_template):
        path = write_template(base_template(yearMatching={"strict": False}))
        _, warnings, _ = validate_template(path)
        assert not any("yearMatching" in w for w in warnings)

    def test_strict_season_episode_matching_warns(self, write_template, base_template):
        path = write_template(base_template(seasonEpisodeMatching={"strict": True}))
        _, warnings, _ = validate_template(path)
        assert any("seasonEpisodeMatching.strict" in w for w in warnings)

    def test_required_languages_warns(self, write_template, base_template):
        path = write_template(base_template(requiredLanguages=["en", "fr"]))
        _, warnings, _ = validate_template(path)
        assert any("requiredLanguages" in w for w in warnings)

    def test_reviewed_required_languages_do_not_warn(self, write_template, base_template):
        reviewed = ["English", "Original", "Dual Audio", "Multi", "Dubbed", "Unknown"]
        path = write_template(base_template(requiredLanguages=reviewed))
        _, warnings, passes = validate_template(path)
        assert not any("requiredLanguages" in w for w in warnings)
        assert any("requiredLanguages policy reviewed" in p for p in passes)

    def test_no_required_languages_no_warn(self, write_template, base_template):
        path = write_template(base_template())
        _, warnings, _ = validate_template(path)
        assert not any("requiredLanguages" in w for w in warnings)


# ── Size Limits ───────────────────────────────────────────────

class TestSizeLimits:
    def test_size_global_no_error(self, write_template, base_template):
        path = write_template(base_template(**{"size": {"global": {"max": 50000}}}))
        errors, _, _ = validate_template(path)
        assert not any("size" in e for e in errors)

    def test_size_resolution_no_error(self, write_template, base_template):
        # size.resolution is a valid AIOStreams schema key
        path = write_template(base_template(**{"size": {"resolution": {"max": 50000}}}))
        errors, _, _ = validate_template(path)
        assert not any("size.resolution" in e for e in errors)

    def test_size_global_and_resolution_together_no_error(self, write_template, base_template):
        path = write_template(base_template(**{"size": {"global": {"max": 100000}, "resolution": {"1080p": {"max": 50000}}}}))
        errors, _, _ = validate_template(path)
        assert not any("size" in e for e in errors)

    def test_absent_size_no_error(self, write_template, base_template):
        path = write_template(base_template())
        errors, _, _ = validate_template(path)
        assert not any("size" in e for e in errors)


# ── Formatter ─────────────────────────────────────────────────

class TestFormatter:
    def test_tamtaro_correct_override_key_passes(self, write_template, base_template):
        t = base_template(formatter={
            "id": "tamtaro",
            "definitions": {"overrides": {"tamtaro": {}}}
        })
        path = write_template(t)
        errors, _, passes = validate_template(path)
        assert not any("tamtaro" in e for e in errors)
        assert any("Nexus Prime override correctly keyed" in p for p in passes)

    def test_tamtaro_wrong_override_key_errors(self, write_template, base_template):
        t = base_template(formatter={
            "id": "tamtaro",
            "definitions": {"overrides": {"wrongKey": {}}}
        })
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert any("tamtaro" in e and "overrides key is not 'tamtaro'" in e for e in errors)

    def test_tamtaro_no_overrides_section_errors(self, write_template, base_template):
        t = base_template(formatter={"id": "tamtaro", "definitions": {}})
        path = write_template(t)
        errors, _, _ = validate_template(path)
        assert any("tamtaro" in e and "overrides key is not 'tamtaro'" in e for e in errors)

    def test_builtin_formatter_reported_in_passes(self, write_template, base_template):
        path = write_template(base_template(formatter={"id": "minimal"}))
        errors, _, passes = validate_template(path)
        assert not any("formatter" in e for e in errors)
        assert any("formatter: using built-in 'minimal'" in p for p in passes)

    def test_no_formatter_id_no_error(self, write_template, base_template):
        path = write_template(base_template(formatter={}))
        errors, _, _ = validate_template(path)
        assert not any("formatter" in e for e in errors)


# ── Stream Expressions ────────────────────────────────────────

class TestStreamExpressions:
    def test_zero_cached_ise_present_no_warn(self, write_template, base_template):
        t = base_template(includedStreamExpressions=[{"expression": "0Cached == true"}])
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert not any("0Cached ISE missing" in w for w in warnings)

    def test_missing_zero_cached_ise_warns(self, write_template, base_template):
        t = base_template(includedStreamExpressions=[{"expression": "resolution == '1080p'"}])
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("0Cached ISE missing" in w for w in warnings)

    def test_empty_ise_list_warns_missing_zero_cached(self, write_template, base_template):
        t = base_template(includedStreamExpressions=[])
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("0Cached ISE missing" in w for w in warnings)

    def test_ise_ese_pse_counts_in_passes(self, write_template, base_template):
        t = base_template(
            includedStreamExpressions=[{"expression": "0Cached == true"}, {"expression": "x"}],
            excludedStreamExpressions=[{"expression": "y"}],
            preferredStreamExpressions=[{"expression": "z"}, {"expression": "w"}],
        )
        path = write_template(t)
        _, _, passes = validate_template(path)
        assert any("2 ISEs, 1 ESEs, 2 PSEs" in p for p in passes)

    def test_double_load_synced_url_and_inline_ises_warns(self, write_template, base_template):
        t = base_template(
            syncedIncludedStreamExpressionUrls=["https://example.com/ises"],
            includedStreamExpressions=[
                {"expression": "0Cached == true"},
                {"expression": "Core Builds ISE v3 — match expression"},
            ]
        )
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("ISEs inline AND synced URL" in w for w in warnings)

    def test_double_load_inline_ise_v_pattern_warns(self, write_template, base_template):
        t = base_template(
            syncedIncludedStreamExpressionUrls=["https://example.com/ises"],
            includedStreamExpressions=[
                {"expression": "0Cached == true"},
                {"expression": "ISE v4 — something"},
            ]
        )
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert any("ISEs inline AND synced URL" in w for w in warnings)

    def test_synced_url_without_inline_ises_no_warn(self, write_template, base_template):
        t = base_template(
            syncedIncludedStreamExpressionUrls=["https://example.com/ises"],
            includedStreamExpressions=[{"expression": "0Cached == true"}]
        )
        path = write_template(t)
        _, warnings, _ = validate_template(path)
        assert not any("ISEs inline AND synced URL" in w for w in warnings)


# ── Isolation ─────────────────────────────────────────────────

class TestCallIsolation:
    """Verify that successive validate_template() calls do not share state."""

    def test_errors_do_not_bleed_between_calls(self, write_template, base_template, tmp_path):
        bad = tmp_path / "core-nexus-bad.json"
        bad.write_text(json.dumps({
            "metadata": {},
            "config": {"deduplicator": {"cached": "INVALID_MODE"}}  # triggers an error
        }))
        good = write_template(base_template(), filename="good.json")

        errors_bad, _, _ = validate_template(str(bad))
        errors_good, _, _ = validate_template(good)

        assert errors_bad          # bad template has errors
        assert not errors_good     # good template is clean regardless

    def test_warnings_do_not_bleed_between_calls(self, write_template, base_template):
        warn_path = write_template(
            base_template(titleMatching={"mode": "exact"}), filename="w.json"
        )
        clean_path = write_template(base_template(), filename="clean.json")

        _, warnings_w, _ = validate_template(warn_path)
        _, warnings_c, _ = validate_template(clean_path)

        assert any("titleMatching.mode is 'exact'" in w for w in warnings_w)
        assert not any("titleMatching" in w for w in warnings_c)



# ── Static Template File Checks ───────────────────────────────

class TestStaticTemplateFiles:
    """Validates all JSON files under Templates/ and Community-Templates/ against
    schema rules that the per-template validate_template() does not cover."""

    REPO_ROOT = Path(__file__).parent.parent
    TAMTARO_FRAGMENT = "Tam-Taro/SEL-Filtering-and-Sorting"

    def _collect_templates(self, skip_deprecated=True):
        for d in [self.REPO_ROOT / "Templates", self.REPO_ROOT / "Community-Templates"]:
            if not d.exists():
                continue
            for f in d.rglob("*.json"):
                if skip_deprecated and "Deprecated" in f.parts:
                    continue
                yield f

    def test_all_active_templates_have_tamtaro_formatter_id(self):
        """Every non-deprecated template with an embedded formatter must use id:'tamtaro'."""
        bad = []
        for f in self._collect_templates():
            try:
                d = json.loads(f.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            fmt = d.get("config", {}).get("formatter", {})
            fid = fmt.get("id")
            if fid and fid != "tamtaro":
                bad.append(f"{f.relative_to(self.REPO_ROOT)}: id={fid}")
        assert not bad, "Templates with non-tamtaro formatter id:\n" + "\n".join(bad)

    def test_no_stale_tamtaro_synced_urls(self):
        """No active template should reference the old Tam-Taro synced URL."""
        bad = []
        for f in self._collect_templates():
            try:
                text = f.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if self.TAMTARO_FRAGMENT in text:
                bad.append(str(f.relative_to(self.REPO_ROOT)))
        assert not bad, "Templates with stale Tam-Taro synced URL:\n" + "\n".join(bad)
