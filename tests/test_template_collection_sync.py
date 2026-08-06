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


def test_collection_has_no_base_or_legacy_entries():
    import json
    coll = json.loads((ROOT / 'core-builds-template-collection.json').read_text())
    assert isinstance(coll, list) and coll
    for e in coll:
        mid = str(e.get('metadata', {}).get('id', ''))
        assert 'base' not in mid.lower(), f"collection must not include base config: {mid}"
        assert 'legacy' not in mid.lower(), f"collection must not include legacy: {mid}"
        assert e.get('config'), f"entry {mid} missing config"
