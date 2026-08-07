import json
import pytest


@pytest.fixture
def write_template(tmp_path):
    """Write a dict as JSON to a temp file; returns the path string."""
    def _write(data, filename="template.json"):
        p = tmp_path / filename
        p.write_text(json.dumps(data))
        return str(p)
    return _write


@pytest.fixture
def base_template():
    """Factory for a minimal template dict that produces zero errors and zero warnings."""
    def _make(**config_overrides):
        config = {
            "presets": [],
            "groups": {"enabled": False, "groups": []},
            "deduplicator": {},
            "sortCriteria": {},
            "formatter": {},
            "includedStreamExpressions": [
                {"expression": "0Cached == true"}
            ],
            "excludedStreamExpressions": [],
            "preferredStreamExpressions": [],
        }
        config.update(config_overrides)
        return {"metadata": {"version": "1.0.0"}, "config": config}
    return _make

