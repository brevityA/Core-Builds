# stremio-addons.net — research and fit for Core Builds

Date: 2026-10-26. Status: **Option A and B shipped in v3.24** — the Tools-hub
directory card (`tools/index.html`), citations in `docs/best-addons.md`, and
the advisory drift watcher
(`scripts/check-addon-directory-drift.mjs` +
`.github/workflows/addon-directory-drift.yml`, weekly issue on drift, soft pass
on outage). Option C (live in-app API data) remains intentionally not built.

## 1. What it is

**stremio-addons.net** is the de facto community directory for Stremio addons (the
successor to the old `Stremio-Community/stremio-addons-list` GitHub repo, which is no
longer maintained). Run by sleeyax; not affiliated with Stremio. It provides:

- Addon listings with categories and, where populated, community star counts,
  versions and last-updated dates (any of these can be blank), a **Manifest Status**
  probe (Reachable / Checking), and per-addon problem/uptime reports.
- Addon detail pages with Install deep links and, for multi-host addons like
  AIOStreams, an **instance selector**.
- Its own catalog addon (`/addons/stremio-addons.net`, v1.0.1) so the directory can be
  browsed inside Stremio.
- Sponsored slots (Torrin, NodStack managed AIOStreams hosting, PureVPN) — commercial
  affiliations to be aware of before linking.
- Submission is moderated via web form (Stremio-account login required).

The directory covers the **Stremio protocol only**. It is unrelated to Chillio/ChillLink
(no ChillLink install option), so it does not extend the ChillLink work — it is a
separate, discovery-layer resource.

## 2. Public API (experimental)

Documented at <https://docs.stremio-addons.net/developers/api>:

- `GET https://stremio-addons.net/api/v0/addons` — paginated addon list
- `GET https://stremio-addons.net/api/v0/addons/{uuidOrSlug}` — one approved addon,
  **including approved instances** (verified live: `/api/v0/addons/aiostreams` returns
  the full record with an `instances` array)
- `GET https://stremio-addons.net/api/v0/rising?limit=5`
- Read-only, no auth, **CORS open to all origins**, responses cached up to 24 h.
- Explicitly **experimental, no stability guarantees — endpoints may change without
  notice**. No v1 exists yet.

Consequence: usable for advisory tooling and periodic checks, unsafe as a hard runtime
dependency of the install flow.

## 3. Concrete finding: host-registry cross-check

The AIOStreams record (slug `aiostreams`, 702 stars, parent manifest v2.37.0 as of
2026-10-25) lists seven approved instances. Mapped against
`configurator/src/data/hosts.js` (eight hosts, re-audited 2026-10-22):

| Directory instance | Version shown | In hosts.js? |
| --- | --- | --- |
| aiostreams.elfhosted.com | 2.37.0 | yes (`elfhosted`) |
| aiostreams.fortheweak.cloud | 2.37.0 | yes (`fortheweak`) |
| aiostreamsfortheweebsstable.midnightignite.me | — | yes (`midnight`) |
| aiostreamsfortheweebs.midnightignite.me (Nightly) | 2.36.0 | no (nightly sibling) |
| aiostreams-stable.forthewizards.uk | 2.37.0 | yes (`wizaardd`) |
| aiostreams.forthewizards.uk (Nightly) | 2.36.0 | no (nightly sibling) |
| aio.managedservers.click ("LowDefPirate AIO") | 2.36.0 | **no — candidate host** |

hosts.js hosts **absent** from the directory: `viren` (aiostreams.viren070.me),
`kuu` (aiostreams.stremio.ru), `atbp` (aio.atbphosting.com), `omni`
(aiostreams.12312023.xyz, already flagged legacy).

Observations:

- The directory confirms independent host upgrade cadence (some already on 2.37.0 while
  the registry snapshot says 2.36.0) — supports the existing "live `/api/v1/status`
  probe always wins" design; the directory must never replace it.
- The directory is moderated, not authoritative: four routed hosts are simply unlisted.
  Treat any cross-check as advisory, like the upstream-drift watcher, never as a block.
- `aio.managedservers.click` is the only net-new candidate; it would still need the
  normal capability/regex/stream-type audit before joining `HOST_BASE_URLS`.

## 4. Why Core Builds has nothing to submit there

Core Builds is a config generator, not a Stremio addon — the addon users install is
AIOStreams, whose directory entry already exists (submitted by viren070). The
directory's [submission rules](https://docs.stremio-addons.net/addons/submission-rules)
also **forbid preconfigured manifest URLs carrying user-specific config or API keys** —
exactly the per-uuid/password URLs the configurator produces. Generating directory
listings is out of scope by design.

## 5. Integration options, ranked

### Option A — reference links (recommended; cheap, zero runtime risk)

1. **`tools/index.html`** — add one external tool card ("Community addon directory",
   outbound https, same pattern as the existing npm CLI card) in section 03
   (New tools) or a new "Directories" group. Useful for users hunting catalog/IPTV/
   metadata addons outside AIOStreams' built-in set. No CSP change: plain anchors are
   unaffected by `connect-src`; the link-integrity e2e only checks same-site links.
2. **`configurator/docs/best-addons.md`** (surfaced in Review → Tools →
   "Recommended Stack") — cite the directory's per-addon pages next to Torrentio,
   Comet and MediaFusion instead of bare names, and note its own catalog addon for
   in-Stremio browsing.
3. Keep using directory star counts in market-intelligence docs
   (`docs/product-opportunity-2026-09-02.md`,
   `configurator/reports/07-market-intelligence-*.md` already do) — now sourced from
   `/api/v0` rather than manual page reads.

Copy must call it a **community-moderated** directory: it prominently hosts adult/NSFW
addons, so avoid framing it as curated or safe-for-all-audiences.

### Option B — scheduled registry cross-check (optional; CI only)

A non-blocking workflow (mirroring `.github/workflows/upstream-drift-watch.yml`) that
fetches `/api/v0/addons/aiostreams`, diffs instance origins against `HOST_BASE_URLS`,
and opens/updates an issue on drift (new candidate host, or a routed host delisted).
Must tolerate API failure silently and pin against the experimental contract; no
generated-file changes, no install-path coupling.

### Option C — live in-app directory data (not recommended now)

Embedding star counts/versions in the UI would require adding
`https://stremio-addons.net` to the configurator's CSP `connect-src`, plus fail-soft
handling like the host probes. Against it: the API is explicitly unstable, responses
cache for 24 h (stale badges), the directory includes NSFW content, and the configurator
already has stronger first-party signals (live host status, pinned upstream contract).
Revisit only if a stable v1 API ships.

## 6. Summary recommendation

Do **Option A** (one Tools-hub card + best-addons doc citations) if any product surface
is wanted; optionally **Option B** as an advisory CI check. Do not add a runtime
dependency, and do not attempt a Core Builds submission. The ChillLink/Chillio work is
independent and remains the higher-value install-flow feature.
