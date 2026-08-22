"""Structural release gates for the standalone Core Badge Builder."""
from pathlib import Path

ROOT = Path('tools/badges')
HTML = (ROOT / 'index.html').read_text()
APP = (ROOT / 'app.mjs').read_text()
CATALOG = (ROOT / 'catalog.mjs').read_text()
CORE = (ROOT / 'core.mjs').read_text()
TOOLS = Path('tools/index.html').read_text()
CONFIGURATOR = Path('configurator/src/js/app.js').read_text()


def test_badge_builder_entrypoints_and_tool_links_exist():
    for name in ['index.html', 'styles.css', 'app.mjs', 'catalog.mjs', 'core.mjs', 'README.md']:
        assert (ROOT / name).exists(), f'missing Badge Builder file: {name}'
    assert 'href="./badges/"' in TOOLS
    assert 'href="../tools/badges/"' in CONFIGURATOR


def test_badge_builder_is_no_code_in_the_user_interface():
    assert 'Match Pattern' not in HTML
    assert 'Regex Pattern' not in HTML
    assert 'data-mode="enhanced"' in HTML
    assert 'data-mode="universal"' in HTML
    assert 'data-theme-choice="neon"' in HTML
    assert 'data-theme-choice="mono"' in HTML
    assert 'data-theme-choice="contrast"' in HTML


def test_badge_builder_has_first_party_assets_and_no_third_party_catalog_urls():
    svg_assets = list((ROOT / 'assets').glob('*.svg'))
    png_assets = list((ROOT / 'assets').glob('*.png'))
    assert len(svg_assets) >= 100
    assert len(png_assets) >= 100
    assert 'raw.githubusercontent.com/brevityA/Core-Builds' in CATALOG
    assert 'asset: `${id}.png`' in CATALOG
    for third_party in ['kingsizew', 'Nintle', '9mousaa', 'NardBadges', 'Elite-Badges']:
        assert third_party not in CATALOG


def test_badge_builder_network_is_explicit_and_fallback_is_bounded():
    assert 'createImportUrl' in APP
    assert 'downloadText(serialiseJson(outputs.pack)' in APP
    assert 'core-builds-cors-proxy.tlorenzato26.workers.dev' in APP
    assert 'https://paste.rs/' in APP
    assert 'https://dpaste.com/api/v2/' in APP
    assert 'expiry_days:\'365\'' in APP
    assert 'connect-src' in HTML


def test_badge_builder_handoff_contract_matches_configurator():
    key = 'cb-badge-builder-handoff-v1'
    assert key in CORE
    assert key in CONFIGURATOR
    assert "sessionStorage.removeItem('cb-badge-builder-handoff-v1')" in CONFIGURATOR
    assert "handoff?.source === 'core-badge-builder'" in CONFIGURATOR
    assert "showToast('Core Badge Companion applied" in CONFIGURATOR


def test_docs_publish_badge_builder():
    nav = Path('docs/docs.json').read_text()
    guide = Path('docs/nuvio-badges.mdx').read_text()
    assert '"nuvio-badges"' in nav
    assert 'Core Badge Builder' in guide
    assert 'AIO Enhanced' in guide and 'Universal' in guide
