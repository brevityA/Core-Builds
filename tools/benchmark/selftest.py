#!/usr/bin/env python3
"""Offline self-test for the benchmark harness. No network, no credentials.

Proves the mechanics work before you spend hours of instance time:
  * every local contender template loads and the lane injection is correct
  * every variant mutation applies and changes EXACTLY one thing vs its control
  * the sanitizer removes credentials from a config-shaped object
  * the junk / dedup / rank scorers behave on hand-built rows

The synthetic rows below are TEST FIXTURES for the scorer's logic. They are not
benchmark evidence and are never written into reports/.

Usage: python3 tools/benchmark/selftest.py
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
sys.path.insert(0, str(HERE))

from runner import Sanitizer, apply_lane, apply_mutation, load_local_template  # noqa: E402
from score import is_junk, score_snapshot, tier_for  # noqa: E402

FAKE_KEY = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
fails: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(f"  {'PASS' if cond else 'FAIL'}  {name}{(' — ' + detail) if detail and not cond else ''}")
    if not cond:
        fails.append(name)


def diff_paths(a, b, path="") -> list[str]:
    if type(a) is not type(b):
        return [path or "/"]
    if isinstance(a, dict):
        out = []
        for k in set(a) | set(b):
            if k not in a or k not in b:
                out.append(f"{path}/{k}")
            else:
                out += diff_paths(a[k], b[k], f"{path}/{k}")
        return out
    if isinstance(a, list):
        if len(a) != len(b):
            return [path or "/"]
        out = []
        for i, (x, y) in enumerate(zip(a, b)):
            out += diff_paths(x, y, f"{path}/{i}")
        return out
    return [] if a == b else [path or "/"]


print("1. contender registry + template loading")
registry = json.loads((HERE / "contenders.json").read_text())
for c in registry["contenders"]:
    if c["source"] != "local":
        continue
    p = REPO / c["path"]
    check(f"{c['id']}: template exists", p.exists(), str(p))
    if p.exists():
        cfg = load_local_template(c["path"])
        check(f"{c['id']}: config is a dict with keys", isinstance(cfg, dict) and len(cfg) > 3)
for c in registry["contenders"]:
    if c["role"] == "challenger" and c.get("subtype") == "community":
        check(f"{c['id']}: has citation", bool(c.get("citation")))
    if c["role"] == "variant":
        check(f"{c['id']}: declares variant_of + single_variable + one mutation",
              bool(c.get("variant_of")) and bool(c.get("single_variable")) and isinstance(c.get("mutation"), dict))

print("\n2. lane injection")
cfg = apply_lane(load_local_template("Templates/Torbox/Single/core-nexus-4k-apex-torbox.json"), "torbox", FAKE_KEY)
enabled = [s["id"] for s in cfg["services"] if s.get("enabled")]
check("only the benchmark lane is enabled", enabled == ["torbox"], str(enabled))
check("lane key injected", cfg["services"][[s["id"] for s in cfg["services"]].index("torbox")]["credentials"]["apiKey"] == FAKE_KEY)
check("other services carry no credentials",
      all(not s.get("credentials") for s in cfg["services"] if s["id"] != "torbox"))

print("\n3. variant mutations are single-variable")
for c in registry["contenders"]:
    if c["role"] != "variant":
        continue
    base = load_local_template(c["path"])
    mutated, note = apply_mutation(copy.deepcopy(base), c["mutation"])
    d = diff_paths(base, mutated)
    op = c["mutation"]["op"]
    if op in ("add_preset", "remove_preset"):
        ok = all(p.startswith("/presets") for p in d) and len(d) >= 1
    elif op == "demote_sort_key":
        ok = all(p.startswith("/sortCriteria/global") for p in d)
    else:
        ok = len(d) == 1
    check(f"{c['id']}: {note}", ok, f"changed paths: {d[:6]}")

print("\n4. sanitizer")
san = Sanitizer([FAKE_KEY, "hunter2hunter2"])
dirty = {
    "services": [{"id": "torbox", "credentials": {"apiKey": FAKE_KEY}}],
    "url": f"https://x.example/stremio/{FAKE_KEY}/enc/stream.mkv?token=hunter2hunter2",
    "note": f"key is {FAKE_KEY} and pw hunter2hunter2",
    "tmdbAccessToken": "eyJhbGciOiJSUzI1NiJ9.abcdefghijk.zzzzz",
}
clean = json.dumps(san.obj(dirty))
check("api key gone", FAKE_KEY not in clean, clean)
check("password gone", "hunter2hunter2" not in clean, clean)
check("jwt gone", "eyJhbGciOiJSUzI1NiJ9" not in clean, clean)

print("\n5. scorer logic on fixture rows")
fixture_movie = {"key": "t", "type": "movie", "expected_title": "Dune: Part Two", "expected_year": 2024, "language": "en"}
fixture_ep = {"key": "t", "type": "series", "season": 2, "episode": 1, "expected_title": "Severance", "expected_year": 2022, "language": "en"}


def row(**kw):
    base = {"rank": 1, "cached": True, "resolution": "2160p", "quality": "WEB-DL", "title": "Dune: Part Two",
            "filename": "Dune.Part.Two.2024.2160p.WEB-DL.mkv", "languages": ["English"], "is_error_row": False}
    base.update(kw)
    return base


check("clean row is not junk", not is_junk(row(), fixture_movie)[0])
check("cam is junk", is_junk(row(quality="CAM", filename="Dune.Part.Two.2024.HDCAM.mp4"), fixture_movie)[0])
check("mislabeled resolution is junk",
      is_junk(row(resolution="2160p", filename="Dune.Part.Two.2024.1080p.WEB-DL.mkv"), fixture_movie)[0])
check("wrong title is junk", is_junk(row(title="Dune", filename="Dune.2021.2160p.mkv"), fixture_movie)[0])
check("wrong language is junk", is_junk(row(languages=["Russian"]), fixture_movie)[0])
check("wrong episode is junk",
      is_junk({"rank": 1, "cached": True, "resolution": "1080p", "title": "Severance", "season": 2, "episode": 4,
               "filename": "Severance.S02E04.1080p.mkv", "languages": ["English"], "is_error_row": False}, fixture_ep)[0])
check("right episode is clean",
      not is_junk({"rank": 1, "cached": True, "resolution": "1080p", "title": "Severance", "season": 2, "episode": 1,
                   "filename": "Severance.S02E01.1080p.mkv", "languages": ["English"], "is_error_row": False}, fixture_ep)[0])

snap = {"status": "ok", "elapsed_ms_full_list": 4200, "results": [
    row(rank=1, infohash="h1"),
    row(rank=2, cached=True, resolution="1080p", infohash="h2", filename="Dune.Part.Two.2024.1080p.WEB-DL.mkv"),
    row(rank=3, cached=True, infohash="h1"),                      # duplicate infohash
    row(rank=4, cached=False, infohash="h3", filename="Dune.Part.Two.2024.2160p.BluRay.mkv"),
    row(rank=5, cached=True, infohash="h4", quality="CAM", filename="Dune.Part.Two.2024.HDCAM.mp4"),
]}
s = score_snapshot(snap, fixture_movie, tier_for("control-4k-apex-torbox"))
check("cached 4K detected", s["has_cached_4k"] is True)
check("cached 1080p detected", s["has_cached_1080p"] is True)
check("one duplicate counted", s["dup_count"] == 1, str(s["dup_count"]))
check("one junk counted", s["junk_count"] == 1, str(s["junk_count"]))
check("4K-first tier satisfied", s["rank_tier_ok"] is True)
check("cache-first ordering violated is detected",
      score_snapshot({"status": "ok", "elapsed_ms_full_list": 1, "results": [
          row(rank=1, cached=False, infohash="a"), row(rank=2, cached=True, infohash="b")]},
          fixture_movie, tier_for("control-4k-apex-torbox"))["rank_cache_ok"] is False)
check("failed snapshot is not scored as zero",
      score_snapshot({"status": "error", "error": "timeout"}, fixture_movie, None).get("result_count") is None)

print("\n6. corpus")
corpus = json.loads((HERE / "corpus" / "corpus-v1.json").read_text())
buckets = {t["bucket"] for t in corpus["titles"]}
check("corpus has 20-30 titles", 20 <= len(corpus["titles"]) <= 30, str(len(corpus["titles"])))
for need in ("recent-blockbuster", "catalog-older", "current-season", "completed-series", "anime", "non-english", "regional", "obscure"):
    check(f"bucket present: {need}", need in buckets)
check("every series entry pins an episode",
      all(t.get("season") and t.get("episode") for t in corpus["titles"] if t["type"] == "series"))
check("no duplicate keys", len({t["key"] for t in corpus["titles"]}) == len(corpus["titles"]))

print("\n7. template shapes and wizard directives")
from template_processor import (
    apply_template_conditionals, evaluate_template_condition, as_config_array,
    has_unresolved_directives, default_inputs,
)
from runner import _extract_config, resolve_template

# The four real-world wrapper shapes must all yield the same bare config.
bare = {"presets": [{"type": "comet", "enabled": True}]}
check("shape: {metadata,config}", _extract_config({"metadata": {}, "config": bare}) == bare)
check("shape: [ {metadata,config} ]", _extract_config([{"metadata": {}, "config": bare}]) == bare)
check("shape: {templates:[...]}", _extract_config({"templates": [{"config": bare}]}) == bare)
check("shape: bare config (no wrapper)", _extract_config(bare) == bare)

# as_config_array tolerates absent / directive-valued list fields.
check("as_config_array: missing key -> []", as_config_array(None) == [])
check("as_config_array: directive dict -> inner list",
      as_config_array({"__if": "inputs.x", "__value": [1, 2]}) == [1, 2])
check("as_config_array: plain list passthrough", as_config_array([1]) == [1])

# Condition semantics ported from conditionals.ts — including the quirks.
ev = evaluate_template_condition
check("cond: bare truthy", ev("inputs.a", {"a": True}, []) is True)
check("cond: 0 is TRUTHY (upstream quirk)", ev("inputs.a", {"a": 0}, []) is True)
check("cond: empty list is falsy", ev("inputs.a", {"a": []}, []) is False)
check("cond: negation", ev("!inputs.a", {"a": False}, []) is True)
check("cond: equality", ev("inputs.a == big", {"a": "big"}, []) is True)
check("cond: numeric >=", ev("inputs.n >= 10", {"n": 10}, []) is True)
check("cond: includes", ev("inputs.l includes en", {"l": ["en", "fr"]}, []) is True)
check("cond: services.<id>", ev("services.torbox", {}, ["torbox"]) is True)
check("cond: and/or precedence",
      ev("inputs.a and inputs.b or inputs.c", {"a": False, "b": False, "c": True}, []) is True)
check("cond: nested subsection ref", ev("inputs.p.url", {"p": {"url": "x"}}, []) is True)

# Directive resolution.
check("__switch picks case",
      apply_template_conditionals(
          {"__switch": "inputs.mode", "cases": {"hi": 1}, "default": 0}, {"mode": "hi"}, []) == 1)
check("__switch falls back to default",
      apply_template_conditionals(
          {"__switch": "inputs.mode", "cases": {"hi": 1}, "default": 0}, {"mode": "zz"}, []) == 0)
check("__if false drops array item",
      apply_template_conditionals([{"__if": "inputs.a", "type": "x"}], {"a": False}, []) == [])
check("__if true keeps array item",
      apply_template_conditionals([{"__if": "inputs.a", "type": "x"}], {"a": True}, []) == [{"type": "x"}])
check("__value spreads an array",
      apply_template_conditionals([{"__value": [1, 2]}], {}, []) == [1, 2])
check("__if+__value drops the whole key when false",
      apply_template_conditionals({"k": {"__if": "inputs.a", "__value": 5}}, {"a": False}, []) == {})
check("__remove drops the key",
      apply_template_conditionals({"k": {"__remove": True}}, {}, []) == {})
check("single-token placeholder preserves type",
      apply_template_conditionals("{{inputs.n}}", {"n": 5000}, []) == 5000)
check("multi-token placeholder stringifies",
      apply_template_conditionals("a-{{inputs.n}}", {"n": 5}, []) == "a-5")
check("credential ref is preserved verbatim",
      apply_template_conditionals("{{services.torbox.apiKey}}", {}, ["torbox"]) == "{{services.torbox.apiKey}}")

# The guardrail: a config with leftover directives must be refused, never posted.
check("unresolved directives are detected",
      len(has_unresolved_directives({"a": "{{inputs.x}}"})) == 1)
check("resolved config reports clean", has_unresolved_directives({"a": "plain"}) == [])
# NOTE: an UNDECLARED input resolves to "" (upstream substitutes unconditionally),
# so it is not "unresolved". A foreign namespace is never substituted, and that is
# exactly the case the guardrail exists to stop from reaching POST /api/v1/user.
check("undeclared input resolves to empty string, not a leftover",
      apply_template_conditionals("{{inputs.nope}}", {}, []) == "")
_bad = {"metadata": {}, "config": {"timeout": "{{unknown.ns}}"}}
try:
    resolve_template(_bad, None, ["torbox"])
    _refused = False
except RuntimeError:
    _refused = True
check("resolve_template REFUSES a still-unresolved config", _refused)

print("\n8. review hardening (PR #735)")
from runner import Sanitizer, _resolve_pointer, apply_mutation

# --- #1 sanitizer credential gaps ---
sh = Sanitizer(["abc"])            # below the 6-char floor: previously DROPPED
check("short secret is redacted, not emitted",
      "abc" not in sh.text("key=abc end"))
check("short secret does not corrupt ordinary words",
      sh.text("abcdef fabric") == "abcdef fabric")
s2 = Sanitizer([])
check("credential in URL PATH segment is redacted",
      "0123456789abcdef0123456789abcdef" not in
      s2.text("https://cdn.example.com/dl/0123456789abcdef0123456789abcdef/f.mkv"))
check("long hex path token is redacted",
      "<REDACTED-PATH-TOKEN>" in s2.text("https://h.tld/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/x"))
check("instancePassword key is redacted",
      s2.obj({"instancePassword": "hunter2"})["instancePassword"] == "<REDACTED>")
check("debrid service key name is redacted",
      s2.obj({"torboxApiKey": "zzz"})["torboxApiKey"] == "<REDACTED>")
check("credential held in a LIST is redacted",
      s2.obj({"credentials": ["secret-value"]})["credentials"] == "<REDACTED-LIST>")
check("non-secret keys still pass through", s2.obj({"resolution": "2160p"})["resolution"] == "2160p")
check("query-string passkey is redacted", "p4ss" not in s2.text("http://x/y?passkey=p4ss"))

# --- #2 urllib.parse available at module scope (no monkey-patch) ---
import runner as _r
check("runner.urllib.parse imported at module scope", hasattr(_r.urllib, "parse"))
check("stream_url works without main() having run",
      _r.stream_url("https://i.tld", "u", "e", {"type": "movie", "imdb": "tt1"}).endswith(".json"))

# --- #3 pointer typos must not grow a subtree ---
_cfg = {"bitrate": {"global": {"movies": [0, 1]}}}
try:
    _resolve_pointer(_cfg, "/bitrat/global/movies"); _raised = False
except ValueError:
    _raised = True
check("typo'd pointer raises instead of creating a subtree", _raised)
check("typo did not mutate the config", _cfg == {"bitrate": {"global": {"movies": [0, 1]}}})
check("valid pointer still resolves",
      _resolve_pointer(_cfg, "/bitrate/global/movies")[1] == "movies")
try:
    apply_mutation({"a": 1}, {"op": "set", "pointer": "/nope", "value": 2}); _raised = False
except ValueError:
    _raised = True
check("set on a missing key raises without create:true", _raised)
check("set with create:true is allowed (variants that add a field)",
      apply_mutation({"a": 1}, {"op": "set", "pointer": "/failover", "value": {"enabled": True},
                                "create": True})[0]["failover"] == {"enabled": True})
try:
    apply_mutation({"a": 1}, {"op": "set", "pointer": "/a", "value": 1}); _raised = False
except ValueError:
    _raised = True
check("set to the identical value is rejected as a NO-OP", _raised)

# --- #4 demote_sort_key must raise, not silently no-op ---
def _sc(keys):
    return {"sortCriteria": {"global": [{"key": k} for k in keys]}}
try:
    apply_mutation(_sc(["resolution"]), {"op": "demote_sort_key", "key": "cached",
                                         "below": "resolution"}); _raised = False
except ValueError:
    _raised = True
check("demote_sort_key raises when the key is absent", _raised)
try:
    apply_mutation(_sc(["cached"]), {"op": "demote_sort_key", "key": "cached",
                                     "below": "resolution"}); _raised = False
except ValueError:
    _raised = True
check("demote_sort_key raises when the anchor is absent", _raised)
try:
    apply_mutation(_sc(["resolution", "cached"]), {"op": "demote_sort_key", "key": "cached",
                                                   "below": "resolution"}); _raised = False
except ValueError:
    _raised = True
check("demote_sort_key raises when already directly below anchor", _raised)
_ok, _note = apply_mutation(_sc(["cached", "seadex", "resolution"]),
                            {"op": "demote_sort_key", "key": "cached", "below": "resolution"})
check("demote_sort_key still performs a real demotion",
      [c["key"] for c in _ok["sortCriteria"]["global"]] == ["seadex", "resolution", "cached"])

# --- registry integrity: every declared mutation must apply cleanly ---
_reg = json.loads((HERE / "contenders.json").read_text())
_reg = _reg["contenders"] if isinstance(_reg, dict) else _reg
for _c in _reg:
    if _c.get("source") == "local" and _c.get("mutation"):
        _base = json.loads((HERE.parents[1] / _c["path"]).read_text())["config"]
        try:
            apply_mutation(copy.deepcopy(_base), _c["mutation"])
            _applied = True
        except Exception as _e:  # noqa: BLE001
            _applied = False
        check(f"mutation applies: {_c['id']}", _applied)

print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILURES: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
