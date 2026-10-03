# Configurator accuracy audit, 2026-10-02

Goal: every claim the configurator shows and every setting it emits is true
against what AIOStreams and the public hosts actually do.

**Ground truth used**

- Upstream source: `Viren070/AIOStreams` main at `dd9a87c` (2026-10-02), read
  directly: preset metadata (`packages/core/src/presets/*.ts`), service
  credential definitions (`utils/constants.ts`), config validation
  (`utils/config.ts`) and the SEL function table (`parser/streamExpression.ts`).
- Live `/api/v1/status` of all eight registered hosts, read 2026-10-02 (no
  credentials sent): version, channel, regex access level and
  `settings.presets[].DISABLED`.
- Real configs generated from the built app through the `?cb-e2e=1` hook for
  each risky setting, before and after the fix.

## Findings that made AIOStreams refuse the save

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | TorBox (addon), USA TV and Debridio Watchtower offered as toggles | Upstream `DISABLED: { removed: true }`; `validatePreset()` throws, and create/update validates with `skipErrorsFromAddonsOrProxies: false`. Disabled on all 8 hosts. | Removed from the list; `UPSTREAM_REMOVED_PRESET_IDS` stripped on every host for older saves and imports |
| 2 | Bitmagnet offered everywhere | `DISABLED: "Not configured"` on ElfHosted, ATBP, Omni's, Wizaardd | Gated per host in the registry; description says so |
| 3 | Live host check ignored the host's own disabled list | Probe parsed only `customHtml` prose. Viren's nightly now disables Torrentio and was not caught | `parseHostStatus` reads `settings.presets[].DISABLED` |
| 4 | Offcloud sent only `apiKey` | Upstream requires `apiKey` + `email` + `password` (all `required: true`) | `SERVICE_CREDENTIAL_FIELDS`; form asks for all three |
| 5 | PikPak sent `apiKey` | Upstream requires `email` + `password` | Form asks for email and password |
| 6 | Seedr sent `apiKey`, and emitted StremThru Store | Upstream requires `encodedToken` (issued by MediaFusion); only MediaFusion supports Seedr, so a Store instance with no usable service throws | Form asks for the token; Seedr builds emit no StremThru preset |
| 7 | Age Rating Limit emitted `certification(...)` | No such SEL function upstream; `testStreamExpression()` rejects it. On Stable/Balanced the rule was silently dropped, so the control did nothing | Control removed; generator stub returns nothing; saved `ageLimit` still loads |

## Approved follow-up (owner, 2026-10-02)

| # | Finding | Fix |
|---|---|---|
| 23 | Choosing Anime / Movies + Anime added no anime source on Balanced: the allowlist stripped AnimeTosho. AnimeTosho is also a Torznab built-in, so Advanced anime builds on P2P/EasyNews carried an enabled preset that refused the save | Balanced keeps AnimeTosho; it is emitted for Anime and Movies + Anime only with a torrent debrid service |

## False or stale information

| # | Where | Was | Now |
|---|---|---|---|
| 8 | Host picker / registry | 2.34.1 for seven hosts, 2.33.2 for Omni's | Live versions: 2.35.7 (ElfHosted, ForTheWeak, Midnight's, Kuu's, Viren's), 2.35.5 (ATBP, Omni's), 2.35.4 (Wizaardd) |
| 9 | Host label | "Omni's (legacy)" | "Omni's" (it is not behind) |
| 10 | Compatibility target notes | "matches the live fleet except Omni" | States the schema pin is 2.34.1 and every host runs 2.35.x |
| 11 | Recommended Stack panel | Torz and Knaben called usenet; "v2.34.1 pinned c1d044c"; Torrentio recommended; a non-existent `webstreamrmbg`; developer changelog notes | Rewritten from what the builder emits and what each host blocks |
| 12 | Brazuca Torrents | "Brazilian torrents · debrid cached", blocked on P2P | Dubbed (PT-BR) P2P torrents; selectable on P2P builds |
| 13 | Knaben / Zilean cards | Toggles | Removed: both are always included with a torrent debrid and cannot run without one, so the cards did nothing |
| 14 | EasyDebrid | "multi-debrid aggregator" | A debrid service |
| 15 | Offcloud / PikPak / Seedr tiles | "API key" | The fields each service actually needs |
| 16 | Samsung TV help | "2018–2022 models lack AV1/VC-1" | Models before 2020 lack AV1; VC-1 varies |
| 17 | Fire TV Stick HD profile | "1080p SDR only, no HDR" | 1080p, HDR10/HLG play, no DV or AV1 (the build already treated it this way) |
| 18 | Anime content option | "SeaDex Best-Only" | SeaDex picks ranked first; dual-audio kept (nothing filters to SeaDex only) |
| 19 | Troubleshooter | "8 default excluded regex patterns", "107-entry scored set" | 3 excluded and about 80 ranked on Balanced (from the goldens) |
| 20 | Stream Pool | Header said 30–35 / 50 / 75, buttons said 20 / 30–35 / 50; Balanced ignores it | Counts come from the same function as the build, per resolution; says when the profile ignores it |
| 21 | Balanced profile | No note that groups, dynamic exit, preload, precache and cache-and-play are off | Note added, like Stable's |
| 22 | Sound Profile tooltip | Named options "Limited" and "Full" | Uses the real labels, Auto and Full Lossless |

## Verified correct (no change)

Sootio's ten HTTP providers, YaStream's sources (Kisskh, OneTouchTV, iDrama),
Meteor's usenet support, the 1080p "2160p excluded" claim (present in every
1080p golden), Apple TV / Chromecast / Google TV Streamer / iPad AV1 and DV
statements, and the four upstream descriptions behind the remaining toggles.

## Not changed, for the owner

- **Schema re-pin to 2.35.x (#770).** Every host now runs 2.35.x while output
  targets 2.34.1. The test that required every host version to be a selectable
  target was replaced by the property that matters: every host runs at least
  the default target. #772 attempts a 2.35.3 re-pin; upstream is now 2.35.7.
- **TCL and Hisense profiles** treat every model as having no Dolby Vision.
  Many do support it; the profile errs on the safe side and its text says
  "do not assume", which is accurate.

## Tests

`tests/accuracy-audit-2026-10.test.mjs` pins each finding above. Host-routing,
device-profile and host-capability tests were updated to the live fleet.

## Found by saving into a real AIOStreams (spike, 2026-10-03)

462 configs generated from the built app (every service x content x resolution x
profile, plus each optional toggle on TorBox, P2P and EasyNews) were POSTed to a
throwaway AIOStreams 2.35.7 container with dummy credentials and stubbed addon
manifests. 100 were refused before these fixes:

| Refusals | Cause | Fix |
|---|---|---|
| 54 | SeaDex on Seedr / EasyNews / Usenet / Debridio builds: it needs a torrent debrid service (`requires at least one usable service`). Live on main. | Gated on `torrentCapable` |
| 24 | Every Usenet-route build: EasyNews Search wants `aiostreamsAuth` when it can see Stremio NNTP / AIOStreams services | `services:['easynews']` on EasyNews Search |
| 6 | Debridio-only builds: the Debridio scraper needs a debrid service | Emitted only with a Debridio-supported service |
| 4 | EasyNews / EasyNews+ toggles on non-EasyNews builds (`No credentials found for service easynews`) | Emitted only with the EasyNews service; card gated |
| 5+1 | Newznab indexers / NZBHydra without a usenet-capable service | Emitted only with one (`USENET_INDEXER_SERVICE_IDS`) |
| 3+1 | Jackett, Prowlarr, NekoBT, Jackettio without a torrent debrid service | Emitted only with one; cards gated on every selected service |

The remaining refusals were test-setup artifacts (Bitmagnet unconfigured on the
local container; the stub's manifest for USA TV Next). Golden change: only
`easynews-1080p.json` (SeaDex removed, EasyNews Search limited to EasyNews).
