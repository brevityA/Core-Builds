"""
Integration tests: run the validator as a subprocess against the real files in the repo.
These tests verify end-to-end behaviour and catch regressions in actual templates.
"""
import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
VALIDATOR = str(REPO_ROOT / "validate_templates.py")


def run_validator(*extra_args):
    return subprocess.run(
        [sys.executable, VALIDATOR, *extra_args],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )


class TestRealTemplates:
    def test_core_templates_pass_with_zero_errors(self):
        result = run_validator("--dir", "Templates")
        assert result.returncode == 0, (
            f"Validator found errors in real templates:\n{result.stdout}"
        )

    def test_community_templates_pass_with_zero_errors(self):
        result = run_validator("--dir", "Community-Templates")
        assert result.returncode == 0, (
            f"Validator found errors in community templates:\n{result.stdout}"
        )

    def test_validator_finds_templates_recursively(self):
        result = run_validator("--dir", "Templates")
        # The summary line reports "Checking N template(s)" — N must be > 0
        assert "Checking 0 template(s)" not in result.stdout, (
            "Validator found no templates — rglob search may be broken"
        )

    def test_multiple_dir_flags_accepted(self):
        result = run_validator("--dir", "Templates", "--dir", "Community-Templates")
        assert result.returncode == 0
        assert "Checking 0 template(s)" not in result.stdout


class TestExitCodes:
    def test_exits_zero_on_valid_template(self, tmp_path):
        t = tmp_path / "core-nexus-valid.json"
        t.write_text(json.dumps({
            "metadata": {"version": "1.0.0"},
            "config": {
                "presets": [],
                "groups": {"enabled": False},
                "deduplicator": {},
                "includedStreamExpressions": [{"expression": "0Cached == true"}],
            }
        }))
        result = run_validator("--file", str(t))
        assert result.returncode == 0

    def test_exits_one_on_schema_error(self, tmp_path):
        t = tmp_path / "core-nexus-broken.json"
        t.write_text(json.dumps({
            "metadata": {},
            "config": {
                "deduplicator": {"cached": "INVALID_MODE"}  # not in VALID['dedup_modes']
            }
        }))
        result = run_validator("--file", str(t))
        assert result.returncode == 1

    def test_exits_one_on_malformed_json(self, tmp_path):
        t = tmp_path / "core-nexus-bad.json"
        t.write_text("{this is not valid json")
        result = run_validator("--file", str(t))
        assert result.returncode == 1

    def test_output_contains_errors_section(self, tmp_path):
        t = tmp_path / "core-nexus-err.json"
        t.write_text(json.dumps({
            "metadata": {},
            "config": {"size": {"resolution": {}}}
        }))
        result = run_validator("--file", str(t))
        assert "ERRORS:" in result.stdout

    def test_output_contains_warnings_section(self, tmp_path):
        t = tmp_path / "core-nexus-warn.json"
        t.write_text(json.dumps({
            "metadata": {},
            "config": {"presets": []}
        }))
        result = run_validator("--file", str(t))
        assert "WARNINGS:" in result.stdout
