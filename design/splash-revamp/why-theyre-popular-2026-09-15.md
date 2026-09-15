# Why the competition is more popular (and feels more reliable) — 2026-09-15

Research follow-up to the composite prototype feedback: *"interesting but it complicates the page."*
Answered with: which add-ons the popular tools actually install, which tricks carry their
popularity, and what the splash should do about it. Sources: Tam-Taro/SEL-Filtering-and-Sorting
README + CHANGELOG (3.2.4, 2026-09-05), bootstrapper.stremaddon.net (live copy),
r/StremioAddons threads 2026-03 → 2026-05 (incl. DuckOnTheWeb answering about QuackStart),
troypoint.com's QuackStart guide, the "Best Setup For AIO" thread (addon-stack survey).
All product claims about Core-Builds verified against `configurator/src/js/app.js` at `83ec02d`.

## 1. The add-on stacks — what "popular" actually installs

**Inside AIOStreams** (scrapers; from Tam-Taro's presets — the community's default advice):
- *Debrid lane:* SeaDex, Library, StremThru Store, STorz, Comet, MediaFusion, Torrentio,
  Knaben, AnimeTosho, Sootio — + **TorBox Search auto-added iff TorBox selected** (NZB variant if
  Pro tier) — + **ENS auto-added iff Easynews detected**.
- *P2P lane:* Meteor, Comet, StremThru, STorz, MediaFusion, Torrentio, TorrentsDB, Peerflix,
  Sootio, Nuvio Streams/Anime, WebStreamr — HTTP addons forced on.

**Outside AIOStreams, installed directly to the account** — the part our splash undersells:
- **AIOMetadata** (catalogs/meta; Tam keeps 67–80 of 150 catalogs enabled, uses StremThru
  SideKick to dodge `Max descriptor size`), **Cinemeta patched away** (Cinebye),
  **OpenSubtitles PRO / SubSense / SubHero**, **Debridio TV**, Trakt, Streaming Catalogs,
  region packs (Anime Kitsu, Argentina TV). Bootstrapper's own FAQ lists 26 addon tiles.
- Community benchmark of a *lean* install: "just Debridio TV + OpenSubtitles Pro + AIOStreams,
  zero issues, streams instantly" — too many scrapers inside AIO = delay/missing results is
  folk wisdom; Minimal preset caps Comet/Torrentio at 2 results/resolution.

## 2. The popularity mechanics, ranked by evidence weight

1. **Account bootstrap** — log in once (email/password *or* paste AuthKey) and the whole account
   is configured on every device. *We already ship this* (`pushToStremio` via `AddonCollectionGet/Set`,
   full-stack = AIOStreams + AIOMetadata + Cinemeta patch, `cleanInstall` replaces old addons,
   manifest-URL fallback on login failure). **Nobody in our copy mentions it.**
2. **Named presets decide for the user.** Bootstrapper: Minimal / Standard / Full / All-in-One /
   HTTP-only / No streams / Factory. Tam-Taro: pick the mode, addons follow the lane + service.
   Our `quickProfile` (fast/balanced/maximum) exists in code, unnamed on the page.
3. **"Everything optional" presentation.** Bootstrapper is a 10-step wizard, but 8 steps say
   *(optional)* — you click "Bootstrap account" three times and you're done. Simplicity ≠ fewer
   features; it's an opt-**out** layout. (Our prototype hero demanded 3 chips first — that's the
   "complicates the page" complaint, precisely.)
4. **Safety valves named up front:** Backup/Restore button, "Factory: reset account", explicit
   "you will wipe the existing setup — make a backup" warning. This is 80% of the *reliable*
   perception: a visible undo. QuackStart's "Clean old Duck Streams installs" is the same play.
5. **Health checks → auto-drop (NEW, 2026-09-05).** Tam-Taro 3.2.4 added live health checks for
   TorBox/Premiumize/Real-Debrid/Torrentio and an ESE version that removes results from anything
   deemed down. This landed *ten days ago* and is the freshest reliability story in the field.
   Our equivalent (roadmap #5, Health Auto-Drop) is unshipped — this is the first time we're
   behind on a *product* axis, not just a copy axis.
6. **Distribution: template-deeplinks + guide SEO.** Tam links open his template *inside popular
   public AIOStreams instances* (no signup, no hosted builder). QuackStart rides the
   troypoint/guides-style SEO network ("How to install X with QuickStart"). "Just use Tam's
   templates" propagates through Reddit answers. Dated CHANGELOG = visible maintenance.
7. **Transparency theatre that works:** QuackStart links its public PostHog board from its footer;
   Bootstrapper's FAQ explains "What is a debrid service?" *on the tool page* — written for the
   zero-knowledge visitor, then the trust items.
8. **Performance folklore made concrete:** remove `meta` resources from Torrentio/MediaFusion,
   7500ms timeouts everywhere, "Addon Fetching Strategy: Default", 2-results-per-resolution caps.
   Measurable-sounding, cheap to copy as copy ("what we tuned and why" one-liners).

## 3. Core-Builds parity audit — we do more than we say

| Competitor trick | Us, at `83ec02d` | Status |
|---|---|---|
| Account-level install of full stack | `installMode:'direct'` → AIOStreams+AIOM+Cinebye+reorder | ✅ built, ❌ unadvertised |
| Curated catalogs config | `AIOMetadata/core-builds-aiometadata-{full,movies-tv}.json`, 74/91 & 60/71 enabled | ✅ |
| Subtitles in the plan | `subtitleAddons: aiosubtitle | opensubtitles-v3+ | subdl`, langs | ✅ inside manifest |
| Clean old installs | `cleanInstall` → "Previous install replaced!" | ✅ |
| Preset ladder | `quickProfile: fast/balanced/maximum` | ⚠️ exists, unnamed |
| Hosted on their instances | 8 public hosts audited; manifest URL | ⚠️ no "open in host UI" deeplink |
| Backup / Factory reset | export JSON download | ⚠️ no named "reset account" |
| Health checks auto-drop | not shipped | ❌ behind as of 2026-09-05 |
| Conditional auto-addons | `optionalScrapers` are user-picked; no if-service-then-addon rule | ❌ |
| "Keep my addons" import mode | route cards exist; not framed as "don't touch my list" | ⚠️ |
| Public analytics board | counter worker exists (`/api/stats`) | ⚠️ could literally do this |

## 4. Splash consequences — the simplification answer

- **Lead with the install, not the engine demo.** Hero = one CTA ("Set up my account") + the
  *grid of what you get*: addon tiles with logos + counts (74 templates · 8 hosts checked ·
  74 catalogs, numbers all true today). That is what makes Bootstrapper's page look effortless —
  it shows the payload, not the machinery.
- **Preset names over policy knobs.** "Standard / Full / HTTP-only / Reset" as the first choice
  (rename `quickProfile`, name the full-stack default); device/resolution/service chips become an
  *optional* "tune first" drawer below the CTA, not the gate. The proof-demo module demotes to one
  link: "See it cut a real stream list" → opens the interactive panel collapsed-out.
- **Add the two trust lines nobody else can print:** "option names verified against AIOStreams
  e694b6a — a rejection, not a silent drop" and "install result is re-read and diff-checked"
  (roadmap #1). Trust via one sentence + one number, not a bento grid.
- **Ship before marketing, in this order:** (1) Health auto-drop parity with Tam-Taro 3.2.4,
  (2) named presets on the landing, (3) `?open=` deeplink to the chosen public host's config UI
  with template loaded, (4) "Reset/Backup" affordance. Each becomes one line of splash copy.
- **What to drop from the prototype:** the three-fold structure (keep fold 1 + footer), the
  live-audit table (into a `/proof` route), the policy-sim hero (into the drawer), the footnote
  paragraph (into this file). Target: one CTA, one tile grid, two trust sentences, footer.
