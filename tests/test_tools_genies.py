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
        # WuPlay genie stays early-access (pending dev route sign-off); Nuvio + CB graduated
        # to BETA with main-page wiring (patch 12). All three must still carry a maturity badge.
        assert 'BETA — early access · pending dev sign-off' in TOOLS, 'WuPlay genie must stay beta-gated until the dev conversation resolves the write route'
        assert TOOLS.count('BETA — works today') == 2, 'CB + Nuvio genies carry the works-today beta badge'
        assert 'GUIDED' not in TOOLS.upper() or 'BETA' in TOOLS  # CB genie carries the beta badge
