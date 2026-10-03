# Template update reliability

This change addresses configurator update and first-time setup regressions reported by supporters. It does not change the native Android TV apps or re-pin AIOStreams.

## What changed

- Update previews compare the finalized export, including output-profile and host compatibility gates, rather than the unprocessed generator output.
- Comparisons include expression bodies, regex scores, enabled flags, ordered preferences, and sort keys/directions in every scope. A version-only change can legitimately produce no configuration changes.
- Existing imported scraper instances retain their IDs, custom endpoints, options, individual timeouts, and local credentials. Multiple instances of the same provider keep distinct credentials unless the shared credential field changes. Disabled duplicates remain disabled.
- Optional scraper selections, Debridio/Debrider selections, catalogs, subtitles, and explicit timeout edits also affect imported instances. NZBHydra's URL and API key are kept separate. Clearing its imported URL or a previously supplied indexer key disables the source; originally keyless endpoints are not disabled merely for lacking a key.
- Subtitle edits update each provider's native language option/casing, including uppercase SubDL imports. Blocked/no-op language removals do not rewrite separately imported provider preferences.
- Declining an update section preserves its original values and original absences through the output-profile reducer. Host, schema, local-expression, and AIOStreams-version safety limits still take precedence.
- Preview/cancel do not commit settings, template metadata, or backups. Confirmed updates can be undone in the current browser session, including local credentials and metadata. After reload, imported source settings and accepted/kept sections are restored from local browser storage.
- Single-template AIOStreams array exports are accepted. Ambiguous collections and duplicate source IDs are rejected with repair guidance.
- Nuvio imports use the real finalized generation pipeline with a clean P2P source selection and no debrid credentials. The selected compatible host is honored. Paste failure downloads that Nuvio template, not the previous wizard configuration.

## Applying an update

**Confirmation updates this browser's configuration only.** Download the resulting JSON and re-import it in AIOStreams, or explicitly use the existing install/update controls for your chosen host. Confirming a migration is not proof that an installed addon changed.

For Nuvio, the paste URL is a **template import link**, not an addon manifest. Import it into the chosen AIOStreams host, set a password and save, then copy the resulting manifest URL into Nuvio. Connect TorBox in **Nuvio → Connected Services**, not by entering a TorBox API key in the AIOStreams template.

## Credentials and backups

- Private imported sources and credentials remain in local browser storage so reload does not silently remove working source settings. Treat this browser profile as sensitive and use the application's clear/start-over controls when appropriate.
- Raw JSON downloads and direct installs can contain credentials. Do not post these exports publicly.
- Shareable settings and selection-only backups exclude private imported presets and migration overrides. They are not full credential-bearing snapshots; the full local Undo is session-only.
- Public import-link copies strip recognized credential options, authenticated/query-key URLs, and private manifest/installation URLs. Sources that depend on removed credentials are disabled, and their group references are pruned.

## Regression coverage

The automated checks cover desktop and mobile-emulated browser flows, source preservation/reload, scoped sorting, same-label expression changes, unchanged-output reporting, preview/cancel, local Undo, malformed imports, manual edits after migration, and execution without `structuredClone`. Mocked first-time Google TV Express and Nuvio flows check generated payloads and import/download behavior. Existing golden configurations remain unchanged.

These are configuration and mocked-install tests, **not live provider authentication, AIOStreams playback, or physical Google TV verification**. The AIOStreams pin remains v2.34.1; the separate upstream catch-up in PR #772 and drift issue #770 are not resolved by this patch. Coordinate integration and release/versioning with that work.
