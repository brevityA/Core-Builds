"""
Unit tests for scripts/status_check.py (archived probe logic, kept for the fleet watcher.
The 6-hour cron that consumed it was retired 2026-08-13; docs/instance-status.mdx is tombstoned).
All network calls are mocked so tests run fully offline.
"""
import sys
import urllib.error
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# Make the script importable without executing its __main__ block
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
import status_check


# ── check() ──────────────────────────────────────────────────

class TestCheck:
    def _mock_response(self, status_code):
        resp = MagicMock()
        resp.getcode.return_value = status_code
        return resp

    def test_http_200_returns_online(self):
        with patch("status_check.urllib.request.urlopen", return_value=self._mock_response(200)):
            assert status_check.check("https://example.com") == "🟢 Online"

    def test_http_non_200_2xx_returns_degraded(self):
        # check() only considers HTTP 200 as fully online; any other code → degraded
        with patch("status_check.urllib.request.urlopen", return_value=self._mock_response(201)):
            assert status_check.check("https://example.com") == "🟡 Degraded"

    def test_http_403_returns_degraded(self):
        with patch("status_check.urllib.request.urlopen") as mock:
            mock.side_effect = urllib.error.HTTPError(
                url="", code=403, msg="Forbidden", hdrs=None, fp=None
            )
            assert status_check.check("https://example.com") == "🟡 Degraded"

    def test_http_404_returns_degraded(self):
        with patch("status_check.urllib.request.urlopen") as mock:
            mock.side_effect = urllib.error.HTTPError(
                url="", code=404, msg="Not Found", hdrs=None, fp=None
            )
            assert status_check.check("https://example.com") == "🟡 Degraded"

    def test_http_500_returns_offline(self):
        with patch("status_check.urllib.request.urlopen") as mock:
            mock.side_effect = urllib.error.HTTPError(
                url="", code=500, msg="Internal Server Error", hdrs=None, fp=None
            )
            assert status_check.check("https://example.com") == "🔴 Offline"

    def test_http_503_returns_offline(self):
        with patch("status_check.urllib.request.urlopen") as mock:
            mock.side_effect = urllib.error.HTTPError(
                url="", code=503, msg="Service Unavailable", hdrs=None, fp=None
            )
            assert status_check.check("https://example.com") == "🔴 Offline"

    def test_url_error_returns_offline(self):
        with patch("status_check.urllib.request.urlopen") as mock:
            mock.side_effect = urllib.error.URLError("timed out")
            assert status_check.check("https://example.com") == "🔴 Offline"

    def test_generic_exception_returns_offline(self):
        with patch("status_check.urllib.request.urlopen") as mock:
            mock.side_effect = Exception("unexpected failure")
            assert status_check.check("https://example.com") == "🔴 Offline"

    def test_boundary_5xx_starts_at_500(self):
        # code 499 is still 4xx → degraded
        with patch("status_check.urllib.request.urlopen") as mock:
            mock.side_effect = urllib.error.HTTPError(
                url="", code=499, msg="", hdrs=None, fp=None
            )
            assert status_check.check("https://example.com") == "🟡 Degraded"


# ── build_table() ─────────────────────────────────────────────

class TestBuildTable:
    URL = "https://example.com/stremio/configure"
    INSTANCES = {"MyInstance": URL}

    def test_table_contains_header_row(self):
        with patch("status_check.check", return_value="🟢 Online"):
            table = status_check.build_table(self.INSTANCES)
        assert "| Instance | Status | URL |" in table

    def test_table_contains_separator_row(self):
        with patch("status_check.check", return_value="🟢 Online"):
            table = status_check.build_table(self.INSTANCES)
        assert "|---|---|---|" in table

    def test_table_contains_instance_name(self):
        with patch("status_check.check", return_value="🟢 Online"):
            table = status_check.build_table(self.INSTANCES)
        assert "MyInstance" in table

    def test_table_strips_https_prefix_for_display(self):
        with patch("status_check.check", return_value="🟢 Online"):
            table = status_check.build_table(self.INSTANCES)
        # The display URL omits "https://" while preserving full URL as href
        assert "[example.com](https://example.com/stremio/configure)" in table

    def test_table_strips_stremio_configure_suffix(self):
        with patch("status_check.check", return_value="🟢 Online"):
            table = status_check.build_table(self.INSTANCES)
        # The display text should not show the path
        assert "example.com/stremio/configure" not in table.replace(self.URL, "")

    def test_table_preserves_full_url_as_href(self):
        with patch("status_check.check", return_value="🟢 Online"):
            table = status_check.build_table(self.INSTANCES)
        assert self.URL in table

    def test_each_instance_gets_one_data_row(self):
        instances = {
            "A": "https://a.example.com/stremio/configure",
            "B": "https://b.example.com/stremio/configure",
        }
        with patch("status_check.check", return_value="🟢 Online"):
            table = status_check.build_table(instances)
        lines = [l for l in table.strip().split("\n") if l.strip()]
        # 2 header rows + 2 data rows = 4 non-empty lines
        assert len(lines) == 4

    def test_status_emoji_appears_in_row(self):
        with patch("status_check.check", return_value="🔴 Offline"):
            table = status_check.build_table(self.INSTANCES)
        assert "🔴 Offline" in table


# ── update_status_md() ────────────────────────────────────────

STATUS_TEMPLATE = """\
# Status

<!-- STATUS_STABLE_START -->
old stable content here
<!-- STATUS_STABLE_END -->

Some text in between.

<!-- STATUS_NIGHTLY_START -->
old nightly content here
<!-- STATUS_NIGHTLY_END -->
"""


class TestUpdateStatusMd:
    def test_replaces_stable_block_content(self, tmp_path):
        f = tmp_path / "STATUS.md"
        f.write_text(STATUS_TEMPLATE)
        with patch("status_check.check", return_value="🟢 Online"):
            status_check.update_status_md(str(f))
        assert "old stable content here" not in f.read_text()

    def test_replaces_nightly_block_content(self, tmp_path):
        f = tmp_path / "STATUS.md"
        f.write_text(STATUS_TEMPLATE)
        with patch("status_check.check", return_value="🟢 Online"):
            status_check.update_status_md(str(f))
        assert "old nightly content here" not in f.read_text()

    def test_stable_markers_preserved(self, tmp_path):
        f = tmp_path / "STATUS.md"
        f.write_text(STATUS_TEMPLATE)
        with patch("status_check.check", return_value="🟢 Online"):
            status_check.update_status_md(str(f))
        content = f.read_text()
        assert "<!-- STATUS_STABLE_START -->" in content
        assert "<!-- STATUS_STABLE_END -->" in content

    def test_nightly_markers_preserved(self, tmp_path):
        f = tmp_path / "STATUS.md"
        f.write_text(STATUS_TEMPLATE)
        with patch("status_check.check", return_value="🟢 Online"):
            status_check.update_status_md(str(f))
        content = f.read_text()
        assert "<!-- STATUS_NIGHTLY_START -->" in content
        assert "<!-- STATUS_NIGHTLY_END -->" in content

    def test_content_outside_blocks_preserved(self, tmp_path):
        f = tmp_path / "STATUS.md"
        f.write_text(STATUS_TEMPLATE)
        with patch("status_check.check", return_value="🟢 Online"):
            status_check.update_status_md(str(f))
        content = f.read_text()
        assert "# Status" in content
        assert "Some text in between." in content

    def test_timestamp_written_to_file(self, tmp_path):
        f = tmp_path / "STATUS.md"
        f.write_text(STATUS_TEMPLATE)
        with patch("status_check.check", return_value="🟢 Online"):
            status_check.update_status_md(str(f))
        assert "Last checked:" in f.read_text()

    def test_all_stable_instances_appear_in_file(self, tmp_path):
        f = tmp_path / "STATUS.md"
        f.write_text(STATUS_TEMPLATE)
        with patch("status_check.check", return_value="🟢 Online"):
            status_check.update_status_md(str(f))
        content = f.read_text()
        for name in status_check.STABLE:
            assert name in content

    def test_all_nightly_instances_appear_in_file(self, tmp_path):
        f = tmp_path / "STATUS.md"
        f.write_text(STATUS_TEMPLATE)
        with patch("status_check.check", return_value="🟢 Online"):
            status_check.update_status_md(str(f))
        content = f.read_text()
        for name in status_check.NIGHTLY:
            assert name in content

    def test_docs_mirror_is_updated_only_when_explicitly_requested(self, tmp_path):
        status = tmp_path / "STATUS.md"
        status.write_text(STATUS_TEMPLATE)
        docs = tmp_path / "instance-status.mdx"
        docs.write_text("""\
{/* STATUS_STABLE_START */}
old stable
{/* STATUS_STABLE_END */}
{/* STATUS_NIGHTLY_START */}
old nightly
{/* STATUS_NIGHTLY_END */}
""")
        with patch("status_check.check", return_value="🟢 Online"):
            status_check.update_status_md(str(status), docs_path=str(docs))
        content = docs.read_text()
        assert "old stable" not in content
        assert "old nightly" not in content
        assert "Last checked:" in content
