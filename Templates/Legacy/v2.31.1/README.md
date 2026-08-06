# Core Builds — v2.31.1 Legacy Lane

These templates are **v2.31.1 compatibility artifacts** for AIOStreams hosts
still running 2.31.1 or older. They retain the legacy built-in `torbox-search`
preset, which was **removed in AIOStreams v2.32.0** (the TorBox Search API was
shut down).

- Import these **only** on AIOStreams hosts running **2.31.1 or older**.
- On v2.32+ hosts, saving a config that includes `torbox-search` **fails** — use
  the v2.32-clean templates in the main `Templates/` tree instead.
- These files are excluded from the CI torbox-search gate (this directory is the
  explicit allowlist).
- No automatic migration to the generic Newznab "TorBox Search" option is
  performed — that endpoint is separate and unverified.
