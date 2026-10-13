"""The host-preload template collection must stay in sync with the template
suite, or hosts serve stale versions. Run the sync script in --check mode."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_collection_in_sync():
    res = subprocess.run(
        [sys.executable, str(ROOT / 'scripts' / 'sync_template_collection.py'), '--check'],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert res.returncode == 0, f"collection is stale:\n{res.stdout}\n{res.stderr}"


def test_regex_allowlist_in_sync():
    """configurator/src/data/regex-allowlist.js must match the pinned upstream snapshot."""
    res = subprocess.run(
        [sys.executable, str(ROOT / 'scripts' / 'sync_template_collection.py'), '--regex-allowlist', '--check'],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert res.returncode == 0, f"regex allowlist is stale:\n{res.stdout}\n{res.stderr}"


def test_inline_regex_copies_synced():
    """Every inline pattern in active lanes must equal a pinned-snapshot entry
    (guards the ElfHosted 'regexes are not allowed' rejection class)."""
    res = subprocess.run(
        [sys.executable, str(ROOT / 'scripts' / 'sync_ranked_regex.py'), '--check'],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert res.returncode == 0, f"inline regex copies drifted:\n{res.stdout}\n{res.stderr}"


def test_collection_has_no_base_or_legacy_entries():
    import json
    coll = json.loads((ROOT / 'core-builds-template-collection.json').read_text())
    assert isinstance(coll, list) and coll
    for e in coll:
        mid = str(e.get('metadata', {}).get('id', ''))
        assert 'base' not in mid.lower(), f"collection must not include base config: {mid}"
        assert 'legacy' not in mid.lower(), f"collection must not include legacy: {mid}"
        assert e.get('config'), f"entry {mid} missing config"


def test_collection_excludes_nested_deprecated_lanes():
    """Regression (audit 2026-09-29, finding 1.2-g): excluded lanes can nest
    below a service dir (Templates/Torbox/Deprecated/...), and a top-level-only
    path check shipped 15 deprecated templates to hosts. Every template under
    any Legacy/Deprecated path part must be absent from the collection, and ids
    must be unique."""
    import json
    coll = json.loads((ROOT / 'core-builds-template-collection.json').read_text())
    coll_ids = [str(e.get('metadata', {}).get('id', '')) for e in coll]

    # No duplicate ids — the collection carried a duplicated
    # core-nexus-4k-dual-core id while the lane bug was live.
    dupes = {mid for mid in coll_ids if coll_ids.count(mid) > 1}
    assert not dupes, f"duplicate template ids in collection: {sorted(dupes)}"

    # Every template under any Legacy/Deprecated path part is excluded —
    # unless an active-lane template shares its id, in which case the
    # collection must hold exactly the active copy (the id appears once).
    templates = ROOT / 'Templates'
    active_ids, excluded_ids = set(), set()
    for f in templates.rglob('*.json'):
        rel = f.relative_to(templates)
        try:
            tid = json.loads(f.read_text()).get('metadata', {}).get('id')
        except Exception:
            continue
        if not tid:
            continue
        (excluded_ids if ('Legacy' in rel.parts or 'Deprecated' in rel.parts)
         else active_ids).add(str(tid))
    leaked = (excluded_ids - active_ids) & set(coll_ids)
    assert not leaked, f"excluded-lane templates in collection: {sorted(leaked)}"
