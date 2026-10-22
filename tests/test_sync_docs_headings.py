"""Every versioned heading on docs/template-directory.mdx maps to a real template.

scripts/sync-docs.py rewrites "### Name — vX.Y.Z" from TEMPLATE_DIRECTORY_HEADINGS and
leaves an unmapped heading alone, so a heading missing from the map stops updating
without a sound. Until v3.18 half the page had drifted that way.
"""
import importlib.util
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sync_docs', ROOT / 'scripts' / 'sync-docs.py')
sync_docs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync_docs)


def test_every_directory_heading_is_mapped_to_an_existing_template():
    page = (ROOT / 'docs' / 'template-directory.mdx').read_text(encoding='utf-8')
    names = [m.group(1).strip() for m in re.finditer(r'### (.+?)— v[\d.]+', page)]
    assert len(names) > 30, 'heading extraction returned suspiciously few matches'
    unmapped = [n for n in names if n not in sync_docs.TEMPLATE_DIRECTORY_HEADINGS]
    assert unmapped == [], f'add these headings to TEMPLATE_DIRECTORY_HEADINGS: {unmapped}'
    stems = {p.stem for p in (ROOT / 'Templates').rglob('*.json')}
    missing = sorted({sync_docs.TEMPLATE_DIRECTORY_HEADINGS[n] for n in names} - stems)
    assert missing == [], f'mapped to templates that do not exist: {missing}'
