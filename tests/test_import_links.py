"""The docs' "Import on <host>" links are generated from configurator/src/data/hosts.js.

scripts/sync_import_links.mjs writes them; these tests keep the pages in step with
the host registry and make sure every link opens a template that exists.
"""
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["docs/template-directory.mdx", "docs/nightly-and-labs.mdx"]
RAW_PREFIX = "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/"


def _hosts():
    out = subprocess.run(
        ["node", "--input-type=module", "-e",
         "const h=await import('./configurator/src/data/hosts.js');"
         "console.log(JSON.stringify({b:h.HOST_BASE_URLS,m:h.HOST_META}))"],
        cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def _links(page):
    text = (ROOT / page).read_text(encoding="utf8")
    return re.findall(r'https://[^\s"()]+/stremio/configure\?[^\s"()]+', text)


def test_pages_match_the_host_registry():
    result = subprocess.run(["node", "scripts/sync_import_links.mjs", "--check"],
                            cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr


def test_every_link_opens_an_existing_template_on_a_listed_host():
    hosts = _hosts()
    bases = set(hosts["b"].values())
    pin = json.loads((ROOT / "configurator/UPSTREAM.pin").read_text())["version"]
    for page in PAGES:
        links = _links(page)
        assert links, f"{page} has no import links"
        for link in links:
            base = link.split("/stremio/configure", 1)[0]
            assert base in bases, f"{page}: {base} is not in hosts.js"
            query = urlsplit(link).query
            assert query.startswith("menu=about&template="), link
            template = query.split("template=", 1)[1]
            assert template.startswith(RAW_PREFIX), link
            assert (ROOT / template[len(RAW_PREFIX):]).is_file(), f"{page}: {template} does not exist"
        listed = {link.split("/stremio/configure", 1)[0] for link in links}
        for host_id, base in hosts["b"].items():
            version = hosts["m"].get(host_id, {}).get("aiostreamsVersion", "0")
            current = tuple(int(x) for x in version.split(".")) >= tuple(int(x) for x in pin.split("."))
            assert (base in listed) == current, f"{page}: {host_id} ({version}) listing must follow the {pin} floor"


def test_each_import_block_links_every_listed_host_once():
    hosts = _hosts()
    for page in PAGES:
        text = (ROOT / page).read_text(encoding="utf8")
        blocks = re.findall(r"<CardGroup cols=\{2\}>\n(?:.*\n)*?\s*</CardGroup>(?:\n[ \t]*Also on: [^\n]*)?", text)
        import_blocks = [b for b in blocks if "Import on" in b]
        assert import_blocks
        for block in import_blocks:
            templates = set(re.findall(r"template=([^\s\")]+)", block))
            assert len(templates) == 1, f"{page}: an import block mixes templates: {templates}"
            bases = [link.split("/stremio/configure", 1)[0] for link in re.findall(r'https://[^\s"()]+/stremio/configure', block)]
            assert len(bases) == len(set(bases)), f"{page}: a host is linked twice in one block"
