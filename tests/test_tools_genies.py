"""Genie companion pages are wired into tools/index.html and exist on disk."""
from pathlib import Path

TOOLS = Path('tools/index.html').read_text()
GENIES = Path('tools/genies')

class TestToolsGenies:
    def test_genies_section_present(self):
        assert 'Genies — guided setup companions' in TOOLS

    def test_three_genie_links(self):
        for href in ['./genies/', './genies/wuplay-catalogs.html', './genies/nuvio-stacks.html']:
            assert f'href="{href}"' in TOOLS, f'missing tools link: {href}'

    def test_genie_files_exist_and_are_selfcontained(self):
        for name in ['index.html', 'wuplay-catalogs.html', 'nuvio-stacks.html']:
            p = GENIES / name
            assert p.exists(), f'missing {p}'
            html = p.read_text()
            assert 'http://' not in html.replace('https://', ''), 'genie pages must not depend on http assets'
            assert 'doorGenie' in html, f'{name} missing genie entrypoint'

    def test_preview_badges_pending_qa_for_newer_genies(self):
        assert TOOLS.count('PREVIEW — pending full QA') == 2
        assert 'GUIDED' not in TOOLS.upper() or 'BETA' in TOOLS  # CB genie carries the beta badge
