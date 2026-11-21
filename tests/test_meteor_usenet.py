"""Meteor's `usenet` option stays in every template and generator that configures Meteor.

AIOStreams 2.36 and 2.37 read `options.usenet` to turn on Meteor's Usenet search.
2.38.0 removed Meteor's Usenet support and ignores the key on save. Hosts still run
both lines (configurator/src/data/hosts.js), and the configurator's compatibility
target is chosen by hand, so removing the key only switches Usenet off on the older
hosts. #851 did exactly that to five templates; this keeps it from happening again.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FROZEN = ("/Legacy/", "/Deprecated/", "/Smart/")


def _meteor_presets():
    for path in sorted((ROOT / "Templates").rglob("*.json")):
        rel = "/" + path.relative_to(ROOT).as_posix()
        if any(part in rel for part in FROZEN):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if not isinstance(data, dict) or not isinstance(data.get("config"), dict):
            continue
        for preset in data["config"].get("presets") or []:
            if isinstance(preset, dict) and preset.get("type") == "meteor":
                yield rel, preset.get("options") or {}


def test_templates_that_configure_meteor_keep_its_usenet_option():
    checked = 0
    for rel, options in _meteor_presets():
        if "yourMedia" not in options:
            continue  # Flash / Speed EasyNews set only name, timeout and url
        checked += 1
        # Present on purpose; some templates set it off (their yourMedia sources omit usenet).
        usenet = options.get("usenet")
        assert isinstance(usenet, dict) and isinstance(usenet.get("enabled"), bool), rel
    assert checked >= 40, f"only {checked} Meteor presets found"


def test_generators_keep_meteor_usenet():
    for rel in ("configurator/src/js/app.js", "packages/core/src/generate-template.js"):
        src = (ROOT / rel).read_text(encoding="utf-8")
        lines = [line for line in src.splitlines() if "type:'meteor'" in line]
        assert lines, rel
        for line in lines:
            assert "usenet:{ enabled:true, customSearchEngines:true }" in line, rel
