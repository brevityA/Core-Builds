"""scripts/check_upstream_drift.mjs diff logic (pure; no network).

Upstream reuses one name for tier variants. Keyed by name alone, a change to the
first of two same-named entries was invisible: #790 reported two changes and missed
the "Generated Dynamic HDR" edit that was making hosts refuse every generated config.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = (ROOT / "scripts" / "check_upstream_drift.mjs").as_uri()


def run_diff(live, pinned):
    js = (
        f"const m = await import({json.dumps(SCRIPT)});"
        f"const d = m.diff({json.dumps(live)}, {json.dumps(pinned)}, e => e.name);"
        "delete d.pinnedByKey; console.log(JSON.stringify(d));"
    )
    out = subprocess.run(["node", "--input-type=module", "-e", js], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def e(name, pattern):
    return {"name": name, "pattern": pattern, "score": 0}


def test_change_to_first_of_two_same_named_entries_is_reported():
    pinned = [e("Generated Dynamic HDR", "/a/"), e("Generated Dynamic HDR", "/b/")]
    live = [e("Generated Dynamic HDR", "/a2/"), e("Generated Dynamic HDR", "/b/")]
    assert run_diff(live, pinned)["changed"] == ["Generated Dynamic HDR"]


def test_change_to_second_same_named_entry_uses_the_ranked_list_suffix():
    pinned = [e("X", "/a/"), e("X", "/b/")]
    live = [e("X", "/a/"), e("X", "/b2/")]
    assert run_diff(live, pinned)["changed"] == ["X [B]"]


def test_dropping_a_repeat_is_a_removal_not_silence():
    d = run_diff([e("X", "/a/")], [e("X", "/a/"), e("X", "/b/")])
    assert d["removed"] == ["X [B]"] and d["changed"] == []


def test_identical_lists_report_nothing():
    same = [e("X", "/a/"), e("X", "/b/"), e("Y", "/c/")]
    assert run_diff(same, same) == {"added": [], "removed": [], "changed": [], "reordered": False}
