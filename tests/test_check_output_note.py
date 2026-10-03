"""Unit tests for scripts/check_output_note.py (pure logic; no git)."""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("check_output_note", ROOT / "scripts" / "check_output_note.py")
con = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(con)

NOTE = "Generated output unchanged — this release ships tools and docs only."


def doc(version, **config):
    return {"metadata": {"coreBuildsVersion": version, "generatedAt": "x"}, "config": config}


def test_stamp_only_difference_is_not_a_change():
    assert not con.goldens_changed({"a.json": doc("3.13", x=1)}, {"a.json": doc("3.14", x=1)})


def test_config_difference_is_a_change():
    assert con.goldens_changed({"a.json": doc("3.13", x=1)}, {"a.json": doc("3.14", x=2)})


def test_added_or_removed_golden_is_a_change():
    assert con.goldens_changed({"a.json": doc("1")}, {"a.json": doc("1"), "b.json": doc("1")})


def test_non_release_pr_is_never_checked():
    assert con.evaluate("3.13", "3.13", [], changed=False) is None


def test_release_without_output_change_needs_the_note():
    assert "Generated output unchanged" in con.evaluate("3.13", "3.14", ["Tools — x"], changed=False)
    assert con.evaluate("3.13", "3.14", [NOTE], changed=False) is None


def test_note_on_a_release_that_changed_output_is_rejected():
    assert "but golden configs changed" in con.evaluate("3.13", "3.14", [NOTE], changed=True)
    assert con.evaluate("3.13", "3.14", ["Balanced restored — x"], changed=True) is None


def test_newest_entry_parses_the_real_changelog():
    text = (ROOT / "configurator" / "src" / "data" / "changelog.js").read_text(encoding="utf-8")
    version, items = con.newest_entry(text)
    assert version and items and all(isinstance(i, str) and i for i in items)
