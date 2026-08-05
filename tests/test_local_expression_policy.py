"""Regression guard: Core Builds emits local stream expressions only."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYNCED_EXPRESSION_FIELDS = (
    "syncedExcludedStreamExpressionUrls",
    "syncedIncludedStreamExpressionUrls",
    "syncedPreferredStreamExpressionUrls",
    "syncedRankedStreamExpressionUrls",
)
SCORE_DEPENDENT = re.compile(r"\b(?:streamExpressionScore|rseMatched)\s*\(")


def expression(entry):
    if isinstance(entry, dict):
        return str(entry.get("expression", ""))
    return str(entry)


def has_local_ranked_expression(config):
    for entry in config.get("rankedStreamExpressions", []) or []:
        if not isinstance(entry, dict) or entry.get("enabled", True) is False:
            continue
        value = str(entry.get("expression", "")).strip()
        if value and value != "[]":
            return True
    return False


def test_core_template_suite_has_no_synced_stream_expression_urls():
    templates = sorted((ROOT / "Templates").rglob("*.json"))
    assert templates
    offenders = []
    for path in templates:
        config = json.loads(path.read_text()).get("config", {})
        for field in SYNCED_EXPRESSION_FIELDS:
            if config.get(field):
                offenders.append(f"{path.relative_to(ROOT)}:{field}")
    assert offenders == []


def test_score_dependent_rules_have_local_ranked_expression_owner():
    offenders = []
    for path in sorted((ROOT / "Templates").rglob("*.json")):
        config = json.loads(path.read_text()).get("config", {})
        if has_local_ranked_expression(config):
            continue

        for field in (
            "excludedStreamExpressions",
            "includedStreamExpressions",
            "requiredStreamExpressions",
            "preferredStreamExpressions",
        ):
            for entry in config.get(field, []) or []:
                if SCORE_DEPENDENT.search(expression(entry)):
                    offenders.append(f"{path.relative_to(ROOT)}:{field}")

        for scope, entries in (config.get("sortCriteria") or {}).items():
            for entry in entries if isinstance(entries, list) else []:
                if isinstance(entry, dict) and entry.get("key") == "streamExpressionScore":
                    offenders.append(f"{path.relative_to(ROOT)}:sortCriteria.{scope}")

    assert offenders == []


def test_core_template_suite_never_stacks_groups_and_dynamic_fetching():
    offenders = []
    for path in sorted((ROOT / "Templates").rglob("*.json")):
        config = json.loads(path.read_text()).get("config", {})
        groups = config.get("groups", {}) or {}
        dynamic = config.get("dynamicAddonFetching", {}) or {}
        if groups.get("enabled") and dynamic.get("enabled"):
            offenders.append(str(path.relative_to(ROOT)))
    assert offenders == []


def test_core_template_collection_never_stacks_groups_and_dynamic_fetching():
    collection = json.loads((ROOT / "core-builds-template-collection.json").read_text())
    items = collection if isinstance(collection, list) else collection.get("templates", [])
    offenders = []
    for index, template in enumerate(items):
        config = template.get("config", {}) if isinstance(template, dict) else {}
        groups = config.get("groups", {}) or {}
        dynamic = config.get("dynamicAddonFetching", {}) or {}
        if groups.get("enabled") and dynamic.get("enabled"):
            offenders.append(index)
    assert offenders == []


def test_legacy_torbox_search_is_explicitly_limited_to_v231_compatibility_artifacts():
    offenders = []

    def check(template, label):
        config = template.get("config", {}) if isinstance(template, dict) else {}
        has_legacy = any(
            preset.get("type") == "torbox-search"
            for preset in config.get("presets", [])
            if isinstance(preset, dict)
        )
        if not has_legacy:
            return
        compatibility = (template.get("metadata", {}) or {}).get("coreBuildsCompatibility", {})
        if not (
            compatibility.get("legacyTorboxSearch") is True
            and compatibility.get("maximumAIOStreamsVersion") == "2.31.1"
        ):
            offenders.append(label)

    for path in sorted((ROOT / "Templates").rglob("*.json")):
        check(json.loads(path.read_text()), str(path.relative_to(ROOT)))

    collection = json.loads((ROOT / "core-builds-template-collection.json").read_text())
    items = collection if isinstance(collection, list) else collection.get("templates", [])
    for index, template in enumerate(items):
        check(template, f"core-builds-template-collection.json[{index}]")

    assert offenders == []


def test_legacy_torbox_search_selectors_and_directives_are_only_in_marked_v231_artifacts():
    offenders = []
    for path in sorted((ROOT / "Templates").rglob("*.json")):
        template = json.loads(path.read_text())
        config = template.get("config", {})
        compatibility = (template.get("metadata", {}) or {}).get("coreBuildsCompatibility", {})
        marked_legacy = (
            compatibility.get("legacyTorboxSearch") is True
            and compatibility.get("maximumAIOStreamsVersion") == "2.31.1"
        )
        has_legacy_reference = False
        for field in (
            "excludedStreamExpressions",
            "includedStreamExpressions",
            "requiredStreamExpressions",
            "preferredStreamExpressions",
            "rankedStreamExpressions",
        ):
            for entry in config.get(field, []) or []:
                if "TorBox Search" in expression(entry):
                    has_legacy_reference = True
        for item in (template.get("metadata", {}) or {}).get("inputs", []) or []:
            if isinstance(item, dict) and item.get("id") == "enableTorboxSearch":
                has_legacy_reference = True
        if has_legacy_reference and not marked_legacy:
            offenders.append(str(path.relative_to(ROOT)))
    assert offenders == []
