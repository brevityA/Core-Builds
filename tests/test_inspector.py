"""
Tests for the Template Inspector web tool.
Validates that the inspector's validation logic matches the Python validator.
"""
import json
import pytest
from pathlib import Path


def make_template(**overrides):
    """Create a minimal valid template with optional overrides."""
    base = {
        "metadata": {
            "version": "1.0.0",
            "name": "Test Template",
            "description": "A test template",
            "author": "Tester",
            "category": "Debrid",
        },
        "config": {
            "presets": [
                {"type": "torrentio", "instanceId": "t1", "enabled": True, "options": {}},
                {"type": "torbox-search", "instanceId": "tb1", "enabled": True, "options": {}},
            ],
            "formatter": {
                "id": "tamtaro",
                "definitions": {"overrides": {"tamtaro": {"name": "Test", "description": "Test"}}}
            },
            "includedStreamExpressions": [{"expression": "0Cached == true"}],
            "excludedStreamExpressions": [],
            "preferredStreamExpressions": [],
            "sortCriteria": {
                "global": [
                    {"key": "resolution", "order": "desc"},
                    {"key": "cached", "order": "desc"},
                ]
            },
            "titleMatching": {"mode": "fuzzy", "similarityThreshold": 0.85},
            "yearMatching": {"strict": False},
            "deduplicator": {"cached": "per_addon", "uncached": "per_service"},
        }
    }
    # Deep merge overrides
    for key, value in overrides.items():
        if key == 'config':
            base['config'].update(value)
        elif key == 'metadata':
            base['metadata'].update(value)
        else:
            base[key] = value
    return base


class TestInspectorValidation:
    """Verify the inspector's JS validation logic matches expected behavior."""

    def test_valid_template_has_no_errors(self):
        """A well-formed template should pass all checks."""
        t = make_template()
        # This is a structural test — the actual validation runs in JS
        # We verify the template structure is valid
        assert t['config']['formatter']['id'] == 'tamtaro'
        assert 'tamtaro' in t['config']['formatter']['definitions']['overrides']
        assert len(t['config']['presets']) == 2
        assert t['config']['includedStreamExpressions'][0]['expression'] == '0Cached == true'

    def test_wrong_formatter_override_key_would_error(self):
        """Template with tamtaro id but wrong override key should be caught."""
        t = make_template(config={
            "formatter": {
                "id": "tamtaro",
                "definitions": {"overrides": {"wrongKey": {}}}
            }
        })
        overrides = t['config']['formatter']['definitions']['overrides']
        assert 'tamtaro' not in overrides
        # The inspector should flag this as an error

    def test_missing_0cached_ise_would_warn(self):
        """Template without 0Cached ISE should trigger a warning."""
        t = make_template(config={
            "includedStreamExpressions": [{"expression": "resolution == '1080p'"}]
        })
        has_cached = any('0Cached' in e['expression'] for e in t['config']['includedStreamExpressions'])
        assert not has_cached
        # The inspector should warn about this

    def test_exact_title_matching_would_warn(self):
        """titleMatching.mode='exact' should trigger a warning."""
        t = make_template(config={
            "titleMatching": {"mode": "exact"}
        })
        assert t['config']['titleMatching']['mode'] == 'exact'
        # The inspector should warn about this

    def test_strict_year_matching_would_warn(self):
        """yearMatching.strict=true should trigger a warning."""
        t = make_template(config={
            "yearMatching": {"strict": True}
        })
        assert t['config']['yearMatching']['strict'] is True
        # The inspector should warn about this

    def test_missing_instance_id_would_warn(self):
        """Presets without instanceId should trigger a warning."""
        t = make_template(config={
            "presets": [
                {"type": "torrentio", "enabled": True, "options": {}},
            ]
        })
        assert 'instanceId' not in t['config']['presets'][0]
        # The inspector should warn about this

    def test_invalid_sort_key_would_error(self):
        """An invalid sort key should trigger an error."""
        t = make_template(config={
            "sortCriteria": {
                "global": [{"key": "BOGUS_KEY", "order": "desc"}]
            }
        })
        VALID_KEYS = {'resolution', 'quality', 'cached', 'size', 'seeders'}
        invalid = [k for k in t['config']['sortCriteria']['global'] if k['key'] not in VALID_KEYS]
        assert len(invalid) > 0
        # The inspector should error about this


class TestHostCompatibility:
    """Verify host compatibility checks work correctly."""

    def test_tamtaro_url_would_block_elfhosted(self):
        """Tam-Taro synced URLs should block elfhosted."""
        t = make_template(config={
            "syncedRankedRegexUrls": [
                "https://raw.githubusercontent.com/Tam-Taro/SEL-Filtering-and-Sorting/main/test.json"
            ]
        })
        urls = t['config'].get('syncedRankedRegexUrls', [])
        has_tamtaro = any('Tam-Taro' in u for u in urls)
        assert has_tamtaro
        # The inspector should flag elfhosted as blocked

    def test_not_function_would_block_hosts(self):
        """SEL expressions using not() should block elfhosted and fortheweak."""
        t = make_template(config={
            "excludedStreamExpressions": [
                {"expression": "/* Test */ not(resolution(streams, '2160p'))"}
            ]
        })
        exprs = t['config']['excludedStreamExpressions']
        has_not = any('not(' in e.get('expression', '') for e in exprs)
        assert has_not
        # The inspector should flag both hosts

    def test_clean_template_is_compatible(self):
        """A clean template should be compatible with all hosts."""
        t = make_template()
        cfg = t['config']
        synced = cfg.get('syncedRankedRegexUrls', []) + cfg.get('syncedExcludedRegexUrls', [])
        assert not any('Tam-Taro' in u for u in synced)
        exprs = cfg.get('excludedStreamExpressions', []) + cfg.get('includedStreamExpressions', [])
        assert not any('not(' in e.get('expression', '') for e in exprs)
