"""CI coverage for the benchmark harness in `tools/benchmark/`.

The harness ships its own dependency-free runner, `tools/benchmark/selftest.py`,
which asserts template-shape handling, wizard-directive resolution, credential
sanitisation, single-variable mutation proofs and scorer logic.

Nothing in CI executed it: `.github/workflows/tests.yml` runs `pytest tests/`,
and no test imported the harness. A green "Run pytest suite" on a
benchmark-only PR therefore said nothing about the benchmark code — the job only
triggered because a `**/*.md` path matched. This module closes that gap so a
regression in the harness fails the PR instead of passing silently.

The self-test is stdlib-only and makes no network calls (the runner's live paths
are never entered), so it is safe to run in CI.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
BENCH = REPO / "tools" / "benchmark"


@pytest.mark.skipif(not BENCH.exists(), reason="benchmark harness not present")
def test_harness_selftest_passes() -> None:
    """`selftest.py` must exit 0 and report ALL PASS."""
    proc = subprocess.run(
        [sys.executable, "selftest.py"],
        cwd=BENCH,
        capture_output=True,
        text=True,
        timeout=300,
    )
    output = proc.stdout + proc.stderr
    assert proc.returncode == 0, f"selftest.py failed:\n{output}"
    assert "ALL PASS" in output, f"selftest.py did not report ALL PASS:\n{output[-3000:]}"


@pytest.mark.skipif(not BENCH.exists(), reason="benchmark harness not present")
def test_dry_run_plans_without_network() -> None:
    """`--dry-run` must build every contender config and stop before any request.

    This exercises template loading, wizard-directive resolution and all mutation
    ops against the real registry, so a bad JSON pointer or an unresolvable
    template fails here rather than mid-run against live credentials.
    """
    proc = subprocess.run(
        [sys.executable, "runner.py", "--dry-run"],
        cwd=BENCH,
        capture_output=True,
        text=True,
        timeout=300,
    )
    output = proc.stdout + proc.stderr
    assert proc.returncode == 0, f"dry-run failed:\n{output}"
    assert "stopping before any network call" in output, output[-2000:]


@pytest.mark.skipif(not BENCH.exists(), reason="benchmark harness not present")
def test_contender_registry_is_wellformed() -> None:
    """Every contender needs a unique id, a known source, and a resolvable path."""
    raw = json.loads((BENCH / "contenders.json").read_text())
    contenders = raw["contenders"] if isinstance(raw, dict) else raw
    assert contenders, "registry is empty"

    ids = [c["id"] for c in contenders]
    assert len(ids) == len(set(ids)), "duplicate contender ids"

    for c in contenders:
        assert c.get("role") in {"control", "challenger", "variant"}, c["id"]
        src = c.get("source")
        assert src in {"local", "url", "default"}, f"{c['id']}: bad source {src!r}"
        if src == "local":
            assert (REPO / c["path"]).is_file(), f"{c['id']}: missing {c['path']}"
        if src == "url":
            assert c["url"].startswith("https://"), f"{c['id']}: non-https url"


@pytest.mark.skipif(not BENCH.exists(), reason="benchmark harness not present")
def test_committed_snapshots_carry_no_credentials() -> None:
    """Committed benchmark artifacts must never contain a real secret value."""
    import re

    pattern = re.compile(
        r"(?i)(apikey|api_key|token|password|passkey)\"?\s*[:=]\s*\"[A-Za-z0-9_\-]{12,}\""
    )
    snapshots = REPO / "reports" / "benchmark-snapshots"
    if not snapshots.exists():
        pytest.skip("no snapshots committed")
    offenders = [
        str(p.relative_to(REPO))
        for p in snapshots.rglob("*")
        if p.is_file() and pattern.search(p.read_text(errors="ignore"))
    ]
    assert not offenders, f"possible credential in committed artifacts: {offenders}"
