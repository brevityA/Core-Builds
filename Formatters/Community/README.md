# Community formatters

Stream-card layouts made by Core Builds users. Each one imports into AIOStreams the same way as the built-in formatters: **AIOStreams → Formatter → Import** → paste the raw URL of the JSON file.

The first community layouts (RB3 Clean v4, RB3 Formatter and Omni Diamond) stay in [`Formatters/`](../) so their existing import links keep working. New submissions go in this folder.

## Submitting a formatter

1. Export it from AIOStreams (**Formatter → Export**) and save it as `your-name-layout.json`.
2. Remove anything personal: no API keys, manifest URLs, UUIDs or passwords.
3. Use only fields and modifiers AIOStreams documents. Remember that `~` means "contains" for text and an exact item match for lists; it never runs a regex, so `::~(?i)…` never matches.
4. Open a pull request that adds:
   - the JSON file in this folder;
   - a row in the table below with your name, a one-line description and the number of lines it uses for the name and the description;
   - optionally, a preview image in `Assets/Formatters/`.

The maintainers render each submission with the pinned AIOStreams formatter engine before merging, and check it on the sample streams used for the built-in previews.

## Gallery

| Formatter | Author | Name / description lines | What it looks like |
|---|---|---|---|
| *Your layout here* | | | |

Built-in and earlier community layouts are listed in the [Formatter Gallery](https://core-builds.mintlify.app/formatter-gallery).
