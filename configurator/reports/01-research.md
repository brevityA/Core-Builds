# 01 — Competitive & user-friction research

**Knowledge cutoff.** My training data ends before this work; everything below was
re-verified against live sources on **2026-08-31**. Every competitor feature and
every user claim links to a page that was actually fetched during this task.
Anything that could not be fetched is marked `[UNVERIFIED]`.

**Reference point.** AIOStreams upstream is pinned for this work at
`Viren070/AIOStreams@d3ea9bbaa48d757b31e1277186fcfaeeff41a4cc` (**v2.33.2**) —
see `configurator/UPSTREAM.pin`.

---

## 1. Competing AIOStreams configuration tools

| Tool | Scope | Where it runs | Source |
| --- | --- | --- | --- |
| **AIO.TVFLIX Builder v3.20** | Full wizard → AIOStreams config JSON | Hosted web app | <https://aio.tvflix.co.uk/> · <https://github.com/ParticularCatch449/aio-tvflix-builder> |
| **Tamtaro SEL Filtering & Sorting** | Importable template + in-AIOStreams onboarding wizard | Inside AIOStreams | <https://github.com/Tam-Taro/SEL-Filtering-and-Sorting> |
| **CrispyFormat** | Visual formatter builder (beta) | Hosted web app | <http://CrispyDuck.xyz> |
| **Duck Tools "QuackStart"** | Guided quick-start | Was `duckkota.gitlab.io/stremio-tools/quickstart/`, moved to `duck-tools.app` — **now 404** `[UNVERIFIED]` | <https://duckkota.gitlab.io/stremio-tools/quickstart/> |
| **AIOStreams' own `/configure` UI** | The baseline every tool is measured against | Each host | <https://docs.aiostreams.viren070.me/> |
| **Core Builds configurator** (this repo) | Full wizard + direct install + import/update | Static site | `configurator/` |

### 1.1 Feature matrix

Legend: ● full · ◐ partial · ○ absent · ? unverified

| Capability | Core Builds (before) | AIO.TVFLIX | Tamtaro | CrispyFormat | AIOStreams `/configure` |
| --- | --- | --- | --- | --- | --- |
| Guided wizard | ● | ● | ◐ (in-app) | ○ | ◐ |
| Multi-debrid selection | ● | ● | ○ | ○ | ● |
| **Host selection** | ● (8 hosts) | ○ — hardcodes `aiostreamsfortheweebs.midnightignite.me` | n/a | n/a | n/a |
| **Host-capability awareness** | ◐ advisory only | ○ | ○ | ○ | ● (it *is* the host) |
| Direct install to Stremio | ● | ○ (download JSON only) | ○ | ○ | ● |
| JSON export | ● | ● | ● | ○ | ● |
| Import / update an existing config | ● | ○ | ◐ | ○ | ● |
| Bandwidth → bitrate cap | ● | ● (80 % of Mbps) | ○ | ○ | ○ |
| "Quality first" vs "speed first" | ● | ● | ● | ○ | ◐ (manual sort list) |
| **Resolution-tier-first sorting** | ○ *(the bug this work fixes)* | ◐ | ● (documents Cached → Resolution) | ○ | ◐ (manual) |
| Per-resolution result caps | ● | ● | ○ | ○ | ● |
| Anime handling | ● | ● (toggle) | ● | ○ | ● |
| Kids / age rating | ● | ● | ○ | ○ | ○ |
| Audio-language multi-select | ● | ● | ● | ○ | ● |
| Formatter presets w/ live preview | ● (19 presets) | ● (5 presets) | ● | ● (visual builder) | ● |
| Catalog ordering / RPDB posters | ● | ● | ○ | ○ | ● |
| UI localisation | ○ (English) | ● (12 languages) | ○ | ○ | ◐ |
| Regex allowlist awareness | ◐ advisory | ○ | ● (documents host requirements) | ○ | ● |
| Offline / single-file build | ● | ○ | n/a | ○ | ○ |

### 1.2 What each competitor does better, and what it does worse

**AIO.TVFLIX Builder** — the closest direct competitor. Better: 12 UI languages,
an explicit bandwidth→bitrate calculator (caps at 80 % of the stated Mbps), a
kids age-rating lane, and a catalog order manager. Worse, and decisively so: it
**hardcodes a single AIOStreams host** and can only produce a downloadable JSON —
there is no direct install and no notion of what the target host will accept.
Source: <https://aio.tvflix.co.uk/>, <https://github.com/ParticularCatch449/aio-tvflix-builder>.

**Tamtaro SEL Filtering & Sorting** — not a configurator but a *template*,
imported from `https://git.tamtaro.de/complete.json`, with an onboarding wizard
that runs inside AIOStreams itself. It is featured on Viren's own instance
(`featuredTemplateIds: ["tamtaro.complete", "Vidhin05.regex-template"]`, observed
in `https://aiostreams.viren070.me/api/v1/status`). Its documentation is the best
public explanation of the cached/uncached sort trap (§2.2). Self-hosters are told
they need `SEL_SYNC_ACCESS=all` and `REGEX_FILTER_ACCESS=all` — an explicit
admission that host capability is a first-class concern that no builder models.
Source: <https://github.com/Tam-Taro/SEL-Filtering-and-Sorting>.

**CrispyFormat** — formatter-only, in beta. Strong visual editing of the
formatter string; no filtering, sorting, addon or host concerns at all.
Source: <http://CrispyDuck.xyz>.

**Duck Tools "QuackStart"** — the documented URL now 404s and the tool appears to
have moved or been retired. Feature claims are `[UNVERIFIED]`; nothing about it
is used to justify any decision in this work.

---

## 2. Prioritised gap list

Effort: S ≤ ½ day · M ≈ 1–2 days · L > 2 days.
Impact: how many users are affected × how badly.

| # | Gap | Impact | Effort | Shipped in this work |
| --- | --- | --- | --- | --- |
| 1 | **4K builds do not actually rank 4K first** — score/quality keys sit above `resolution` in the emitted `sortCriteria` | Critical — the headline promise of the 4K profile is false | M | ✅ Phase 5 |
| 2 | **No host-capability model** — the app can emit Torrentio, P2P, and non-whitelisted regex to hosts that reject them | Critical — a rejected regex makes AIOStreams refuse the *entire* save | L | ✅ Phase 4 |
| 3 | **Upstream schema is restated by hand** and has drifted — 6 emitted keys no longer exist upstream | High — silently dropped settings | M | ✅ Phase 3 |
| 4 | `1440p` is neither preferred nor excluded in the 4K profile, so it sorts below 720p | High for 1440p displays | S | ✅ Phase 5 |
| 5 | Version floors (`2.32.0`) are stale; every live public host runs 2.33.2 | Medium | S | Documented, see 02-audit §A4 |
| 6 | No UI localisation (AIO.TVFLIX has 12 languages) | Medium — reach | L | Not in scope |
| 7 | No per-device profile switching from one config (users run 3 instances instead) | Medium | L | Not in scope; see friction #5 |
| 8 | Formatter `tv` emits an unbalanced placeholder | Low–Medium | S | ✅ fixed |
| 9 | Result-limit semantics are not explained where users choose them | Medium | S | Not in scope |
| 10 | No visual formatter editor (CrispyFormat is better here) | Low | L | Not in scope; the app already links to CrispyDuck |

---

## 3. Top-10 user friction points

Each is labelled **"users explicitly ask for X"** (a user states the want) or
**"inferred from Y"** (deduced from observed behaviour or workarounds).

1. **Resolution tiers get mixed by score.** — *inferred from* the Tamtaro
   guidance that a Cached Sort Order should start with **Resolution**, and from
   the sorter's lexicographic behaviour.
   <https://www.reddit.com/r/StremioAddons/comments/1n08b4t/>

2. **The cached/uncached split silently discards the rest of the sort order.**
   Verbatim from the Tamtaro guide: *"If `Cached` is first item, the sort
   algorithm automatically goes to Cached & Uncached Sort Order, nothing else
   after `Cached` matters in Global Sort Order"*. — *users explicitly ask for X*
   (they ask how to stop it). <https://www.reddit.com/r/StremioAddons/comments/1n08b4t/>

3. **"N best per resolution" is not achievable.** A user wants *"3 highest
   quality … for each resolution in descending order"*; the quality limit inside
   the top resolution starves the lower ones, and the only working answer given
   is three AIOStreams instances behind a wrapper. — *users explicitly ask for X*.
   <https://www.reddit.com/r/StremioAddons/comments/1pv84v7/>

4. **The result limiter ignores regex.** *"the results limiter … does not respect
   the regex patterns"* (global 9 / per-resolution 3). — *users explicitly ask
   for X*. <https://www.reddit.com/r/StremioAddons/comments/1q2du2j/>

5. **Per-device configs require multiple instances.** Users want one build that
   serves 4K to the TV and 1080p to the phone; the only answer offered is
   separate instances. — *users explicitly ask for X*.
   <https://www.reddit.com/r/StremioAddons/comments/1rroxyt/>

6. **Torrentio is disabled on ElfHosted and users don't find out until it fails.**
   *"Torrentio … Elfhosted - it's disabled"*; the same thread notes CometNet
   failing on Yeb's instance due to rate limiting. — *users explicitly ask for X*.
   <https://www.reddit.com/r/StremioAddons/comments/1qmt10u/>

7. **Rate limits on shared community instances.** *"TOO MANY REQUESTS"* from
   Comet/MediaFusion; *"every elfhosted instance is rate limited"*. — *users
   explicitly ask for X*. <https://www.reddit.com/r/StremioAddons/comments/1oqt2k0/>

8. **Hand-writing SEL by hand.** Users pasting
   `merge(slice(resolution(addon(...))))` blobs to each other. — *inferred from*
   the thread's contents. <https://www.reddit.com/r/StremioAddons/comments/1qr2icd/>

9. **`regexMatched` runs on parsed fields, not the raw filename**, so patterns
   that look right silently never match. — *users explicitly ask for X* (filed as
   an issue). <https://github.com/Viren070/aiostreams/issues/414>

10. **A 20-pattern regex sort cap** that only a self-hoster can raise
    (`MAX_REGEX_SORT_PATTERNS`), per the maintainer. — *users explicitly ask for
    X*. <https://www.reddit.com/r/StremioAddons/comments/1kfcphq/>

Portability note (not a friction point, a capability users rely on): instance
migration is done by Export with *"Exclude Credentials"* unchecked, then Import.
<https://www.reddit.com/r/StremioAddons/comments/1spnmjo/>

---

## 4. Live host survey (inputs to the Phase 4 registry)

Probed via `${base}/api/v1/status` on 2026-08-31.

| Host | Version | Channel | `regexAccess.level` | Notes |
| --- | --- | --- | --- | --- |
| `aiostreams.elfhosted.com` | 2.33.2 (`f36d0f93`) | stable | **`none`** | `customHtml`: *"Torrentio, AnimeKitsu, and Torrent Catalogs are disabled here, respecting the Torrentio developer's request that hosts not scrape their instance. P2P and HTTP streams are also disabled to reduce liability."* `tmdbApiAvailable: true` |
| `aiostreams.fortheweak.cloud` | 2.33.2 | stable | `trusted` | 242 585 users; **`tmdbApiAvailable: false`** |
| `aiostreams.viren070.me` | `2026.08.29.2114-nightly` (`d7c5f010`) | nightly | `trusted` | 44 452 users; TMDB + TVDB; community formatters/templates require approval; `featuredTemplateIds: ["tamtaro.complete", "Vidhin05.regex-template"]` |

Access-control model, read from the pinned source
(`packages/core/src/utils/regex-access.ts`, `utils/sel-access.ts`):

* `REGEX_FILTER_ACCESS` ∈ `all | trusted | none`. At `none`, an untrusted user
  may use **only** the patterns in `status.settings.regexAccess.patterns`.
* `SEL_SYNC_ACCESS` ∈ `all | trusted` and gates **sync URLs only**.

Docker Hub describes the community instance as *"free, but rate-limited and has
Torrentio disabled"* — <https://hub.docker.com/r/viren070/aiostreams>.

Documentation used for semantics rather than features:
<https://docs.aiostreams.viren070.me/reference/stream-expressions/> (SEL
functions `perGroup`, `resolution`, `quality`, `slice`, `streamExpressionScore`,
`regexScore`) and
<https://guides.viren070.me/stremio/addons/aiostreams/documentation>
(Required / Excluded / Included / Preferred semantics, result-limit cutoff).
