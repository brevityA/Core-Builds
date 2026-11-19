# AIOStreams feature rundown

Generated 2026-11-19 by `node scripts/feature-rundown/rundown.mjs`. Pinned to **2.36.0**; newest upstream release **2.38.1** (3 releases ahead of the pin).

Usage comes from 20 golden configs (profiles: stable, balanced, advanced, labs), 54 static templates and the smart template. A golden counts as using an option when the option switches something on (an `enabled: true` object, a non-empty list or a set value). Reasons come from `scripts/feature-rundown/decisions.json`.

## Summary

| | Count |
|---|---|
| Config options AIOStreams accepts (2.38.1) | 162 |
| Used by at least one generated profile or template | 69 |
| Used by the default profile (Core Stable) | 33 |
| Decision: used | 91 |
| Decision: candidate | 13 |
| Decision: off-by-design | 35 |
| Decision: not-applicable | 23 |
| **Needs attention** | **0** |

## Needs attention

Nothing: every option has a decision that matches what the configs do.

## New upstream since 2.36.0

- **Config options added:** `customPosterUrl`
- **Config options removed:** none
- **Presets added:** `cinemeta`, `xtream`
- **Presets removed:** none
- **SEL functions added:** none
- **SEL functions removed:** none

### Stream-related changelog entries

Web player, Jellyfin, UI, desktop, Android, TV and watch-state entries are left out.

**2.38.1** (2026-11-14)

- nothing stream-related

**2.38.0** (2026-11-14)

- _Features_ · **core:** add a background lane and an abort signal to catalog walks
- _Features_ · **core:** add an Xtream builtin
- _Features_ · **core:** combine back-to-back variant selectors
- _Features_ · **core:** look up a film's anime ids from the anime database
- _Features_ · **core:** replace variant length and instruction limits with a work budget
- _Features_ · **presets/newznab:** add SearchNZB indexer
- _Features_ · **presets:** add cinemeta preset
- _Features_ · **server:** mark and explain a title no addon has details for
- _Features_ · **server:** mount the Xtream builtin
- _Features_ · **server:** send the variant work budget in status
- _Features_ · **variants:** add a move instruction
- _Bug Fixes_ · **core:** only set indexer/addon mediaInfoQuality when languages were returned
- _Bug Fixes_ · **core:** read OpenSubtitles' Chinese bilingual codes as Chinese
- _Bug Fixes_ · **core:** skip stream metadata for ids the parser can't read
- _Bug Fixes_ · **knaben:** dedupe hits, use upload date for age, include subcategories
- _Bug Fixes_ · **parser:** resolve ISO 639-2/B codes in convertISO6392ToLanguage
- _Bug Fixes_ · **presets/meteor:** migrate to current config format and improve stream parsing
- _Bug Fixes_ · **presets/meteor:** skip "donate" placeholder stream
- _Bug Fixes_ · **presets/meteor:** skip "no results" placeholder stream
- _Bug Fixes_ · **presets:** update Doctor Who URL and add missing Torrentio/TorrentsDB providers
- _Bug Fixes_ · **server:** allow the Range header in cross-origin requests
- _Bug Fixes_ · **therarbg,torrent-galaxy:** normalise imdb ids, keep keywords first in URLs, share code
- _Bug Fixes_ · **torrent-galaxy:** use torrentgalaxy.online as default domain
- _Performance Improvements_ · **core:** remember item id hashes

**2.37.0** (2026-10-23)

- _Features_ · **core:** add a sharedId to episodes whose own id is hashed
- _Features_ · **core:** name a country the same from any code or spelling
- _Features_ · **core:** name the language a tag stands for, with its region
- _Bug Fixes_ · **config:** decrypt string and URL credentials set by the environment
- _Bug Fixes_ · **metadata/tvdb:** tag the original-language title with its language
- _Bug Fixes_ · skip merged catalog sources that don't declare a requested extra
- _Performance Improvements_ · **core:** reject values that can't be encrypted before parsing them

## Used (91)

| Option | Stable | Balanced | Advanced | Labs | Templates | Smart | Why |
|---|---|---|---|---|---|---|---|
| `trusted` | · | · | · | · | · | ✓ | Smart template only; trust itself comes from the operator's TEMPLATE_URLS. |
| `showChanges` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Template metadata: tells AIOStreams to show what an update changes before the user applies it. |
| `addonName` | ✓ | ✓ | ✓ | ✓ | 54 | ✓ | Brands the addon in Stremio as Core Builds (with the build's name). |
| `addonLogo` | ✓ | ✓ | ✓ | ✓ | 46 | ✓ | Core Builds icon; must use the /refs/heads/main/ raw URL (CLAUDE.md, known validator rules). |
| `addonDescription` | ✓ | ✓ | ✓ | ✓ | 54 | ✓ | Describes the build in the Stremio addon list. |
| `appliedTemplates` | · | · | · | · | 40 | · | Set by AIOStreams on static templates it has applied; the generator does not write it. |
| `excludedResolutions` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Drops resolutions the build never wants. Core Stable drops 576p and below, which can leave DVD-only titles with nothing: see the effectiveness audit. |
| `includedResolutions` | · | · | · | · | · | ✓ | Smart template only, where an answer keeps a resolution the exclusions would drop. |
| `requiredResolutions` | · | · | · | · | 6 | ✓ | A few static templates (1080p lines) require their resolution; generators rank with PSEs instead so niche titles still return something. |
| `preferredResolutions` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Ranks the target resolution first; for 4K builds the sort is resolution, cached, quality (sort-policy.js). |
| `excludedQualities` | ✓ | ✓ | · | · | 4 | ✓ | Removes CAM, TS, TC, SCR and HC rips on Stable and Balanced; Advanced/Labs do this in an ESE so library and SeaDex passthrough can override it. |
| `includedQualities` | · | · | · | · | · | ✓ | Smart template only (answer-dependent passthrough). |
| `requiredQualities` | · | · | · | · | · | ✓ | Smart template only (answer-dependent). |
| `preferredQualities` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Ranks REMUX and BluRay above WEB for quality-first builds. |
| `excludedLanguages` | · | · | · | · | · | ✓ | Smart template only; the generators use requiredLanguages with Unknown, Multi and Dual Audio kept so unlabelled releases are not lost. |
| `includedLanguages` | · | · | · | · | 1 | ✓ | One static template keeps a language through other filters. |
| `requiredLanguages` | · | · | ✓ | ✓ | 41 | ✓ | Advanced/Labs require the user's languages but always keep Original, Dual Audio, Multi, Dubbed and Unknown, so a release with no language tag still shows. |
| `preferredLanguages` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Ranks the user's languages first. |
| `preferredSubtitles` | · | · | · | · | 50 | · | Static templates rank releases carrying the user's subtitle language. |
| `excludedVisualTags` | ✓ | ✓ | · | · | 53 | ✓ | Drops 3D and half-SBS/OU everywhere; device profiles add DV-only kills where DV fails. |
| `includedVisualTags` | · | · | · | · | 4 | · | A few static device templates keep HDR tags through other filters. |
| `preferredVisualTags` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Ranks DV/HDR10+/HDR by what the device supports (devices.js). |
| `excludedAudioTags` | 14/15 | ✓ | ✓ | ✓ | 24 | ✓ | Removes audio the device cannot pass through (TrueHD, DTS-HD MA, DTS:X, FLAC on most TVs). |
| `preferredAudioTags` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Ranks Atmos/DD+ or lossless by the device's audio profile. |
| `excludedAudioChannels` | · | · | · | · | 38 | · | Static templates only, for devices that mishandle 7.1. |
| `preferredAudioChannels` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Ranks 7.1/5.1 by the sound profile. |
| `excludedStreamTypes` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Debrid builds drop p2p/http/youtube results that would not play through the service; P2P builds keep p2p. |
| `preferredStreamTypes` | · | · | · | · | 50 | · | Static templates rank debrid over usenet or the reverse per line. |
| `excludedEncodes` | 14/15 | ✓ | ✓ | ✓ | 26 | ✓ | Drops AV1 and VC-1 on devices without safe hardware decode (deviceAv1Safe). |
| `preferredEncodes` | ✓ | ✓ | ✓ | ✓ | 54 | ✓ | Ranks HEVC/AVC by device. |
| `excludedRegexPatterns` | · | ✓ | ✓ | ✓ | 43 | ✓ | Eight inline patterns (upscaled, extras, LQ groups, BR-DISK, retags); each string is a verbatim Vidhin05 pattern so ElfHosted's allowlist accepts it. |
| `preferredRegexPatterns` | · | ✓ | ✓ | ✓ | 41 | ✓ | Tier-1 group patterns (Remux T1, FraMeSToR…), verbatim Vidhin05 strings. |
| `syncedRankedRegexUrls` | · | · | ✓ | ✓ | 43 | ✓ | Vidhin05's ranked list, the one synced URL public hosts accept. |
| `syncedPreferredStreamExpressionUrls` | · | · | · | · | · | ✓ | Static templates and the smart template's trust case point at Filtering/core-builds-pses.json so one edit updates every importer; generated configs inline their PSEs. |
| `syncedExcludedStreamExpressionUrls` | · | · | · | · | · | ✓ | Same, for Filtering/core-builds-eses.json. |
| `syncedIncludedStreamExpressionUrls` | · | · | · | · | · | ✓ | Same, for Filtering/core-builds-ises.json. |
| `syncedRankedStreamExpressionUrls` | · | · | · | · | · | ✓ | Smart template trust case only, so operators who add the collection to TEMPLATE_URLS trust it. |
| `includeSeederRange` | · | · | · | · | 43 | · | Static templates keep well-seeded torrents through other filters. |
| `digitalReleaseFilter` <sub>enabled, tolerance, checkResultAge, requestTypes, addons, showInfoOnFilter</sub> | · | · | · | · | 2 | ✓ | Off in generated configs: it drops results before the digital release date, which also removes early legitimate releases. Two static templates enable it. |
| `enableSeadex` | ✓ | ✓ | ✓ | ✓ | 42 | ✓ | SeaDex best-release data for anime; feeds the seadex sort key and the Library/SeaDex ISE. |
| `excludeCached` | · | · | · | · | · | ✓ | Smart template only; the generators never drop cached results. |
| `excludeCachedFromAddons` | · | · | · | · | · | ✓ | Smart template only. |
| `excludeCachedFromServices` | · | · | · | · | · | ✓ | Smart template only. |
| `excludeCachedFromStreamTypes` | · | · | · | · | · | ✓ | Smart template only. |
| `excludeUncached` | 1/15 | · | · | 1/3 | · | ✓ | Set when the user picks cached-only; otherwise uncached stays so a title nobody has cached still shows something. |
| `excludeUncachedFromAddons` | · | · | · | · | · | ✓ | Smart template only (answer-dependent). |
| `excludeUncachedFromServices` | · | · | · | · | · | ✓ | Smart template only. |
| `excludeUncachedFromStreamTypes` | · | · | · | · | · | ✓ | Smart template only. |
| `excludeUncachedMode` | ✓ | ✓ | ✓ | ✓ | 45 | ✓ | Always 'or', the AIOStreams default, written explicitly so an import shows no change. |
| `excludedStreamExpressions` | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | ESEs: one on Core Stable (external-stream kill), 29 on the IQR build. Pack filtering runs last so a valid episode request never ends empty (CLAUDE.md, late pack fallback). |
| `requiredStreamExpressions` | · | · | · | · | · | ✓ | Smart template only (answer-dependent); generators avoid required expressions for the same reason as required regex. |
| `preferredStreamExpressions` | · | ✓ | ✓ | ✓ | 50 | ✓ | PSEs: IQR bitrate tiers, pow() decay, perGroup() balance. None on Core Stable. |
| `includedStreamExpressions` | · | ✓ | ✓ | ✓ | 51 | ✓ | ISEs: library and SeaDex passthrough, ID-matched trust, Smart Play pin. |
| `rankedStreamExpressions` | · | · | ✓ | ✓ | 41 | ✓ | The only writer of streamExpressionScore; without it the score sort and Adaptive Score Floor are stripped. Advanced and Labs only (ranked-sel-policy.js). |
| `rankedRegexPatterns` | · | ✓ | ✓ | ✓ | 43 | ✓ | Scored regex overrides; without them regexScore is a no-op because every synced Vidhin05 entry scores 0. |
| `regexOverrides` | · | · | · | · | 41 | ✓ | Set by AIOStreams on templates that override synced regex scores by name. |
| `selOverrides` | · | · | · | · | · | ✓ | Smart template only, carried from the per-answer builds. |
| `dynamicAddonFetching` <sub>enabled, condition</sub> | · | · | ✓ | ✓ | 49 | ✓ | Advanced/Labs only: returns once the exit condition is met instead of waiting for every source. Core Stable turns it off so a problem reproduces the same way each time — which also means Stable waits on its slowest source. |
| `sortCriteria` <sub>global, movies, series, anime, cached, uncached, cachedMovies, uncachedMovies, …</sub> | ✓ | ✓ | ✓ | ✓ | 54 | ✓ | Stable multi-key sort: cached and stream-expression keys first, then resolution and quality. audioChannel is dropped from generated configs because the upstream sorter has no case for it. |
| `rpdbApiKey` | · | ✓ | ✓ | ✓ | 52 | · | RPDB posters: RPDB's public free-tier key t0-free-rpdb by default, or the user's own. |
| `posterService` | ✓ | ✓ | ✓ | ✓ | 54 | ✓ | Poster source for catalogs. |
| `usePosterRedirectApi` | · | ✓ | ✓ | ✓ | 52 | · | Poster redirect for RPDB. |
| `usePosterServiceForMeta` | · | ✓ | ✓ | ✓ | 52 | · | Posters in meta pages too. |
| `formatter` <sub>id, selectedSaved, definitions</sub> | ✓ | ✓ | ✓ | ✓ | 54 | ✓ | Stream card layout (family-v4 by default, Core collection, or imported). |
| `proxy` <sub>enabled, id, url, publicUrl, credentials, publicIp, proxiedAddons, proxiedServices</sub> | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | Neutral stub until address, credentials and enabled are all set (stream-proxy-policy.js). |
| `resultLimits` <sub>global, service, addon, resolution, quality, streamType, indexer, releaseGroup, …</sub> | ✓ | ✓ | ✓ | ✓ | 53 | ✓ | 10–12 results on Core Stable (3 per resolution), 30–35 on Advanced/Labs. |
| `size` <sub>global, resolution</sub> | 1/15 | ✓ | ✓ | ✓ | 52 | ✓ | Size ranges per resolution, from the user's size limit. |
| `bitrate` <sub>useMetadataRuntime, global, resolution</sub> | · | ✓ | ✓ | ✓ | 44 | · | Bitrate ranges, and the bandwidth cap (80% of the typed speed). |
| `hideErrors` | · | · | ✓ | ✓ | 51 | ✓ | Hides addon error rows in Stremio on Advanced/Labs. |
| `hideErrorsForResources` | ✓ | ✓ | ✓ | ✓ | 46 | ✓ | Scopes error hiding to resource types. |
| `tmdbAccessToken` | · | · | · | · | 51 | · | Static templates carry `<template_placeholder>` for the user's own token; never a real value. |
| `tmdbApiKey` | · | · | · | · | 51 | · | Same as tmdbAccessToken. |
| `yearMatching` <sub>enabled, tolerance, strict, strictTypes, useInitialAirDate, requestTypes, addons</sub> | · | · | · | · | 51 | ✓ | Static templates match the release year; generators leave AIOStreams' default. |
| `titleMatching` <sub>mode, matchYear, yearTolerance, similarityThreshold, enabled, ambiguousResults, requestTypes, addons</sub> | · | · | · | · | 51 | ✓ | Off in generated configs (default contains, 0.75): strict title matching drops foreign and alternate titles. Static templates enable it. |
| `seasonEpisodeMatching` <sub>enabled, strict, requestTypes, addons</sub> | ✓ | ✓ | ✓ | ✓ | 54 | ✓ | On, non-strict: drops wrong-episode results while letting packs through for AIOStreams to verify. |
| `deduplicator` <sub>enabled, excludeAddons, multiGroupBehaviour, keys, cached, uncached, p2p, http, …</sub> | ✓ | ✓ | ✓ | ✓ | 54 | ✓ | Filename, infoHash and smartDetect keys; one cached result per release, uncached per service. |
| `autoPlay` <sub>enabled, method, attributes</sub> | · | ✓ | ✓ | ✓ | 52 | ✓ | Next-episode autoplay by matching attributes; Core Stable turns it off. |
| `areYouStillThere` <sub>enabled, episodesBeforeCheck, cooldownMinutes</sub> | · | · | · | · | · | ✓ | Smart template only. |
| `precacheNextEpisode` | · | · | ✓ | ✓ | 51 | ✓ | Advanced/Labs: asks the service to cache the next episode while this one plays. |
| `precacheSelector` | · | · | ✓ | ✓ | 50 | · | Which stream to precache (replaces the deprecated alwaysPrecache/precacheCondition). |
| `precacheSingleStream` | · | · | ✓ | ✓ | 51 | · | Precache only the first selected stream. |
| `preloadStreams` <sub>enabled, selector, singleStream</sub> | · | · | ✓ | ✓ | 51 | ✓ | Advanced/Labs: pings the top stream so it starts faster. Off on Core Stable. |
| `services` | 12/15 | ✓ | ✓ | ✓ | 54 | ✓ | The user's debrid/usenet services (credentials stripped from shared links). |
| `presets` | ✓ | ✓ | ✓ | ✓ | 54 | ✓ | The addons. Core Stable emits three torrent sources on TorBox (StremThru Torz, Meteor, Comet); Balanced and above add Zilean, MediaFusion, EZTV, Torrent Galaxy and Knaben. |
| `addonCategoryColors` | ✓ | ✓ | ✓ | ✓ | 45 | ✓ | Colours the addon categories in AIOStreams' own UI so the generated build reads clearly. |
| `catalogModifications` | · | · | · | · | 24 | · | Static templates hide or reorder catalogs; generated configs leave catalogs alone. |
| `mergedCatalogs` | · | · | · | · | · | ✓ | Smart template only. |
| `externalDownloads` | · | · | · | · | · | ✓ | Smart template only. |
| `cacheAndPlay` <sub>enabled, streamTypes</sub> | · | · | ✓ | ✓ | 31 | ✓ | Advanced/Labs: plays an uncached torrent or NZB once the service has it. Off on Core Stable. |
| `autoRemoveDownloads` | · | · | · | · | · | ✓ | Smart template only. |
| `checkOwned` | · | · | · | · | · | ✓ | Smart template only. |

## Candidates — worth evaluating (13)

| Option | Stable | Balanced | Advanced | Labs | Templates | Smart | Why |
|---|---|---|---|---|---|---|---|
| `variants` | · | · | · | · | · | · | Config scripts applied by condition (2.33+). With healthChecks, a build could fall back to P2P or usenet automatically when the debrid service is down. |
| `healthChecks` | · | · | · | · | · | · | URL checks referenced as health('<id>') from variant conditions. Pairs with variants for automatic fallback. |
| `variantSelectorLocation` | · | · | · | · | · | · | Where an explicit variant is named (query or path); only matters once variants are used. |
| `excludeSeederRange` | · | · | · | · | · | · | Native seeder filter; could replace the Low Seeders / Low Seeder Cull ESEs and run cheaper. |
| `seederRangeTypes` | · | · | · | · | · | · | Which result types the seeder ranges apply to; needed if excludeSeederRange is adopted. |
| `excludeAgeRange` | · | · | · | · | · | · | Native usenet age filter; could replace the Usenet Propagation Guard ESE. |
| `ageRangeTypes` | · | · | · | · | · | · | Which result types the age ranges apply to; needed if excludeAgeRange is adopted. |
| `statistics` <sub>enabled, position, statsToShow, showFilterStatsOnNoStreams</sub> | · | · | · | · | · | ✓ | Off everywhere. It can show why nothing appeared (showFilterStatsOnNoStreams); worth turning on for empty results only. |
| `episodeTitleMatching` <sub>enabled, similarityThreshold, requestTypes, addons</sub> | · | · | · | · | · | · | Matches episodes by title when numbering differs between sources; could recover anime, specials and absolute-numbered shows. |
| `languageInference` <sub>enabled, sources</sub> | · | · | · | · | · | · | Infers language from the title or episode title when the filename has none, so language filters drop fewer unlabelled releases. |
| `failover` <sub>enabled, contentTypes, allowCrossType, maxAttempts, parallel, staggerMs, preferredGraceMs, maxWaitMs, …</sub> | · | · | · | · | 25 | ✓ | Off in generated configs; 25 static templates enable it. 2.35 added onlySameReleaseFailover, which makes it safe to turn on: a failed link falls over to the same release on another source. |
| `serviceWrap` <sub>enabled, presets, services, reconfigureService</sub> | · | · | · | · | · | · | Runs P2P-only presets' torrents through the user's debrid service, so sources like Torrentio, Knaben and Zilean can return cached results on a debrid build. Likely the cheapest gain in sources found; measure before shipping. |
| `remuxDb` <sub>enabled</sub> | · | · | · | · | · | · | RemuxDB lookups (on by default upstream since 2.36) fill real audio and subtitle tracks from probes. We rely on the default; decide whether to set it explicitly. |

## Off by design (35)

| Option | Stable | Balanced | Advanced | Labs | Templates | Smart | Why |
|---|---|---|---|---|---|---|---|
| `excludedSubtitles` | · | · | · | · | · | · | Subtitle tags are unreliable in filenames; excluding by them would drop good releases. |
| `includedSubtitles` | · | · | · | · | · | · | Same as excludedSubtitles. |
| `requiredSubtitles` | · | · | · | · | · | · | Same; subtitles are fetched by subtitle addons instead. |
| `requiredVisualTags` | · | · | · | · | · | · | Hard requirement; HDR-only would empty SDR-only titles. |
| `includedAudioTags` | · | · | · | · | · | · | Not needed: audio exclusions are device-driven and have no passthrough case. |
| `requiredAudioTags` | · | · | · | · | · | · | Hard requirement; would empty titles without the tag. |
| `includedAudioChannels` | · | · | · | · | · | · | No passthrough case. |
| `requiredAudioChannels` | · | · | · | · | · | · | Hard requirement. |
| `includedStreamTypes` | · | · | · | · | · | · | Stream types are excluded per build; no passthrough case. |
| `requiredStreamTypes` | · | · | · | · | · | · | Hard requirement; excludedStreamTypes already narrows per build. |
| `includedEncodes` | · | · | · | · | · | · | No passthrough case. |
| `requiredEncodes` | · | · | · | · | · | · | Hard requirement. |
| `includedRegexPatterns` | · | · | · | · | · | · | Passthrough is done with ISEs (library, SeaDex, ID-matched), which compose with SEL. |
| `requiredRegexPatterns` | · | · | · | · | · | · | Hard requirement; would empty results for titles with no matching group. |
| `syncedPreferredRegexUrls` | · | · | · | · | · | · | Preferred patterns are inline (five or seven Vidhin05 strings); a synced URL would need host allowlisting for no gain. |
| `syncedExcludedRegexUrls` | · | · | · | · | · | ✓ | Removed from active templates: a third-party list broke ElfHosted saves with 'Forbidden URL' when its allowlist drifted. Exclusions are inline instead. |
| `syncedIncludedRegexUrls` | · | · | · | · | · | · | No included-regex set exists; ISEs cover passthrough. |
| `syncedRequiredRegexUrls` | · | · | · | · | · | · | Required regex would hard-remove unmatched releases; ranking is preferred so niche titles still return something. |
| `syncedRequiredStreamExpressionUrls` | · | · | · | · | · | · | Required expressions remove everything that does not match; Core Builds ranks with PSEs and excludes with ESEs instead. |
| `excludedReleaseGroups` | · | · | · | · | · | · | Bad groups are excluded through verbatim Vidhin05 regex and ESEs, which public hosts accept and which cover group variants. |
| `includedReleaseGroups` | · | · | · | · | · | · | Elite groups are pinned with pin(releaseGroup(...)) PSEs instead. |
| `requiredReleaseGroups` | · | · | · | · | · | · | Hard requirement; would empty most titles. |
| `preferredReleaseGroups` | · | · | · | · | · | · | Ranking by group is done with ranked regex and PSEs, which score rather than order. |
| `requiredKeywords` | · | · | · | · | · | · | Hard requirement; would empty most titles. |
| `includedKeywords` | · | · | · | · | · | · | Passthrough is done with ISEs. |
| `excludedKeywords` | · | · | · | · | · | · | Keyword exclusion is done in ESEs with keyword(), which can be scoped (anime exempt, library passthrough). |
| `preferredKeywords` | · | · | · | · | · | · | REPACK/PROPER boosts are PSEs with keyword(). |
| `requiredSeederRange` | · | · | · | · | · | · | A hard seeder minimum empties niche titles; ESEs cull only when better options exist. |
| `includeAgeRange` | · | · | · | · | · | · | No age-based passthrough is needed. |
| `requiredAgeRange` | · | · | · | · | · | · | A hard age requirement would remove old but valid NZBs. |
| `excludeSeasonPacks` | · | · | · | · | · | · | Never remove season packs outright: the late pack fallback hides them only when three playable single episodes remain (CLAUDE.md). |
| `excludeCachedMode` | · | · | · | · | · | · | Cached results are never excluded by the generators, so the mode is never needed. |
| `groups` <sub>enabled, groupings, behaviour, onConditionFailure</sub> | · | · | · | · | · | ✓ | Off in every generated config: generators never combine groups with dynamic fetching (two early exits can skip sources), and dynamic wins (output-profile-policy.js#preventStackedFetchExits). Groups must use instanceIds, never display names. |
| `alwaysPrecache` | · | · | · | · | · | · | Deprecated upstream in favour of precacheSelector. |
| `precacheCondition` | · | · | · | · | · | · | Deprecated upstream in favour of precacheSelector. |

## Not a template concern (23)

| Option | Stable | Balanced | Advanced | Labs | Templates | Smart | Why |
|---|---|---|---|---|---|---|---|
| `uuid` | · | · | · | · | · | · | Account, identity or server-set field; a template must never carry it. |
| `parentConfig` <sub>uuid, password, mergeStrategies</sub> | · | · | · | · | · | · | Account, identity or server-set field; a template must never carry it. |
| `activeVariants` | · | · | · | · | · | · | Request-scoped, never persisted (AIOStreams fills it per request). |
| `autoVariants` | · | · | · | · | · | · | Request-scoped, never persisted (AIOStreams fills it per request). |
| `healthResults` | · | · | · | · | · | · | Request-scoped, never persisted (AIOStreams fills it per request). |
| `encryptedPassword` | · | · | · | · | · | · | Account, identity or server-set field; a template must never carry it. |
| `manifestNotice` | · | · | · | · | · | · | Account, identity or server-set field; a template must never carry it. |
| `linkedAccounts` <sub>pushBehaviour</sub> | · | · | · | · | · | · | Account, identity or server-set field; a template must never carry it. |
| `accessKey` | · | · | · | · | · | · | Account, identity or server-set field; a template must never carry it. |
| `ip` | · | · | · | · | · | · | Account, identity or server-set field; a template must never carry it. |
| `addonBackground` | · | · | · | · | · | · | Branding image; the Core Builds logo is enough. |
| `topPosterApiKey` | · | · | · | · | · | · | A personal credential or poster-service setting; never written into a template. |
| `aioratingsApiKey` | · | · | · | · | · | · | A personal credential or poster-service setting; never written into a template. |
| `aioratingsProfileId` | · | · | · | · | · | · | A personal credential or poster-service setting; never written into a template. |
| `openposterdbApiKey` | · | · | · | · | · | · | A personal credential or poster-service setting; never written into a template. |
| `openposterdbUrl` | · | · | · | · | · | · | A personal credential or poster-service setting; never written into a template. |
| `openposterdbParameters` | · | · | · | · | · | · | A personal credential or poster-service setting; never written into a template. |
| `tvdbApiKey` | · | · | · | · | · | · | A personal credential or poster-service setting; never written into a template. |
| `pmdbApiKey` | · | · | · | · | · | · | A personal credential or poster-service setting; never written into a template. |
| `newCatalogsDisabled` | · | · | · | · | · | · | Catalog layout; outside what a stream template should change. |
| `upstreamCatalogOrder` | · | · | · | · | · | · | Catalog layout; outside what a stream template should change. |
| `jellyfin` | · | · | · | · | · | · | AIOStreams' Jellyfin server mode; not a Stremio stream setting. |
| `customPosterUrl` | · | · | · | · | · | · | Poster service setting added in 2.38.0 (custom poster URL); posters are the user's choice, not part of a stream template. |

Profile columns: ✓ every golden of that profile sets it, n/m some do, · none do.

## Presets

| Preset | Where we emit it |
|---|---|
| `anime-tosho-new` | smart, templates |
| `comet` | advanced, balanced, labs, smart, stable, templates |
| `easynews` | templates |
| `easynews-search` | smart, stable, templates |
| `easynewsPlusPlus` | smart, stable, templates |
| `eztv` | advanced, balanced, labs, templates |
| `hdhub` | smart, stable, templates |
| `knaben` | advanced, balanced, labs, templates |
| `library` | advanced, balanced, labs, smart, stable, templates |
| `mediafusion` | advanced, balanced, labs, smart, templates |
| `meteor` | advanced, balanced, labs, smart, stable, templates |
| `neko-bt` | templates |
| `newznab` | templates |
| `opensubtitles-v3-plus` | advanced, balanced, labs, smart, stable, templates |
| `peerflix` | smart, stable |
| `seadex` | advanced, balanced, labs, smart, stable, templates |
| `stremthruStore` | smart, stable, templates |
| `stremthruTorz` | advanced, balanced, labs, smart, stable, templates |
| `tmdb-addon` | advanced, balanced, labs, smart, stable, templates |
| `torrent-galaxy` | advanced, balanced, labs, templates |
| `torrentio` | smart, stable |
| `torrents-db` | templates |
| `zilean` | advanced, balanced, labs, templates |

**Upstream presets we never emit (63):** `ai-companion`, `ai-search`, `aiostreams`, `aiosubtitle`, `anime-catalogs`, `anime-kitsu`, `animetosho`, `argentina-tv`, `astream`, `baguettio`, `bitmagnet`, `brazuca-torrents`, `cinemeta`, `content-deep-dive`, `custom`, `davex`, `dc-universe`, `debridio`, `debridio-ic4a`, `debridio-tmdb`, `debridio-tv`, `debridio-tvdb`, `debridio-watchtower`, `dmm-cast`, `doctor-who-universe`, `easynewsPlus`, `fkstream`, `flix-streams`, `jackett`, `jackettio`, `marvel-universe`, `more-like-this`, `nuvio-streams`, `nzbhydra`, `opensubtitles`, `orion`, `penguplay`, `prowlarr`, `rpdb-catalogs`, `sootio`, `star-wars-universe`, `streamasia`, `streamfusion`, `streaming-catalogs`, `streamnzb`, `stremio-gdrive`, `subdl`, `subhero`, `subsource`, `the-pirate-bay`, `therarbg`, `tmdb-collections`, `torbox`, `torbox-search`, `torrent-catalogs`, `torznab`, `tsukihime`, `usa-tv`, `usa-tv-next`, `usenet-streamer`, `webstreamr`, `xtream`, `yastream`

## SEL functions

**Used** (calls across goldens and templates): `resolution()` 6316 · `quality()` 5745 · `merge()` 5355 · `negate()` 3424 · `type()` 3343 · `library()` 3099 · `uncached()` 3085 · `slice()` 2950 · `seadex()` 2319 · `count()` 2096 · `cached()` 1894 · `bitrate()` 1650 · `values()` 1129 · `visualTag()` 667 · `max()` 421 · `addon()` 418 · `seeders()` 405 · `passthrough()` 330 · `releaseGroup()` 325 · `keyword()` 253 · `iqr()` 233 · `perGroup()` 222 · `encode()` 211 · `q1()` 207 · `median()` 171 · `multiEpisode()` 168 · `seasonPack()` 168 · `audioTag()` 135 · `min()` 120 · `q3()` 112 · `age()` 92 · `q2()` 91 · `percentile()` 90 · `size()` 80 · `language()` 69 · `message()` 60 · `pin()` 54 · `service()` 14 · `streamExpressionScore()` 12 · `subtitles()` 6

**Never used:** `audioChannels()`, `audioTrack()`, `avg()`, `container()`, `editions()`, `extension()`, `folderSize()`, `health()`, `idMatched()`, `indexer()`, `keywords()`, `kurtosis()`, `mean()`, `mediaInfoQuality()`, `mode()`, `network()`, `range()`, `regexMatched()`, `regexMatchedInRange()`, `regexScore()`, `rseMatched()`, `seMatched()`, `seMatchedInRange()`, `seScore()`, `skewness()`, `stddev()`, `subtitle()`, `subtitleTrack()`, `sum()`, `variance()`

