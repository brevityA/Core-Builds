# 🛠️ Advanced Editing: Deep Configuration

The **Core Builds** are designed to be plug-and-play. However, if you want to adjust caching rules, tweak filtering, or edit the raw template JSON, this guide covers how to do it safely.

---

## Step 1: Access Your AIOStreams Host

Open your preferred AIOStreams instance (ForTheWeak, MidnightIgnite, or ElfHosted) and navigate to your existing configuration. You can reach it via the **Configure** button in Stremio next to the AIOStreams addon, or by visiting your host directly and entering your password.

---

## Step 2: Enable Advanced Mode

1. Look near the top of the configuration page — usually top-right or just below the main header
2. Find the toggle labelled **"Advanced Mode"** or **"Show Advanced Settings"**
3. Toggle it **ON**

Once enabled, the UI expands to show deeper developer settings.

---

## Step 3: What Advanced Mode Unlocks

- **Raw JSON Editor** — directly edit `excludedStreamExpressions`, resolution limits, scraper timeouts, and any other config field
- **Granular Scraper Controls** — fine-tune how each addon (Comet, Meteor, MediaFusion, etc.) behaves within the build
- **Proxy Configuration** — direct access to MediaFlow proxy URLs and credentials
- **Synced URL Management** — view and edit the external regex and expression URLs your template pulls from

---

## ⚠️ Editing Rules — Read Before Touching Anything

### JSON Syntax is Strict
A single missing comma `,` or mismatched bracket `}` will break the entire template and prevent it from loading. Common mistakes:

```json
// ❌ WRONG — trailing comma before closing bracket
"excludedQualities": ["CAM", "SCR",]

// ✅ CORRECT
"excludedQualities": ["CAM", "SCR"]
```

### Quality Values Must Match Exactly
AIOStreams only accepts specific enum strings for quality fields. Use these exact values — case counts:

| Correct ✅ | Wrong ❌ |
|---|---|
| `BluRay REMUX` | `Bluray REMUX` |
| `BluRay` | `Bluray` |
| `WEB-DL` | `WEBDL` |
| `WEBRip` | `Webrip` |
| `HC HD-Rip` | `HC HD-RIP` |

### Stream Expression Functions Must Exist
AIOStreams SEL (Stream Expression Language) only recognises specific built-in functions. Common mistakes that break expressions silently:

| Correct ✅ | Wrong ❌ |
|---|---|
| `type(streams, 'youtube')` | `streamType(streams, 'youtube')` |
| `keyword(streams, 'WEB-DL')` | `filename(streams, 'WEB-DL')` |
| `quality(streams, 'BluRay')` | `quality(streams, 'Bluray')` |

### Sort Keys Must Be Valid
The `sortCriteria` field only accepts recognised sort keys. These are **not** valid and will throw an import error:

- ❌ `season`
- ❌ `episode`

Valid keys include: `quality`, `resolution`, `cached`, `seeders`, `size`, `age`, `bitrate`, `releaseGroup`, `streamExpressionMatched`, `seadex`, and others listed in the AIOStreams schema.

### Formatter Expressions — Use `||` Not `|`
In the formatter's name and description fields, condition separators must be double-pipe `||`. A single pipe `|` will cause the expression to fail and render raw template text.

```
// ❌ WRONG
{stream.quality::exists["BluRay"|"Unknown"]}

// ✅ CORRECT
{stream.quality::exists["BluRay"||"Unknown"]}
```

---

## ✅ Before You Save — Validate Your JSON

If you make any manual edits, **always validate before saving**. Copy your edited JSON and paste it into:

- **[JSONLint](https://jsonlint.com/)** — catches syntax errors instantly
- **[JSON Formatter](https://jsonformatter.curiousconcept.com/)** — formats and validates

---

## 💾 Backup First

Before changing anything in a working build, export or copy your current configuration JSON and save it somewhere safe. If something breaks, you can re-import the backup without losing your setup.

---

## 🔗 Useful References

- [AIOStreams Documentation](https://docs.aiostreams.viren070.me) — full schema reference
- [SEL Function Reference](https://docs.aiostreams.viren070.me/configuration/sel) — all valid stream expression functions
- [JSONLint Validator](https://jsonlint.com/) — validate your JSON before importing

---

*Return to the [Main README](../README.md)*
